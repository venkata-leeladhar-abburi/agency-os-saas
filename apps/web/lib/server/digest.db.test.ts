// The daily digest from a real Postgres (TEST_DATABASE_URL): each recipient's Today, built as
// that member, queued once, and sent as "Today at [workspace]".
import { randomBytes } from 'node:crypto';
import {
  acceptInvitation,
  createWorkspace,
  inviteMember,
  withUser,
  type Session,
} from '@agency-os/db';
import { createTestDb, type TestDb } from '@agency-os/db/testing';
import { runDigests, runEmails, type Outgoing, type Send } from '@agency-os/jobs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createInvoiceFor } from '../data/db/invoices';
import { createClientFor, createLeadFor } from '../data/db/people';
import { digestItems } from './digest';
import type { WorkspaceCtx } from './workspace';

const run = describe.skipIf(!process.env.TEST_DATABASE_URL);
const DAY = 86_400_000;
// 08:40 in India today: inside the digest's half hour.
const digestAt = new Date(`${new Date().toISOString().slice(0, 10)}T03:10:00Z`);
const on = (days: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(
    new Date(digestAt.getTime() + days * DAY),
  );
const env = { appUrl: 'https://app.example', linkSecret: '' };
let t: TestDb;
let ctx: WorkspaceCtx;
const outbox: Outgoing[] = [];
const send: Send = async (e) => {
  outbox.push(e);
  return { status: 'sent', providerId: `em_${outbox.length}` };
};

run('the daily digest on the database', () => {
  beforeAll(async () => {
    const secret = randomBytes(32).toString('hex');
    vi.stubEnv('LINK_SIGNING_SECRET', secret);
    env.linkSecret = secret;
    t = await createTestDb();
    const kiran: Session = {
      userId: await t.createUser('kiran@onestop.in'),
      email: 'kiran@onestop.in',
    };
    const ravi: Session = {
      userId: await t.createUser('ravi@onestop.in'),
      email: 'ravi@onestop.in',
    };
    const ws = await withUser(t.db, kiran, (tx) =>
      createWorkspace(tx, { name: 'One Stop Solutions', slug: 'one-stop' }),
    );
    await t.admin`update workspaces set plan = 'growth', gstin = '37ABCDE1234F1ZZ', state_code = '37' where id = ${ws}`;
    await t.admin`update profiles set full_name = 'Kiran Rao' where id = ${kiran.userId}`;
    await t.admin`update profiles set full_name = 'Ravi Kumar' where id = ${ravi.userId}`;
    const { token } = await withUser(t.db, kiran, (tx) =>
      inviteMember(tx, {
        workspaceId: ws,
        email: 'ravi@onestop.in',
        role: 'project_lead',
        invitedBy: kiran.userId,
      }),
    );
    await withUser(t.db, ravi, (tx) => acceptInvitation(tx, token));
    ctx = {
      db: t.db,
      session: kiran,
      workspaceId: ws,
      slug: 'one-stop',
      role: 'owner',
      plan: 'growth',
    };

    // Ravi's lead to follow up yesterday; Kiran's invoice, three days late.
    const lead = await createLeadFor(ctx, {
      name: 'Example Meera Iyer',
      company: 'Example Kite & Co',
      email: 'meera@kite.example',
      phone: null,
      source: 'referral',
      service: 'Website',
      valueMinor: 18_000_000n,
      followUpOn: on(-1),
      notes: '',
    });
    await t.admin`update leads set owner_id = ${ravi.userId} where id = ${lead}`;
    const client = await createClientFor(ctx, {
      name: 'Example Acme Labs',
      contactName: 'Example Srinivas',
      email: 'srinivas@acme.example',
      phone: null,
      city: null,
      country: 'IN',
      currency: 'INR',
      gstin: null,
      stateCode: '29',
      notes: '',
    });
    await createInvoiceFor(
      ctx,
      {
        clientId: client,
        currency: 'INR',
        dueOn: on(-3),
        exchangeRate: null,
        lines: [
          {
            description: 'Design',
            sac: '998314',
            quantity: 1,
            rateMinor: 10_000_000n,
            taxRateBp: 1800,
          },
        ],
        issue: true,
        reminders: false,
      },
      new Date(digestAt.getTime() - 10 * DAY),
    );
    await t.admin`delete from email_outbox where workspace_id = ${ws}`;
  }, 60_000);

  afterAll(async () => {
    vi.unstubAllEnvs();
    await t?.drop();
  });

  it('queues each person’s own Today once: the owner everything, the lead owner their follow-ups', async () => {
    expect(await runDigests(t.db, { itemsFor: digestItems, now: digestAt })).toEqual({
      queued: 2,
      failed: 0,
    });
    expect(await runDigests(t.db, { itemsFor: digestItems, now: digestAt })).toEqual({
      queued: 0,
      failed: 0,
    });
    // Outside the half hour nothing goes.
    expect(
      await runDigests(t.db, {
        itemsFor: digestItems,
        now: new Date(digestAt.getTime() + 3_600_000),
      }),
    ).toEqual({ queued: 0, failed: 0 });

    await runEmails(t.db, {
      send,
      env,
      now: new Date(Math.max(Date.now(), digestAt.getTime()) + 1000),
    });
    const kiran = outbox.find((e) => e.to === 'kiran@onestop.in')!;
    const ravi = outbox.find((e) => e.to === 'ravi@onestop.in')!;
    expect(kiran.subject).toBe('Today at One Stop Solutions');
    expect(kiran.text).toContain('Follow up Example Kite & Co');
    expect(kiran.text).toMatch(/OSS\/\d\d-\d\d\/001 · ₹1,18,000\.00/);
    expect(kiran.html).toContain('https://app.example/w/one-stop/invoices/');
    // Ravi owns the lead but can't see invoices: his digest is his follow-ups only.
    expect(ravi.text).toContain('Follow up Example Kite & Co');
    expect(ravi.text).not.toContain('OSS/');
    expect(ravi.text).toContain('1 thing for today');
  });
});
