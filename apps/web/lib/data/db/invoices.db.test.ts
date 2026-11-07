// Runs the invoice screens' data functions against a real Postgres (TEST_DATABASE_URL), as a
// member, with RLS: the same path the pages take once signed in.
import { randomBytes } from 'node:crypto';
import { createClient, createWorkspace, withUser, type Session } from '@agency-os/db';
import { createTestDb, type TestDb } from '@agency-os/db/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { WorkspaceCtx } from '../../server/workspace';
import {
  clientChoices,
  createInvoiceFor,
  invoiceDetail,
  invoiceRows,
  newPayLinkFor,
  nextNumber,
  recordPaymentFor,
  saveBrandColourFor,
  saveSettingsFor,
  setRemindersFor,
  settingsFor,
} from './invoices';

const run = describe.skipIf(!process.env.TEST_DATABASE_URL);
let t: TestDb;
let ctx: WorkspaceCtx;
let other: WorkspaceCtx;
let client: string;
const now = new Date('2026-10-26T09:30:00Z');
const line = {
  description: 'Website design',
  sac: '998314',
  quantity: 1,
  rateMinor: 4_000_000n,
  taxRateBp: 1800,
};

run('invoices on the database', () => {
  beforeAll(async () => {
    vi.stubEnv('LINK_SIGNING_SECRET', randomBytes(32).toString('hex'));
    t = await createTestDb();
    const owner: Session = {
      userId: await t.createUser('kiran@onestop.in'),
      email: 'kiran@onestop.in',
    };
    const outsider: Session = {
      userId: await t.createUser('sarah@northwind.example'),
      email: 'sarah@northwind.example',
    };
    const as = <T>(s: Session, fn: Parameters<typeof withUser<T>>[2]) => withUser(t.db, s, fn);
    const ws = await as(owner, (tx) =>
      createWorkspace(tx, { name: 'One Stop Solutions', slug: 'one-stop' }),
    );
    const ws2 = await as(outsider, (tx) =>
      createWorkspace(tx, { name: 'Northwind', slug: 'northwind' }),
    );
    await t.admin`update workspaces set plan = 'growth', gstin = '27AAPFU0939F1ZV', state_code = '36', invoice_prefix = 'OSS' where id = ${ws}`;
    client = await as(owner, (tx) =>
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
    ctx = {
      db: t.db,
      session: owner,
      workspaceId: ws,
      slug: 'one-stop',
      role: 'owner',
      plan: 'free',
    };
    other = {
      db: t.db,
      session: outsider,
      workspaceId: ws2,
      slug: 'northwind',
      role: 'owner',
      plan: 'free',
    };
  }, 60_000);

  afterAll(async () => {
    vi.unstubAllEnvs();
    await t?.drop();
  });

  it('issues an invoice and lists it the way the invoices page shows it', async () => {
    expect(await nextNumber(ctx, now)).toBe('OSS/26-27/001');
    expect((await clientChoices(ctx)).map((c) => c.name)).toEqual(['Example Acme Labs']);
    const id = await createInvoiceFor(
      ctx,
      {
        clientId: client,
        currency: 'INR',
        dueOn: '2026-11-02',
        exchangeRate: null,
        lines: [line],
        issue: true,
        reminders: true,
      },
      now,
    );
    const [row] = await invoiceRows(ctx, now);
    expect(row).toMatchObject({
      id,
      number: 'OSS/26-27/001',
      client: 'Example Acme Labs',
      amount: '₹47,200.00',
      status: 'due',
      statusText: 'Due 2 Nov',
    });
    expect(await nextNumber(ctx, now)).toBe('OSS/26-27/002');
  });

  it('shows the invoice page: IGST to Karnataka, the client, the pay link, reminders', async () => {
    const id = (await invoiceRows(ctx, now))[0]!.id;
    const page = (await invoiceDetail(ctx, id, now))!;
    expect(page.totals).toMatchObject({ documentType: 'tax_invoice', treatment: 'inter' });
    expect(page.totals.igst.amountMinor).toBe(720_000n);
    expect(page.client).toMatchObject({
      name: 'Example Acme Labs',
      contactName: 'Example Srinivas',
      email: 'srinivas@acme.example',
      stateCode: '29',
    });
    expect(page.invoice.payToken).toMatch(/^[\w-]{40,}$/);
    expect(page.state).toMatchObject({ status: 'due', dueMinor: 4_720_000n });
    expect(page.reminders!.map((r) => r.state)).toEqual([
      'scheduled',
      'scheduled',
      'scheduled',
      'scheduled',
    ]);
    expect(page.settings).toMatchObject({ name: 'One Stop Solutions', invoicePrefix: 'OSS' });
  });

  it('records payments, switches reminders and replaces the pay link', async () => {
    const id = (await invoiceRows(ctx, now))[0]!.id;
    await recordPaymentFor(ctx, id, {
      amountMinor: 2_000_000n,
      receivedOn: '2026-10-27',
      method: 'upi',
      reference: 'UPI 6021',
      status: 'partially_paid',
    });
    let page = (await invoiceDetail(ctx, id, now))!;
    expect(page.state).toMatchObject({
      status: 'partially_paid',
      paidMinor: 2_000_000n,
      dueMinor: 2_720_000n,
    });
    await setRemindersFor(ctx, id, false);
    const before = page.invoice.payToken;
    const fresh = await newPayLinkFor(ctx, id!);
    page = (await invoiceDetail(ctx, id, now))!;
    expect(page.invoice.reminders).toBe(false);
    expect(page.invoice.payToken).toBe(fresh);
    expect(fresh).not.toBe(before);
  });

  it('saves the workspace settings and brand colour, and new invoices use them', async () => {
    const before = await settingsFor(ctx);
    await saveSettingsFor(ctx, {
      ...before,
      gstin: '27AAPFU0939F1ZV',
      invoicePrefix: 'ONE',
      paymentTermsDays: 15,
      invoiceFooter: 'Example footer',
    });
    await saveBrandColourFor(ctx, '#0f766e');
    expect(await settingsFor(ctx)).toMatchObject({
      gstin: '27AAPFU0939F1ZV',
      stateCode: '27',
      invoicePrefix: 'ONE',
      paymentTermsDays: 15,
      invoiceFooter: 'Example footer',
      brandColour: '#0f766e',
    });
    expect(await nextNumber(ctx, now)).toBe('ONE/26-27/002');
    await expect(saveSettingsFor(ctx, { ...before, invoicePrefix: 'O S' })).rejects.toThrow(
      'Use letters, numbers and dashes',
    );
  });

  it('shows nothing of it to another workspace', async () => {
    const id = (await invoiceRows(ctx, now))[0]!.id;
    expect(await invoiceRows(other, now)).toEqual([]);
    expect(await invoiceDetail(other, id, now)).toBeNull();
  });
});
