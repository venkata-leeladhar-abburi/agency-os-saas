// The public pay link on the database (TEST_DATABASE_URL): the token opens one issued invoice
// with the agency's bank details; anything else opens nothing.
import { randomBytes } from 'node:crypto';
import { createWorkspace, withUser, type Session } from '@agency-os/db';
import { createTestDb, type TestDb } from '@agency-os/db/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { WorkspaceCtx } from '../../server/workspace';
import { createInvoiceFor, invoiceDetail, invoiceRows, recordPaymentFor } from './invoices';
import { payLinkFor } from './pay';
import { createClientFor } from './people';

const run = describe.skipIf(!process.env.TEST_DATABASE_URL);
let t: TestDb;
let ctx: WorkspaceCtx;
let token: string;

run('the pay link on the database', () => {
  beforeAll(async () => {
    vi.stubEnv('LINK_SIGNING_SECRET', randomBytes(32).toString('hex'));
    t = await createTestDb();
    const kiran: Session = {
      userId: await t.createUser('kiran@onestop.in'),
      email: 'kiran@onestop.in',
    };
    const ws = await withUser(t.db, kiran, (tx) =>
      createWorkspace(tx, { name: 'One Stop Solutions', slug: 'one-stop' }),
    );
    await t.admin`update workspaces set plan = 'free', gstin = '37ABCDE1234F1ZZ', state_code = '37',
      bank = ${t.admin.json({ accountName: 'One Stop Solutions', accountNumber: '50200012345678', ifsc: 'HDFC0001234' })}
      where id = ${ws}`;
    ctx = {
      db: t.db,
      session: kiran,
      workspaceId: ws,
      slug: 'one-stop',
      role: 'owner',
      plan: 'free',
    };
    const client = await createClientFor(ctx, {
      name: 'Example Acme Labs',
      contactName: 'Example Srinivas',
      email: 'srinivas@acme.example',
      phone: null,
      city: 'Bengaluru',
      country: 'IN',
      currency: 'INR',
      gstin: null,
      stateCode: '29',
      notes: '',
    });
    const line = {
      description: 'Design',
      sac: '998314',
      quantity: 1,
      rateMinor: 4_000_000n,
      taxRateBp: 1800,
    };
    await createInvoiceFor(ctx, {
      clientId: client,
      currency: 'INR',
      dueOn: '2026-12-01',
      exchangeRate: null,
      lines: [line],
      issue: true,
      reminders: false,
    });
    await createInvoiceFor(ctx, {
      clientId: client,
      currency: 'INR',
      dueOn: '2026-12-01',
      exchangeRate: null,
      lines: [line],
      issue: false,
      reminders: false,
    });
    const issued = (await invoiceRows(ctx)).find((r) => r.status !== 'draft')!;
    token = (await invoiceDetail(ctx, issued.id))!.invoice.payToken;
    await recordPaymentFor(ctx, issued.id, {
      amountMinor: 1_000_000n,
      receivedOn: '2026-10-27',
      method: 'upi',
      reference: 'UPI 6021',
      status: 'partially_paid',
    });
  }, 60_000);

  afterAll(async () => {
    vi.unstubAllEnvs();
    await t?.drop();
  });

  it('opens the issued invoice with what is due and how to pay', async () => {
    const found = (await payLinkFor(token, new Date(), t.db))!;
    expect(found.invoice.number).toMatch(/^OSS\/\d\d-\d\d\/001$/);
    expect(found.totals.total.amountMinor).toBe(4_720_000n);
    expect(found.state).toMatchObject({ paidMinor: 1_000_000n, dueMinor: 3_720_000n });
    expect(found.client).toMatchObject({ name: 'Example Acme Labs', stateCode: '29' });
    expect(found.settings.bank).toMatchObject({
      accountNumber: '50200012345678',
      ifsc: 'HDFC0001234',
    });
    // Free plan: the page says "Powered by Agency OS".
    expect(found.brand).toMatchObject({ name: 'One Stop Solutions', plan: 'free' });
  });

  it('opens nothing for a wrong, altered or empty token', async () => {
    expect(await payLinkFor('nope', new Date(), t.db)).toBeNull();
    expect(await payLinkFor(`${token.slice(0, -1)}x`, new Date(), t.db)).toBeNull();
    expect(await payLinkFor('', new Date(), t.db)).toBeNull();
  });
});
