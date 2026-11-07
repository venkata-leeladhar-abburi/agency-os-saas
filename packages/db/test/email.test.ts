import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { acceptInvitation, createWorkspace, inviteMember } from '../src/accounts';
import { withService, withUser, type Session } from '../src/client';
import { createClient, getClient, invitePortalContact } from '../src/clients';
import {
  activeWorkspaceIds,
  MAX_EMAIL_ATTEMPTS,
  queueEmails,
  sendDueEmails,
  workspacesWithEmailDue,
  type EmailOutcome,
} from '../src/email';
import {
  createInvoice,
  invoiceEmailFacts,
  issueInvoice,
  queueInvoiceSent,
  queueRemindersDue,
  remindersDue,
} from '../src/invoices';
import { setNotificationPreference } from '../src/platform';
import { messagePostedEvent } from '../src/portal';
import {
  createProject,
  deliverEvent,
  gateDecidedEvent,
  getProject,
  requestGateApproval,
} from '../src/projects';
import { emailOutbox } from '../src/schema';
import { createTestDb, type TestDb } from './db';

let t: TestDb;
let owner: Session;
let lead: Session;
let ws: string;
let clientId: string;
let projectId: string;

const SECRET = randomBytes(32).toString('hex');
const as = <T>(s: Session, fn: Parameters<typeof withUser<T>>[2]) => withUser(t.db, s, fn);
const outbox = () =>
  t.admin`select kind, to_email, to_user_id, status, attempts, dedupe_key, payload, last_error
    from email_outbox where workspace_id = ${ws} order by created_at, id`;
const reset = () => t.admin`delete from email_outbox where workspace_id = ${ws}`;
const sent: EmailOutcome = { status: 'sent', providerId: 'em_1' };

/**
 * When to send: the queue stamps emails with the database's clock, so sending "as of" a fixed
 * date in the past would find nothing due. Never earlier than now.
 */
const sendAt = (at: Date) => new Date(Math.max(at.getTime(), Date.now()) + 1000);

beforeAll(async () => {
  t = await createTestDb();
  owner = { userId: await t.createUser('kiran@onestop.in'), email: 'kiran@onestop.in' };
  lead = { userId: await t.createUser('ravi@onestop.in'), email: 'ravi@onestop.in' };
  ws = await as(owner, (tx) => createWorkspace(tx, { name: 'One Stop Solutions' }));
  await t.admin`update workspaces set plan = 'growth', gstin = '36AAACO1234A1Z5', state_code = '36'
    where id = ${ws}`;
  const { token } = await as(owner, (tx) =>
    inviteMember(tx, {
      workspaceId: ws,
      email: lead.email!,
      role: 'project_lead',
      invitedBy: owner.userId,
    }),
  );
  await as(lead, (tx) => acceptInvitation(tx, token));
  clientId = await as(owner, (tx) =>
    createClient(
      tx,
      ws,
      {
        name: 'Example Acme Labs',
        stateCode: '29',
        contact: { name: 'Example Srinivas', email: 'Srinivas@Acme.example' },
      },
      owner.userId,
    ),
  );
  const contactId = (await as(owner, (tx) => getClient(tx, clientId)))!.contacts[0]!.id;
  await as(owner, (tx) => invitePortalContact(tx, contactId, owner.userId));
  projectId = await as(owner, (tx) =>
    createProject(
      tx,
      ws,
      { clientId, name: 'Example Website', leadMemberId: lead.userId },
      owner.userId,
    ),
  );
}, 60_000);

afterAll(async () => {
  await t?.drop();
});

describe('queueing emails from events', () => {
  it('emails the client a sign-off request once, however often it is delivered', async () => {
    const gateId = (await as(owner, (tx) => getProject(tx, projectId)))!.phases[0]!.gate!.id;
    const event = await as(lead, (tx) => requestGateApproval(tx, gateId, 'Please review.'));
    await withService(t.db, ws, (tx) => deliverEvent(tx, event));
    await withService(t.db, ws, (tx) => deliverEvent(tx, event));
    const rows = await outbox();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      kind: 'gate.requested',
      to_email: 'srinivas@acme.example',
      to_user_id: null,
      status: 'queued',
      payload: {
        audience: 'client',
        gate: 'Proposal accepted',
        project: 'Example Website',
        message: 'Please review.',
        workspace: { name: 'One Stop Solutions' },
      },
    });
  });

  it('emails members by their settings: the lead hears of a decision unless they turned it off', async () => {
    await reset();
    const gateId = (await as(owner, (tx) => getProject(tx, projectId)))!.phases[0]!.gate!.id;
    const event = await withService(t.db, ws, (tx) => gateDecidedEvent(tx, gateId));
    await withService(t.db, ws, (tx) => deliverEvent(tx, event));
    expect((await outbox()).map((r) => [r.kind, r.to_email, r.payload.audience])).toEqual([
      ['gate.decided', 'ravi@onestop.in', 'member'],
    ]);
    await reset();
    await as(lead, (tx) =>
      setNotificationPreference(tx, {
        workspaceId: ws,
        userId: lead.userId,
        kind: 'gate.decided',
        pref: { email: 'off' },
      }),
    );
    await withService(t.db, ws, (tx) => deliverEvent(tx, { ...event, key: 'again' }));
    expect(await outbox()).toEqual([]);
  });

  it('sends the team’s messages to the client’s portal contacts, and the client’s to the team', async () => {
    await reset();
    const team = await withService(t.db, ws, (tx) =>
      messagePostedEvent(tx, projectId, 'Ravi', 'm1', 'team'),
    );
    const client = await withService(t.db, ws, (tx) =>
      messagePostedEvent(tx, projectId, 'Example Srinivas', 'm2'),
    );
    await withService(t.db, ws, async (tx) => {
      await deliverEvent(tx, team);
      await deliverEvent(tx, client);
    });
    expect((await outbox()).map((r) => [r.to_email, r.payload.audience, r.payload.name])).toEqual([
      ['srinivas@acme.example', 'client', 'Ravi'],
      ['ravi@onestop.in', 'member', 'Example Srinivas'],
    ]);
  });

  it('is closed to members and clients alike', async () => {
    await expect(as(owner, (tx) => tx.select().from(emailOutbox))).rejects.toMatchObject({
      cause: expect.objectContaining({ message: expect.stringMatching(/permission denied/) }),
    });
    await expect(
      as(owner, (tx) =>
        queueEmails(tx, ws, [
          {
            kind: 'x',
            toEmail: 'a@b.in',
            audience: 'member',
            payload: {},
            dedupeKey: 'x',
          },
        ]),
      ),
    ).rejects.toMatchObject({
      cause: expect.objectContaining({ message: expect.stringMatching(/permission denied/) }),
    });
  });
});

describe('sending', () => {
  it('marks an email sent only once the provider accepts it, and retries failures', async () => {
    await reset();
    const queue = (key: string) =>
      withService(t.db, ws, (tx) =>
        queueEmails(tx, ws, [
          {
            kind: 'gate.requested',
            toEmail: 'srinivas@acme.example',
            audience: 'client',
            payload: {},
            dedupeKey: key,
          },
        ]),
      );
    await queue('ok');
    await queue('bad');
    const now = new Date();
    expect(await workspacesWithEmailDue(t.db, now)).toEqual([ws]);
    expect(await activeWorkspaceIds(t.db)).toEqual([ws]);
    const result = await sendDueEmails(
      t.db,
      ws,
      async (e) => (e.dedupeKey === 'ok' ? sent : { status: 'failed', error: 'Resend: 500' }),
      { now },
    );
    expect(result).toEqual({ sent: 1, skipped: 0, failed: 0, retrying: 1 });
    expect((await outbox()).map((r) => [r.dedupe_key, r.status, r.attempts])).toEqual([
      ['ok', 'sent', 1],
      ['bad', 'queued', 1],
    ]);
    // Not due again until a minute later.
    expect(await workspacesWithEmailDue(t.db, now)).toEqual([]);
    let at = now;
    for (let i = 1; i < MAX_EMAIL_ATTEMPTS; i++) {
      at = new Date(at.getTime() + 30 * 60_000);
      await sendDueEmails(t.db, ws, async () => ({ status: 'failed', error: 'Resend: 500' }), {
        now: at,
      });
    }
    expect((await outbox())[1]).toMatchObject({
      status: 'failed',
      attempts: MAX_EMAIL_ATTEMPTS,
      last_error: 'Resend: 500',
    });
  });

  it('never sends the same email twice when two runs overlap', async () => {
    await reset();
    await withService(t.db, ws, (tx) =>
      queueEmails(tx, ws, [
        {
          kind: 'gate.requested',
          toEmail: 'srinivas@acme.example',
          audience: 'client',
          payload: {},
          dedupeKey: 'once',
        },
      ]),
    );
    let calls = 0;
    const slow = async () => {
      calls++;
      await new Promise((r) => setTimeout(r, 200));
      return sent;
    };
    await Promise.all([sendDueEmails(t.db, ws, slow), sendDueEmails(t.db, ws, slow)]);
    expect(calls).toBe(1);
  });
});

describe('invoice emails', () => {
  it('sends the invoice once issued, and each reminder once, recording it as sent', async () => {
    await reset();
    const now = new Date('2026-10-26T09:30:00Z');
    const id = await as(owner, (tx) =>
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
    expect(await withService(t.db, ws, (tx) => queueInvoiceSent(tx, id))).toBe(0); // a draft
    await as(owner, (tx) => issueInvoice(tx, id, owner.userId, { secret: SECRET, now }));
    await withService(t.db, ws, (tx) => queueInvoiceSent(tx, id));
    await withService(t.db, ws, (tx) => queueInvoiceSent(tx, id));
    const facts = await withService(t.db, ws, (tx) => invoiceEmailFacts(tx, id));
    expect(facts).toMatchObject({
      number: expect.stringMatching(/^OSS\//),
      dueMinor: 4_720_000n,
      contactName: 'Example Srinivas',
      agency: { name: 'One Stop Solutions' },
    });

    const day = new Date('2026-10-30T03:00:00Z');
    expect(await queueRemindersDue(t.db, ws, day)).toBe(1);
    expect(await queueRemindersDue(t.db, ws, day)).toBe(0);
    expect((await outbox()).map((r) => r.kind)).toEqual(['invoice.sent', 'invoice.reminder']);
    await sendDueEmails(t.db, ws, async () => sent, { now: sendAt(day) });
    expect((await remindersDue(t.db, ws, day)).find((r) => r.invoiceId === id)).toBeUndefined();
    const [row] = await t.admin`select provider_message_id from reminders where invoice_id = ${id}`;
    expect(row).toMatchObject({ provider_message_id: 'em_1' });
  });

  it('records an email with nothing left to say as skipped, not sent', async () => {
    await reset();
    await withService(t.db, ws, (tx) =>
      queueEmails(tx, ws, [
        {
          kind: 'invoice.reminder',
          toEmail: 'srinivas@acme.example',
          audience: 'client',
          payload: { invoiceId: '00000000-0000-7000-8000-000000000000' },
          dedupeKey: 'gone',
        },
      ]),
    );
    await sendDueEmails(t.db, ws, async () => ({ status: 'skipped', reason: 'Invoice paid' }));
    const [row] = await t.admin`select status, sent_at from email_outbox where dedupe_key = 'gone'`;
    expect(row).toMatchObject({ status: 'skipped', sent_at: null });
  });
});
