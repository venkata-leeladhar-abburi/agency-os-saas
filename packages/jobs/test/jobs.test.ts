// The email and reminder jobs against a real Postgres (TEST_DATABASE_URL), with a fake provider.
import { randomBytes } from 'node:crypto';
import {
  acceptInvitation,
  createClient,
  createInvoice,
  createProject,
  createWorkspace,
  deliverEvent,
  getClient,
  getProject,
  inviteMember,
  invitePortalContact,
  issueInvoice,
  payLinkToken,
  queueEmails,
  queueInvoiceSent,
  requestGateApproval,
  revokeInvitation,
  withService,
  withUser,
  type Session,
} from '@agency-os/db';
import { createTestDb, type TestDb } from '@agency-os/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resendSender } from '../src/resend';
import { runEmails, runReminders, type Send } from '../src/run';
import type { Outgoing } from '../src/render';

const run = describe.skipIf(!process.env.TEST_DATABASE_URL);
const SECRET = randomBytes(32).toString('hex');
const env = { appUrl: 'https://app.example', linkSecret: SECRET };
let t: TestDb;
let owner: Session;
let ws: string;
let projectId: string;
let invoiceId: string;
let outbox: Outgoing[] = [];
const send: Send = async (e) => {
  outbox.push(e);
  return { status: 'sent', providerId: `em_${outbox.length}` };
};
/**
 * When to send: the queue stamps emails with the database's clock, so sending "as of" a fixed
 * date in the past would find nothing due. Never earlier than now.
 */
const sendAt = (at: Date) => new Date(Math.max(at.getTime(), Date.now()) + 1000);
const status = () =>
  t.admin`select kind, status, attempts, last_error from email_outbox order by created_at, id`;

run('the email jobs', () => {
  beforeAll(async () => {
    t = await createTestDb();
    owner = { userId: await t.createUser('kiran@onestop.in'), email: 'kiran@onestop.in' };
    ws = await withUser(t.db, owner, (tx) =>
      createWorkspace(tx, { name: 'One Stop Solutions', slug: 'one-stop' }),
    );
    await t.admin`update workspaces set plan = 'growth', gstin = '36AAACO1234A1Z5',
      state_code = '36' where id = ${ws}`;
    await t.admin`update profiles set full_name = 'Kiran Rao' where id = ${owner.userId}`;
    const clientId = await withUser(t.db, owner, (tx) =>
      createClient(
        tx,
        ws,
        {
          name: 'Example Acme Labs',
          stateCode: '29',
          contact: { name: 'Example Srinivas Beere', email: 'srinivas@acme.example' },
        },
        owner.userId,
      ),
    );
    const contactId = (await withUser(t.db, owner, (tx) => getClient(tx, clientId)))!.contacts[0]!
      .id;
    await withUser(t.db, owner, (tx) => invitePortalContact(tx, contactId, owner.userId));
    projectId = await withUser(t.db, owner, (tx) =>
      createProject(
        tx,
        ws,
        { clientId, name: 'Example Website', leadMemberId: owner.userId },
        owner.userId,
      ),
    );
    const now = new Date('2026-10-26T09:30:00Z');
    invoiceId = await withUser(t.db, owner, (tx) =>
      createInvoice(
        tx,
        ws,
        {
          clientId,
          dueOn: '2026-11-02',
          items: [
            {
              description: 'Website design',
              sacCode: '998314',
              quantity: 1,
              rateMinor: 4_000_000n,
              taxRateBp: 1800,
            },
          ],
        },
        owner.userId,
        now,
      ),
    );
    await withUser(t.db, owner, (tx) =>
      issueInvoice(tx, invoiceId, owner.userId, { secret: SECRET, now }),
    );
  }, 60_000);

  afterAll(async () => {
    await t?.drop();
  });

  it('sends the client a sign-off request that links to their portal, replies to the agency', async () => {
    const gateId = (await withUser(t.db, owner, (tx) => getProject(tx, projectId)))!.phases[0]!
      .gate!.id;
    const event = await withUser(t.db, owner, (tx) => requestGateApproval(tx, gateId, 'Ready.'));
    await withService(t.db, ws, (tx) => deliverEvent(tx, event));
    expect(await runEmails(t.db, { send, env })).toMatchObject({ sent: 1 });
    const [email] = outbox;
    expect(email).toMatchObject({
      to: 'srinivas@acme.example',
      subject: 'Approve Proposal accepted',
      replyTo: 'kiran@onestop.in',
    });
    expect(email!.text).toContain('Kiran Rao asked you to approve “Proposal accepted”');
    expect(email!.html).toContain(`https://app.example/p/one-stop/projects/${projectId}`);
  });

  it('sends the invoice with its pay link, and waits for the secret when it is missing', async () => {
    outbox = [];
    await withService(t.db, ws, (tx) => queueInvoiceSent(tx, invoiceId));
    expect(await runEmails(t.db, { send, env: { ...env, linkSecret: null } })).toMatchObject({
      retrying: 1,
    });
    expect((await status()).at(-1)).toMatchObject({
      kind: 'invoice.sent',
      status: 'queued',
      last_error: 'LINK_SIGNING_SECRET is not set',
    });
    expect(outbox).toEqual([]);
    await runEmails(t.db, { send, env, now: new Date(Date.now() + 2 * 60_000) });
    const [email] = outbox;
    expect(email!.subject).toMatch(/^Invoice OSS\/\d\d-\d\d\/001 from One Stop Solutions$/);
    expect(email!.text).toContain('Hi Example,');
    expect(email!.html).toContain(
      `https://app.example/pay/${payLinkToken(SECRET, { id: invoiceId, linkVersion: 1 })}`,
    );
  });

  it('invites a contact to the portal with a sign-in link', async () => {
    outbox = [];
    await withService(t.db, ws, (tx) =>
      queueEmails(tx, ws, [
        {
          kind: 'portal.invited',
          toEmail: 'srinivas@acme.example',
          audience: 'client',
          payload: { contactName: 'Srinivas Beere' },
          dedupeKey: 'portal.invited:test',
        },
      ]),
    );
    await runEmails(t.db, { send, env });
    expect(outbox[0]).toMatchObject({
      subject: 'One Stop Solutions invited you to see your projects',
    });
    expect(outbox[0]!.html).toContain('https://app.example/sign-in?next=%2Fp%2Fone-stop');
  });

  it('emails a new member a working invite link, and nothing once it’s cancelled', async () => {
    outbox = [];
    const invite = (email: string) =>
      withUser(t.db, owner, (tx) =>
        inviteMember(
          tx,
          { workspaceId: ws, email, role: 'project_lead', invitedBy: owner.userId },
          { secret: SECRET },
        ),
      );
    const queue = (id: string, email: string) =>
      withService(t.db, ws, (tx) =>
        queueEmails(tx, ws, [
          {
            kind: 'member.invited',
            toEmail: email,
            audience: 'member',
            payload: { invitationId: id },
            dedupeKey: `member.invited:${id}`,
          },
        ]),
      );
    const ravi = await invite('ravi@onestop.in');
    const meera = await invite('meera@onestop.in');
    await queue(ravi.id, 'ravi@onestop.in');
    await queue(meera.id, 'meera@onestop.in');
    await withUser(t.db, owner, (tx) => revokeInvitation(tx, meera.id));
    expect(await runEmails(t.db, { send, env })).toMatchObject({ sent: 1, skipped: 1 });
    const [email] = outbox;
    expect(email).toMatchObject({
      to: 'ravi@onestop.in',
      subject: 'Kiran Rao invited you to One Stop Solutions on Agency OS',
    });
    expect(email!.text).toContain('as Project lead');
    const link = /https:\/\/app\.example\/invite\/([A-Za-z0-9_-]+)/.exec(email!.html)!;
    expect(link[1]).toBe(ravi.token);
    const joiner: Session = {
      userId: await t.createUser('ravi@onestop.in'),
      email: 'ravi@onestop.in',
    };
    expect(await withUser(t.db, joiner, (tx) => acceptInvitation(tx, link[1]!))).toBe(ws);
  });

  it('queues the morning’s reminders and sends each once', async () => {
    outbox = [];
    const day = new Date('2026-10-30T03:00:00Z');
    expect(await runReminders(t.db, day)).toEqual({ queued: 1, overdue: 0 });
    expect(await runReminders(t.db, day)).toEqual({ queued: 0, overdue: 0 });
    await runEmails(t.db, { send, env, now: sendAt(day) });
    expect(outbox.map((e) => e.subject)).toEqual([
      expect.stringMatching(/^Invoice OSS\/\d\d-\d\d\/001 is due on 2 Nov 2026$/),
    ]);
  });
  it('tells the owner once when an invoice goes overdue, in the app and by email', async () => {
    outbox = [];
    const late = new Date('2026-11-03T03:00:00Z'); // due 2 Nov
    expect((await runReminders(t.db, late)).overdue).toBe(1);
    expect((await runReminders(t.db, late)).overdue).toBe(0);
    const [n] =
      await t.admin`select kind, payload->>'client' as client from notifications where kind = 'invoice.overdue'`;
    expect(n).toMatchObject({ client: 'Example Acme Labs' });
    await runEmails(t.db, { send, env, now: sendAt(late) });
    const overdue = outbox.find((e) => e.to === 'kiran@onestop.in')!;
    expect(overdue.subject).toMatch(/^Invoice OSS\/\d\d-\d\d\/001 is overdue$/);
    expect(overdue.text).toContain('₹47,200.00 from Example Acme Labs was due on 2 Nov 2026');
    expect(overdue.html).toContain(`https://app.example/w/one-stop/invoices/${invoiceId}`);
  });
});

describe('Resend', () => {
  it('is off without its key and sender, so nothing is sent or marked sent', () => {
    expect(resendSender({})).toBeNull();
    expect(resendSender({ RESEND_API_KEY: 'x' })).toBeNull();
  });

  it('reports what Resend answered', async () => {
    const calls: RequestInit[] = [];
    const ok = resendSender(
      { RESEND_API_KEY: 'x', EMAIL_FROM: 'Agency OS <hi@example.com>' },
      async (_url, init) => {
        calls.push(init!);
        return new Response(JSON.stringify({ id: 'em_9' }), { status: 200 });
      },
    )!;
    const email = { to: 'a@b.in', subject: 'S', html: '<p>H</p>', text: 'H', replyTo: 'r@b.in' };
    expect(await ok(email)).toEqual({ status: 'sent', providerId: 'em_9' });
    expect(JSON.parse(String(calls[0]!.body))).toMatchObject({
      from: 'Agency OS <hi@example.com>',
      to: ['a@b.in'],
      reply_to: 'r@b.in',
    });
    const down = resendSender(
      { RESEND_API_KEY: 'x', EMAIL_FROM: 'y' },
      async () => new Response('', { status: 503 }),
    )!;
    expect(await down(email)).toEqual({ status: 'failed', error: 'Resend answered 503' });
  });
});
