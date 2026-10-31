import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { acceptInvitation, createWorkspace, inviteMember } from '../src/accounts';
import { withUser, type Session } from '../src/client';
import { addContact, claimPortalAccess, createClient, invitePortalContact } from '../src/clients';
import {
  cancelInvoice,
  createInvoice,
  getInvoice,
  invoiceByLink,
  issueInvoice,
  listInvoices,
  markReminderSent,
  portalInvoices,
  recordOnlinePayment,
  recordPayment,
  remindersDue,
  replacePayLink,
  setInvoiceReminders,
  updateInvoice,
} from '../src/invoices';
import { listNotifications } from '../src/platform';
import { createProject } from '../src/projects';
import { invoiceItems, invoices, payments } from '../src/schema';
import { createTestDb, type TestDb } from './db';

let t: TestDb;
let owner: Session;
let finance: Session;
let lead: Session;
let member: Session;
let outsider: Session;
let portalUser: Session;
let ws: string;
let local: string; // a client in Telangana, like the workspace
let karnataka: string;
let abroad: string;

// Made per run, never written in the code (it keys the pay links' HMAC).
const SECRET = randomBytes(32).toString('hex');
const as = <T>(s: Session, fn: Parameters<typeof withUser<T>>[2]) => withUser(t.db, s, fn);
const now = new Date('2026-10-26T09:30:00Z');
const day = (n: number) => new Date(now.getTime() + n * 86_400_000);
const items = [
  {
    description: 'Website design',
    sacCode: '998314',
    quantity: 1,
    rateMinor: 4_000_000n,
    taxRateBp: 1800,
  },
];

async function join(email: string, role: 'finance' | 'project_lead' | 'member') {
  const s = { userId: await t.createUser(email), email };
  const { token } = await as(owner, (tx) =>
    inviteMember(tx, { workspaceId: ws, email, role, invitedBy: owner.userId }),
  );
  await as(s, (tx) => acceptInvitation(tx, token));
  return s;
}

const draft = (s: Session, clientId: string, extra: Record<string, unknown> = {}) =>
  as(s, (tx) =>
    createInvoice(tx, ws, { clientId, dueOn: '2026-11-02', items, ...extra }, s.userId, now),
  );
const issue = (s: Session, id: string, at = now) =>
  as(s, (tx) => issueInvoice(tx, id, s.userId, { secret: SECRET, now: at }));

beforeAll(async () => {
  t = await createTestDb();
  owner = { userId: await t.createUser('kiran@onestop.in'), email: 'kiran@onestop.in' };
  outsider = {
    userId: await t.createUser('sarah@northwind.example'),
    email: 'sarah@northwind.example',
  };
  portalUser = {
    userId: await t.createUser('srinivas@acme.example'),
    email: 'srinivas@acme.example',
  };
  ws = await as(owner, (tx) => createWorkspace(tx, { name: 'One Stop Solutions' }));
  await as(outsider, (tx) => createWorkspace(tx, { name: 'Northwind Studio' }));
  await t.admin`update workspaces set plan = 'growth', gstin = '36AAACO1234A1Z5', state_code = '36',
    invoice_prefix = 'OSS', lut_arn = 'AD3609260012345', lut_valid_from = '2026-04-01',
    lut_valid_to = '2027-03-31' where id = ${ws}`;
  finance = await join('meera@onestop.in', 'finance');
  lead = await join('ananya@onestop.in', 'project_lead');
  member = await join('arjun@onestop.in', 'member');
  local = await as(owner, (tx) =>
    createClient(
      tx,
      ws,
      {
        name: 'Example Hyderabad Foods',
        stateCode: '36',
        contact: { name: 'Example Ravi', email: 'ravi@hyd.example' },
      },
      owner.userId,
    ),
  );
  karnataka = await as(owner, (tx) =>
    createClient(
      tx,
      ws,
      {
        name: 'Example Acme Labs',
        gstin: '29ABCDE1234F1ZW',
        contact: { name: 'Example Srinivas', email: 'srinivas@acme.example' },
      },
      owner.userId,
    ),
  );
  abroad = await as(owner, (tx) =>
    createClient(tx, ws, { name: 'Example Northwind', country: 'US' }, owner.userId),
  );
}, 60_000);

afterAll(async () => {
  await t?.drop();
});

describe('drafts', () => {
  it('works out GST from the client’s state, as packages/core does', async () => {
    const id = await draft(owner, local);
    const [same] =
      await t.admin`select type, cgst_minor, sgst_minor, igst_minor, total_minor, number from invoices where id = ${id}`;
    expect(same).toMatchObject({
      type: 'tax_invoice',
      cgst_minor: '360000',
      sgst_minor: '360000',
      igst_minor: '0',
      total_minor: '4720000',
      number: null,
    });
    const inter = await draft(owner, karnataka);
    const [other] =
      await t.admin`select igst_minor, place_of_supply_code from invoices where id = ${inter}`;
    expect(other).toMatchObject({ igst_minor: '720000', place_of_supply_code: '29' });
  });

  it('bills a client abroad as an export under the LUT, with the rate', async () => {
    await expect(draft(owner, abroad)).rejects.toMatchObject({ code: 'exchange_rate_required' });
    const id = await draft(owner, abroad, { exchangeRate: '84.20' });
    const [row] =
      await t.admin`select type, currency, igst_minor, has_lut, lut_arn, exchange_rate from invoices where id = ${id}`;
    expect(row).toMatchObject({
      type: 'export_invoice',
      currency: 'USD',
      igst_minor: '0',
      has_lut: true,
      lut_arn: 'AD3609260012345',
      exchange_rate: '84.20000000',
    });
  });

  it('lets a draft change, and recalculates', async () => {
    const id = await draft(owner, local);
    await as(owner, (tx) => updateInvoice(tx, id, { items: [{ ...items[0]!, quantity: 2 }] }));
    const [row] = await t.admin`select total_minor from invoices where id = ${id}`;
    expect(row!.total_minor).toBe('9440000');
  });
});

describe('issuing', () => {
  it('numbers invoices consecutively per financial year, from 001 each April', async () => {
    const a = await issue(owner, await draft(owner, local));
    const b = await issue(finance, await draft(finance, local));
    expect([a.number, b.number]).toEqual(['OSS/26-27/001', 'OSS/26-27/002']);
    const april = await issue(owner, await draft(owner, local), new Date('2027-04-02T06:00:00Z'));
    expect(april.number).toBe('OSS/27-28/001');
  });

  it('locks an issued invoice: no edits, no deletes, only status, reminders and the link move', async () => {
    const id = await draft(owner, local);
    await issue(owner, id);
    await expect(as(owner, (tx) => updateInvoice(tx, id, { items }))).rejects.toMatchObject({
      code: 'invoice_locked',
    });
    // Even straight SQL as the owner can't change the money or the items.
    await expect(
      as(owner, (tx) => tx.update(invoices).set({ totalMinor: 1n }).where(eq(invoices.id, id))),
    ).rejects.toThrow();
    await expect(
      as(owner, (tx) => tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id))),
    ).rejects.toThrow();
    await expect(
      as(owner, (tx) => tx.delete(invoices).where(eq(invoices.id, id))),
    ).rejects.toThrow();
    await as(owner, (tx) => setInvoiceReminders(tx, id, false));
    expect((await as(owner, (tx) => getInvoice(tx, id, { now })))!.invoice.remindersEnabled).toBe(
      false,
    );
  });

  it('cancels an issued invoice, keeping its number used; deletes a draft', async () => {
    const id = await draft(owner, local);
    const { token } = await issue(owner, id);
    expect(await as(owner, (tx) => cancelInvoice(tx, id, owner.userId))).toBe('cancelled');
    await expect(invoiceByLink(t.db, token)).rejects.toMatchObject({
      code: 'invoice_link_invalid',
    });
    const d = await draft(owner, local);
    expect(await as(owner, (tx) => cancelInvoice(tx, d, owner.userId))).toBe('deleted');
  });

  it('stops at the Free plan’s 3 invoices a month', async () => {
    await t.admin`update workspaces set plan = 'free' where id = ${ws}`;
    try {
      const nov = new Date('2026-11-10T06:00:00Z');
      for (let n = 0; n < 3; n++) await issue(owner, await draft(owner, local), nov);
      await expect(issue(owner, await draft(owner, local), nov)).rejects.toMatchObject({
        code: 'plan_limit',
      });
    } finally {
      await t.admin`update workspaces set plan = 'growth' where id = ${ws}`;
    }
  });
});

describe('payments', () => {
  it('moves to partly paid, then paid, and refuses more than is due (tax-test-cases.md H)', async () => {
    const id = await draft(owner, local);
    await expect(
      as(owner, (tx) =>
        recordPayment(
          tx,
          id,
          { amountMinor: 100n, receivedOn: '2026-10-26', method: 'upi' },
          owner.userId,
        ),
      ),
    ).rejects.toMatchObject({ code: 'invoice_not_payable' });
    await issue(owner, id);
    await as(finance, (tx) =>
      recordPayment(
        tx,
        id,
        { amountMinor: 2_000_000n, receivedOn: '2026-10-27', method: 'bank_transfer' },
        finance.userId,
      ),
    );
    let got = (await as(owner, (tx) => getInvoice(tx, id, { now })))!;
    expect(got.invoice).toMatchObject({ status: 'partially_paid', dueMinor: 2_720_000n });
    await expect(
      as(owner, (tx) =>
        recordPayment(
          tx,
          id,
          { amountMinor: 2_720_001n, receivedOn: '2026-10-28', method: 'upi' },
          owner.userId,
        ),
      ),
    ).rejects.toMatchObject({ code: 'overpayment' });
    await as(owner, (tx) =>
      recordPayment(
        tx,
        id,
        { amountMinor: 2_720_000n, receivedOn: '2026-10-28', method: 'upi' },
        owner.userId,
      ),
    );
    got = (await as(owner, (tx) => getInvoice(tx, id, { now })))!;
    expect(got.invoice).toMatchObject({ status: 'paid', dueMinor: 0n });
    expect(got.payments).toHaveLength(2);
    // A payment is a record: it can't be edited or deleted.
    await expect(
      as(owner, (tx) =>
        tx.update(payments).set({ amountMinor: 1n }).where(eq(payments.invoiceId, id)),
      ),
    ).rejects.toThrow();
  });

  it('records an online payment once, however often the webhook repeats', async () => {
    const id = await draft(owner, local);
    await issue(owner, id);
    const input = {
      invoiceId: id,
      amountMinor: 4_720_000n,
      method: 'upi' as const,
      provider: 'razorpay',
      providerPaymentId: 'pay_TEST123',
      receivedOn: '2026-10-26',
    };
    expect(await recordOnlinePayment(t.db, ws, input)).toEqual({ duplicate: false });
    expect(await recordOnlinePayment(t.db, ws, input)).toEqual({ duplicate: true });
    expect((await as(owner, (tx) => getInvoice(tx, id, { now })))!.invoice.status).toBe('paid');
    const notes = await as(finance, (tx) => listNotifications(tx, ws));
    expect(notes.some((n) => n.kind === 'payment.received')).toBe(true);
    // And by email to owners and finance, once, however often the webhook comes.
    const emails =
      await t.admin`select to_email from email_outbox where kind = 'payment.received' order by to_email`;
    expect(emails.map((e) => e.to_email)).toEqual(['kiran@onestop.in', 'meera@onestop.in']);
  });
});

describe('who sees invoices', () => {
  it('keeps them inside the workspace and the roles that read money', async () => {
    const id = await draft(owner, local);
    await issue(owner, id);
    expect(await as(outsider, (tx) => tx.select().from(invoices))).toEqual([]);
    expect(await as(outsider, (tx) => getInvoice(tx, id))).toBeNull();
    await expect(
      as(outsider, (tx) =>
        createInvoice(
          tx,
          ws,
          { clientId: local, dueOn: '2026-11-02', items },
          outsider.userId,
          now,
        ),
      ),
    ).rejects.toThrow();
    // Members don't read invoices; finance does.
    expect(await as(member, (tx) => tx.select().from(invoices))).toEqual([]);
    expect((await as(finance, (tx) => listInvoices(tx, ws, now))).length).toBeGreaterThan(0);
    // Members can't record payments either.
    await expect(
      as(member, (tx) =>
        recordPayment(
          tx,
          id,
          { amountMinor: 100n, receivedOn: '2026-10-26', method: 'cash' },
          member.userId,
        ),
      ),
    ).rejects.toThrow();
  });

  it('shows project leads only the invoices on their projects', async () => {
    const project = await as(owner, (tx) =>
      createProject(
        tx,
        ws,
        { clientId: local, name: 'Example Menu app', leadMemberId: lead.userId },
        owner.userId,
      ),
    );
    const onProject = await draft(owner, local, { projectId: project });
    const elsewhere = await draft(owner, local);
    const seen = (await as(lead, (tx) => tx.select({ id: invoices.id }).from(invoices))).map(
      (r) => r.id,
    );
    expect(seen).toContain(onProject);
    expect(seen).not.toContain(elsewhere);
  });

  it('marks unpaid invoices past their due date as overdue', async () => {
    const id = await draft(owner, local);
    await issue(owner, id);
    const list = await as(owner, (tx) => listInvoices(tx, ws, day(10)));
    expect(list.find((r) => r.id === id)!.status).toBe('overdue');
  });
});

describe('the pay link', () => {
  it('opens the issued invoice, and a new link replaces the old one', async () => {
    const id = await draft(owner, karnataka);
    const { token } = await issue(owner, id);
    const page = await invoiceByLink(t.db, token, now);
    expect(page.invoice.number).toMatch(/^OSS\/26-27\//);
    expect(page.client.name).toBe('Example Acme Labs');
    expect(Object.keys(page.workspace)).not.toContain('createdBy');
    expect((await as(owner, (tx) => getInvoice(tx, id, { secret: SECRET })))!.payToken).toBe(token);
    const fresh = await as(owner, (tx) => replacePayLink(tx, id, owner.userId, SECRET));
    await expect(invoiceByLink(t.db, token)).rejects.toMatchObject({
      code: 'invoice_link_invalid',
    });
    expect((await invoiceByLink(t.db, fresh)).invoice.id).toBe(id);
    await expect(invoiceByLink(t.db, 'not-a-token')).rejects.toMatchObject({
      code: 'invoice_link_invalid',
    });
  });
});

describe('reminders', () => {
  it('finds one reminder a day per invoice, to the primary contact, and records it once', async () => {
    const id = await draft(owner, karnataka);
    await issue(owner, id);
    // Due 2 Nov: "3 days before" is 30 Oct.
    const before = await remindersDue(t.db, ws, new Date('2026-10-30T03:00:00Z'));
    const mine = before.find((r) => r.invoiceId === id)!;
    expect(mine).toMatchObject({
      email: 'srinivas@acme.example',
      reminder: { kind: 'before_due', on: '2026-10-30' },
    });
    await markReminderSent(t.db, ws, id, mine.reminder, 'em_1');
    await markReminderSent(t.db, ws, id, mine.reminder, 'em_1');
    const again = await remindersDue(t.db, ws, new Date('2026-10-30T09:00:00Z'));
    expect(again.find((r) => r.invoiceId === id)).toBeUndefined();
    const states = (await as(owner, (tx) =>
      getInvoice(tx, id, { now: new Date('2026-10-30T09:00:00Z') }),
    ))!.reminders!;
    expect(states[0]).toMatchObject({ state: 'sent' });
    await as(owner, (tx) => setInvoiceReminders(tx, id, false));
    expect(
      (await remindersDue(t.db, ws, new Date('2026-11-02T03:00:00Z'))).find(
        (r) => r.invoiceId === id,
      ),
    ).toBeUndefined();
  });
});

describe('the client portal', () => {
  it('shows a contact only their client’s issued invoices', async () => {
    const contact = await as(owner, (tx) =>
      addContact(tx, karnataka, { name: 'Example Srinivas Portal', email: portalUser.email! }),
    );
    await as(owner, (tx) => invitePortalContact(tx, contact, owner.userId));
    await as(portalUser, (tx) => claimPortalAccess(tx));
    const issued = await draft(owner, karnataka);
    await issue(owner, issued);
    const hidden = await draft(owner, karnataka);
    const otherClient = await draft(owner, local);
    await issue(owner, otherClient);
    const mine = (await as(portalUser, (tx) => portalInvoices(tx))).map((i) => i.id);
    expect(mine).toContain(issued);
    expect(mine).not.toContain(hidden);
    expect(mine).not.toContain(otherClient);
    // Contacts aren't members: no direct table access.
    expect(await as(portalUser, (tx) => tx.select().from(invoices))).toEqual([]);
  });
});
