import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { acceptInvitation, createWorkspace, inviteMember } from '../src/accounts';
import { withService, withUser, type Session } from '../src/client';
import { claimPortalAccess, createClient, getClient, invitePortalContact } from '../src/clients';
import {
  applyRazorpayPaymentEvent,
  cancelInvoice,
  createInvoice,
  deleteDraftInvoice,
  dueReminders,
  getInvoice,
  invoiceFromQuote,
  issueInvoice,
  listInvoices,
  markReminderSent,
  portalInvoices,
  recordPayment,
  updateDraftInvoice,
  type RazorpayPaymentLinkEvent,
} from '../src/invoices';
import { exportWorkspace, listNotifications } from '../src/platform';
import { createProject } from '../src/projects';
import { createQuote } from '../src/sales-docs';
import { invoices, payments } from '../src/schema';
import { eq } from 'drizzle-orm';
import { createTestDb, type TestDb } from './db';

let t: TestDb;
let owner: Session;
let finance: Session;
let lead: Session;
let member: Session;
let outsider: Session;
let portal: Session;
let ws: string;
let hyderabad: string;
let delhi: string;
let us: string;

const as = <T>(s: Session, fn: Parameters<typeof withUser<T>>[2]) => withUser(t.db, s, fn);
const pgError = (pattern: RegExp) => ({
  cause: expect.objectContaining({ message: expect.stringMatching(pattern) }),
});
// Monday 26 Oct 2026, 15:00 in India.
const now = new Date('2026-10-26T09:30:00Z');
const design = {
  description: 'Website design',
  sacCode: '998314',
  quantity: 1,
  rateMinor: 10_000_000n,
  taxRateBp: 1800,
};

beforeAll(async () => {
  t = await createTestDb();
  const user = async (email: string) => ({ userId: await t.createUser(email), email });
  owner = await user('kiran@onestop.in');
  finance = await user('meera@onestop.in');
  lead = await user('ravi@onestop.in');
  member = await user('arjun@onestop.in');
  outsider = await user('sarah@northwind.example');
  portal = await user('accounts@kite.example');
  ws = await as(owner, (tx) => createWorkspace(tx, { name: 'One Stop Solutions' }));
  await as(outsider, (tx) => createWorkspace(tx, { name: 'Northwind Studio' }));
  await t.admin`update workspaces set plan = 'growth', gstin = '36AAACO1234A1Z5', state_code = '36' where id = ${ws}`;
  for (const [s, role] of [
    [finance, 'finance'],
    [lead, 'project_lead'],
    [member, 'member'],
  ] as const) {
    const { token } = await as(owner, (tx) =>
      inviteMember(tx, { workspaceId: ws, email: s.email!, role, invitedBy: owner.userId }),
    );
    await as(s, (tx) => acceptInvitation(tx, token));
  }
  hyderabad = await as(owner, (tx) =>
    createClient(
      tx,
      ws,
      {
        name: 'Example Kite & Co',
        stateCode: '36',
        contact: { name: 'Example Accounts', email: 'accounts@kite.example' },
      },
      owner.userId,
    ),
  );
  delhi = await as(owner, (tx) =>
    createClient(tx, ws, { name: 'Example Delhi Co', stateCode: '07' }, owner.userId),
  );
  us = await as(owner, (tx) =>
    createClient(tx, ws, { name: 'Example US Inc', country: 'US' }, owner.userId),
  );
  const contact = (await as(owner, (tx) => getClient(tx, hyderabad)))!.contacts[0]!;
  await as(owner, (tx) => invitePortalContact(tx, contact.id, owner.userId));
  await as(portal, (tx) => claimPortalAccess(tx));
}, 60_000);

afterAll(async () => {
  await t?.drop();
});

describe('drafts', () => {
  it('works out GST from the client’s state', async () => {
    const intra = await as(finance, (tx) =>
      createInvoice(tx, ws, { clientId: hyderabad, items: [design] }, finance.userId, now),
    );
    expect(await as(finance, (tx) => getInvoice(tx, intra))).toMatchObject({
      type: 'tax_invoice',
      status: 'draft',
      number: null,
      cgstMinor: 900_000n,
      sgstMinor: 900_000n,
      totalMinor: 11_800_000n,
    });
    const inter = await as(finance, (tx) =>
      createInvoice(tx, ws, { clientId: delhi, items: [design] }, finance.userId, now),
    );
    expect(await as(finance, (tx) => getInvoice(tx, inter))).toMatchObject({
      igstMinor: 1_800_000n,
      cgstMinor: 0n,
    });
  });

  it('makes an export invoice, with a LUT when one is valid', async () => {
    const item = {
      description: 'Design sprint (5 days)',
      quantity: 1,
      rateMinor: 200_000n,
      taxRateBp: 1800,
    };
    const noLut = await as(finance, (tx) =>
      createInvoice(
        tx,
        ws,
        { clientId: us, items: [item], exchangeRate: '84.20' },
        finance.userId,
        now,
      ),
    );
    expect(await as(finance, (tx) => getInvoice(tx, noLut))).toMatchObject({
      type: 'tax_invoice',
      currency: 'USD',
      igstMinor: 36_000n,
      totalMinor: 236_000n,
    });
    await t.admin`update workspaces set lut_arn = 'AD360000000000X', lut_valid_from = '2026-04-01', lut_valid_to = '2027-03-31' where id = ${ws}`;
    const lut = await as(finance, (tx) =>
      createInvoice(
        tx,
        ws,
        { clientId: us, items: [item], exchangeRate: '84.20' },
        finance.userId,
        now,
      ),
    );
    expect(await as(finance, (tx) => getInvoice(tx, lut))).toMatchObject({
      type: 'export_lut',
      igstMinor: 0n,
      totalMinor: 200_000n,
    });
    const issued = await as(finance, (tx) => issueInvoice(tx, lut, finance.userId, now));
    expect(await as(finance, (tx) => getInvoice(tx, lut))).toMatchObject({
      lutArn: 'AD360000000000X',
      totalBaseMinor: 16_840_000n,
      number: issued.number,
    });
  });

  it('is a bill of supply when the workspace isn’t GST-registered', async () => {
    const free = await as(outsider, (tx) => createWorkspace(tx, { name: 'Example Freelancer' }));
    const c = await as(outsider, (tx) =>
      createClient(tx, free, { name: 'Example Client' }, outsider.userId),
    );
    const id = await as(outsider, (tx) =>
      createInvoice(tx, free, { clientId: c, items: [design] }, outsider.userId, now),
    );
    expect(await as(outsider, (tx) => getInvoice(tx, id))).toMatchObject({
      type: 'bill_of_supply',
      cgstMinor: 0n,
      igstMinor: 0n,
      totalMinor: 10_000_000n,
    });
  });

  it('copies a quote, edits and deletes drafts', async () => {
    const quoteId = await as(owner, (tx) =>
      createQuote(
        tx,
        ws,
        {
          clientId: hyderabad,
          items: [design, { ...design, description: 'Build', rateMinor: 20_000_000n }],
          discountMinor: 3_000_000n,
        },
        owner.userId,
        now,
      ),
    );
    const id = await as(finance, (tx) => invoiceFromQuote(tx, quoteId, {}, finance.userId));
    const inv = (await as(finance, (tx) => getInvoice(tx, id)))!;
    expect(inv).toMatchObject({
      quoteId,
      clientId: hyderabad,
      subtotalMinor: 27_000_000n,
      totalMinor: 31_860_000n,
    });
    expect(inv.items.map((i) => i.description)).toEqual(['Website design', 'Build']);
    const totals = await as(finance, (tx) =>
      updateDraftInvoice(tx, id, { items: [design], roundOff: true, discountMinor: 0n }),
    );
    expect(totals.total.amountMinor).toBe(11_800_000n);
    await as(finance, (tx) => deleteDraftInvoice(tx, id));
    expect(await as(finance, (tx) => getInvoice(tx, id))).toBeNull();
  });
});

describe('issuing', () => {
  let invoiceId: string;

  it('numbers invoices per financial year and proformas separately', async () => {
    invoiceId = await as(finance, (tx) =>
      createInvoice(
        tx,
        ws,
        { clientId: hyderabad, items: [design], termsDays: 7 },
        finance.userId,
        now,
      ),
    );
    const a = await as(finance, (tx) => issueInvoice(tx, invoiceId, finance.userId, now));
    expect(a).toMatchObject({ number: 'OSS/26-27/002', dueOn: '2026-11-02' });
    const pro = await as(finance, (tx) =>
      createInvoice(
        tx,
        ws,
        { clientId: hyderabad, items: [design], proforma: true },
        finance.userId,
        now,
      ),
    );
    expect((await as(finance, (tx) => issueInvoice(tx, pro, finance.userId, now))).number).toBe(
      'OSS/PF26-27/001',
    );
    const next = await as(finance, (tx) =>
      createInvoice(tx, ws, { clientId: delhi, items: [design] }, finance.userId, now),
    );
    const april = await as(finance, (tx) =>
      issueInvoice(tx, next, finance.userId, new Date('2027-04-01T05:00:00Z')),
    );
    expect(april.number).toBe('OSS/27-28/001');
  });

  it('fixes the bill-to details and schedules reminders', async () => {
    const inv = (await as(finance, (tx) => getInvoice(tx, invoiceId)))!;
    expect(inv).toMatchObject({
      status: 'issued',
      issueOn: '2026-10-26',
      supplierGstin: '36AAACO1234A1Z5',
      billTo: { name: 'Example Kite & Co', stateCode: '36' },
    });
    const due = await withService(t.db, ws, (tx, id) => dueReminders(tx, id, '2026-11-02'));
    expect(due.filter((r) => r.invoice.id === invoiceId).map((r) => r.reminder.kind)).toEqual([
      'before_due',
      'on_due',
    ]);
  });

  it('never changes an issued invoice, only cancels it', async () => {
    await expect(
      as(finance, (tx) => updateDraftInvoice(tx, invoiceId, { items: [design] })),
    ).rejects.toMatchObject({ code: 'invoice_locked' });
    await expect(
      as(finance, (tx) =>
        tx.update(invoices).set({ totalMinor: 1n }).where(eq(invoices.id, invoiceId)),
      ),
    ).rejects.toMatchObject(pgError(/invoice_locked/));
    await expect(as(owner, (tx) => deleteDraftInvoice(tx, invoiceId))).rejects.toMatchObject({
      code: 'invoice_locked',
    });
    await expect(
      as(finance, (tx) =>
        tx
          .update(invoices)
          .set({ amountPaidMinor: 11_800_000n, status: 'paid' })
          .where(eq(invoices.id, invoiceId)),
      ),
    ).rejects.toMatchObject(pgError(/invoice_payment_locked/));
    await expect(
      as(finance, (tx) =>
        tx.update(invoices).set({ status: 'issued' }).where(eq(invoices.status, 'draft')),
      ),
    ).rejects.toMatchObject(pgError(/invoice_not_ready/));
    const spare = await as(finance, (tx) =>
      createInvoice(tx, ws, { clientId: delhi, items: [design] }, finance.userId, now),
    );
    await as(finance, (tx) => issueInvoice(tx, spare, finance.userId, now));
    await expect(as(finance, (tx) => cancelInvoice(tx, spare, ' '))).rejects.toMatchObject({
      code: 'cancel_reason_required',
    });
    await as(finance, (tx) => cancelInvoice(tx, spare, 'Raised for the wrong client'));
    expect(await as(finance, (tx) => getInvoice(tx, spare))).toMatchObject({
      status: 'cancelled',
      cancelReason: 'Raised for the wrong client',
    });
    await expect(
      as(finance, (tx) =>
        tx.update(invoices).set({ status: 'issued' }).where(eq(invoices.id, spare)),
      ),
    ).rejects.toMatchObject(pgError(/invoice_locked/));
  });

  it('needs an exchange rate for an invoice in another currency', async () => {
    const id = await as(finance, (tx) =>
      createInvoice(
        tx,
        ws,
        { clientId: us, items: [{ ...design, rateMinor: 100_000n }] },
        finance.userId,
        now,
      ),
    );
    await expect(
      as(finance, (tx) => issueInvoice(tx, id, finance.userId, now)),
    ).rejects.toMatchObject({ code: 'exchange_rate_required' });
  });
});

describe('payments', () => {
  let invoiceId: string;

  beforeAll(async () => {
    invoiceId = await as(finance, (tx) =>
      createInvoice(tx, ws, { clientId: hyderabad, items: [design] }, finance.userId, now),
    );
    await as(finance, (tx) => issueInvoice(tx, invoiceId, finance.userId, now));
  });

  it('records part payments by hand and says when an amount is too much', async () => {
    await expect(
      as(finance, (tx) =>
        recordPayment(tx, {
          invoiceId,
          amountMinor: 20_000_000n,
          method: 'bank_transfer',
          receivedOn: '2026-10-27',
        }),
      ),
    ).rejects.toMatchObject({
      code: 'payment_invalid',
      message: 'This is more than the amount due (₹1,18,000).',
    });
    const r = await as(finance, (tx) =>
      recordPayment(tx, {
        invoiceId,
        amountMinor: 5_000_000n,
        method: 'bank_transfer',
        receivedOn: '2026-10-27',
        notes: 'NEFT ref 1234',
      }),
    );
    expect(r).toMatchObject({ status: 'partially_paid', dueMinor: 6_800_000n });
    expect(r.events[0]).toMatchObject({ kind: 'payment.received', payload: { amount: '₹50,000' } });
    expect(r.events[0]!.userIds.sort()).toEqual([owner.userId, finance.userId].sort());
    expect(await as(finance, (tx) => getInvoice(tx, invoiceId))).toMatchObject({
      status: 'partially_paid',
      amountPaidMinor: 5_000_000n,
      dueMinor: 6_800_000n,
    });
  });

  it('marks the invoice paid from a Razorpay event once, and stops reminders', async () => {
    const event: RazorpayPaymentLinkEvent = {
      event: 'payment_link.paid',
      payload: {
        payment_link: { entity: { id: 'plink_example', reference_id: invoiceId, status: 'paid' } },
        payment: {
          entity: { id: 'pay_example', amount: 6_800_000, currency: 'INR', method: 'upi' },
        },
      },
    };
    expect(
      await withService(t.db, ws, (tx, id) =>
        applyRazorpayPaymentEvent(tx, id, 'evt_pay_1', event, now),
      ),
    ).toBe('applied');
    expect(
      await withService(t.db, ws, (tx, id) =>
        applyRazorpayPaymentEvent(tx, id, 'evt_pay_1', event, now),
      ),
    ).toBe('duplicate');
    expect(
      await withService(t.db, ws, (tx, id) =>
        applyRazorpayPaymentEvent(tx, id, 'evt_pay_2', event, now),
      ),
    ).toBe('duplicate');
    const inv = (await as(finance, (tx) => getInvoice(tx, invoiceId)))!;
    expect(inv).toMatchObject({ status: 'paid', amountPaidMinor: 11_800_000n, dueMinor: 0n });
    expect(inv.payments.map((p) => [p.method, p.provider, p.amountMinor])).toEqual([
      ['bank_transfer', null, 5_000_000n],
      ['upi', 'razorpay', 6_800_000n],
    ]);
    const due = await withService(t.db, ws, (tx, id) => dueReminders(tx, id, '2027-01-01'));
    expect(due.map((r) => r.invoice.id)).not.toContain(invoiceId);
    expect((await as(finance, (tx) => listNotifications(tx, ws))).map((n) => n.kind)).toContain(
      'payment.received',
    );
    expect(
      await withService(t.db, ws, (tx, id) =>
        applyRazorpayPaymentEvent(
          tx,
          id,
          'evt_other',
          { event: 'payment_link.expired', payload: {} },
          now,
        ),
      ),
    ).toBe('ignored');
  });

  it('refuses payments on drafts, proformas and paid invoices, and direct inserts', async () => {
    const draft = await as(finance, (tx) =>
      createInvoice(tx, ws, { clientId: hyderabad, items: [design] }, finance.userId, now),
    );
    await expect(
      as(finance, (tx) =>
        recordPayment(tx, {
          invoiceId: draft,
          amountMinor: 1n,
          method: 'cash',
          receivedOn: '2026-10-27',
        }),
      ),
    ).rejects.toMatchObject({ code: 'invoice_not_payable' });
    await expect(
      as(finance, (tx) =>
        recordPayment(tx, { invoiceId, amountMinor: 1n, method: 'cash', receivedOn: '2026-10-27' }),
      ),
    ).rejects.toMatchObject({ code: 'invoice_not_payable' });
    await expect(
      as(finance, (tx) =>
        tx.insert(payments).values({
          workspaceId: ws,
          invoiceId,
          amountMinor: 1n,
          currency: 'INR',
          method: 'cash',
          receivedOn: '2026-10-27',
        }),
      ),
    ).rejects.toMatchObject(pgError(/permission denied/));
  });

  it('lists overdue invoices', async () => {
    const overdue = await as(finance, (tx) => listInvoices(tx, ws, { overdueOn: '2026-11-10' }));
    expect(overdue.length).toBeGreaterThan(0);
    expect(overdue.every((i) => i.overdue && ['issued', 'partially_paid'].includes(i.status))).toBe(
      true,
    );
    const ids = overdue.map((i) => i.id);
    expect(ids).not.toContain(invoiceId);
    const sent = await withService(t.db, ws, (tx, id) => dueReminders(tx, id, '2026-11-10'));
    await withService(t.db, ws, (tx) => markReminderSent(tx, sent[0]!.reminder.id));
    expect(
      (await withService(t.db, ws, (tx, id) => dueReminders(tx, id, '2026-11-10'))).length,
    ).toBe(sent.length - 1);
  });
});

describe('access', () => {
  it('lets finance and owners work with invoices; project leads read their projects’ only', async () => {
    const projectId = await as(owner, (tx) =>
      createProject(
        tx,
        ws,
        {
          clientId: hyderabad,
          name: 'Example Website',
          leadMemberId: lead.userId,
          template: 'blank',
        },
        owner.userId,
      ),
    );
    const mine = await as(finance, (tx) =>
      createInvoice(
        tx,
        ws,
        { clientId: hyderabad, projectId, items: [design] },
        finance.userId,
        now,
      ),
    );
    const visible = (await as(lead, (tx) => listInvoices(tx, ws))).map((i) => i.id);
    expect(visible).toEqual([mine]);
    expect((await as(lead, (tx) => getInvoice(tx, mine)))!.items).toHaveLength(1);
    expect(await as(lead, (tx) => tx.select().from(payments))).toEqual([]);
    await expect(
      as(lead, (tx) =>
        createInvoice(tx, ws, { clientId: hyderabad, items: [design] }, lead.userId),
      ),
    ).rejects.toMatchObject(pgError(/row-level security/));
    expect(await as(member, (tx) => listInvoices(tx, ws))).toEqual([]);
    expect(await as(outsider, (tx) => listInvoices(tx, ws))).toEqual([]);
    await expect(
      as(owner, (tx) =>
        createInvoice(tx, ws, { clientId: delhi, projectId, items: [design] }, owner.userId),
      ),
    ).rejects.toMatchObject({ code: 'invoice_mismatch' });
  });

  it('shows the client their issued invoices in the portal', async () => {
    const list = await as(portal, (tx) => portalInvoices(tx));
    expect(list.length).toBeGreaterThan(1);
    expect(list.every((i) => i.clientId === hyderabad && i.status !== 'draft')).toBe(true);
    expect(list.find((i) => i.status === 'paid')).toMatchObject({ dueMinor: '0', overdue: false });
    expect(await as(outsider, (tx) => portalInvoices(tx))).toEqual([]);
  });
});

describe('plan limit and export', () => {
  it('lets Free issue 3 invoices a month (proformas don’t count)', async () => {
    const free = await as(outsider, (tx) => createWorkspace(tx, { name: 'Example Free Studio' }));
    const c = await as(outsider, (tx) =>
      createClient(tx, free, { name: 'Example Client' }, outsider.userId),
    );
    for (let i = 0; i < 3; i++) {
      const id = await as(outsider, (tx) =>
        createInvoice(tx, free, { clientId: c, items: [design] }, outsider.userId, now),
      );
      await as(outsider, (tx) => issueInvoice(tx, id, outsider.userId, now));
    }
    const pro = await as(outsider, (tx) =>
      createInvoice(
        tx,
        free,
        { clientId: c, items: [design], proforma: true },
        outsider.userId,
        now,
      ),
    );
    await as(outsider, (tx) => issueInvoice(tx, pro, outsider.userId, now));
    const fourth = await as(outsider, (tx) =>
      createInvoice(tx, free, { clientId: c, items: [design] }, outsider.userId, now),
    );
    await expect(
      as(outsider, (tx) => issueInvoice(tx, fourth, outsider.userId, now)),
    ).rejects.toMatchObject({
      code: 'plan_limit',
      message: 'Your Free plan includes 3 invoices a month. Upgrade to Agency Starter to add more.',
    });
  });

  it('includes invoices and payments in the export, without link tokens', async () => {
    const data = await as(owner, (tx) => exportWorkspace(tx, ws, owner.userId));
    expect(data.tables.invoices!.length).toBeGreaterThan(5);
    expect(data.tables.payments).toHaveLength(2);
    expect(JSON.stringify(data, (_k, v) => (typeof v === 'bigint' ? String(v) : v))).not.toContain(
      'public_token_hash',
    );
  });
});
