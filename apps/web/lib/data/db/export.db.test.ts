// Data export from a real Postgres (TEST_DATABASE_URL): every list the CSV files are made from,
// the JSON with the money tables and no secrets, and only for roles that may export.
import { randomBytes } from 'node:crypto';
import {
  acceptInvitation,
  createWorkspace,
  inviteMember,
  withUser,
  type Session,
} from '@agency-os/db';
import { createTestDb, type TestDb } from '@agency-os/db/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { WorkspaceCtx } from '../../server/workspace';
import { exportAll, exportSource } from './export';
import { createInvoiceFor, invoiceRows, recordPaymentFor } from './invoices';
import { createClientFor, createLeadFor } from './people';
import { createQuoteFor } from './sales';
import { auditFor } from './team';
import { createProjectFor, createTaskFor } from './work';

const run = describe.skipIf(!process.env.TEST_DATABASE_URL);
let t: TestDb;
let owner: WorkspaceCtx;
let member: WorkspaceCtx;

run('data export on the database', () => {
  beforeAll(async () => {
    vi.stubEnv('LINK_SIGNING_SECRET', randomBytes(32).toString('hex'));
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
    const { token } = await withUser(t.db, kiran, (tx) =>
      inviteMember(tx, {
        workspaceId: ws,
        email: 'ravi@onestop.in',
        role: 'member',
        invitedBy: kiran.userId,
      }),
    );
    await withUser(t.db, ravi, (tx) => acceptInvitation(tx, token));
    owner = {
      db: t.db,
      session: kiran,
      workspaceId: ws,
      slug: 'one-stop',
      role: 'owner',
      plan: 'growth',
    };
    member = { ...owner, session: ravi, role: 'member' };

    const lead = await createLeadFor(owner, {
      name: 'Example Meera Iyer',
      company: 'Example Kite & Co',
      email: 'meera@kite.example',
      phone: null,
      source: 'referral',
      service: 'Website',
      valueMinor: 18_000_000n,
      followUpOn: null,
      notes: '',
    });
    const client = await createClientFor(owner, {
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
    const project = await createProjectFor(owner, {
      name: 'Website',
      clientId: client,
      template: 'seven_phases',
      lead: 'Kiran Rao',
      budgetMinor: 8_000_000n,
      startOn: '2026-10-20',
      dueOn: '2026-12-15',
    });
    await createTaskFor(owner, {
      title: 'Homepage wireframe',
      projectId: project,
      phase: null,
      assignee: 'Kiran Rao',
      dueOn: null,
      priority: 'normal',
      status: 'todo',
      description: '',
    });
    const line = {
      description: 'Website design',
      sac: '998314',
      quantity: 1,
      rateMinor: 4_000_000n,
      taxRateBp: 1800,
    };
    await createQuoteFor(owner, {
      leadId: lead,
      clientId: null,
      country: 'IN',
      currency: 'INR',
      stateCode: '37',
      validUntil: '2026-11-30',
      lines: [line],
      discountMinor: 0n,
    });
    await createInvoiceFor(owner, {
      clientId: client,
      currency: 'INR',
      dueOn: '2026-11-02',
      exchangeRate: null,
      lines: [line],
      issue: true,
      reminders: true,
    });
    const [inv] = await invoiceRows(owner);
    await recordPaymentFor(owner, inv!.id, {
      amountMinor: 2_000_000n,
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

  it('gathers every list the CSV files are made from', async () => {
    const src = (await exportSource(owner))!;
    expect(src.leads.map((l) => l.company)).toEqual(['Example Kite & Co']);
    expect(src.clients.map((c) => [c.name, c.stateCode])).toEqual([['Example Acme Labs', '29']]);
    expect(src.projects.map((p) => p.name)).toEqual(['Website']);
    expect(src.tasks.map((x) => x.title)).toEqual(['Homepage wireframe']);
    expect(src.quotes).toHaveLength(1);
    expect(src.quotes[0]!.totals.total.amountMinor).toBe(4_720_000n);
    expect(src.invoices).toHaveLength(1);
    expect(src.invoices[0]).toMatchObject({
      client: { name: 'Example Acme Labs' },
      state: { paidMinor: 2_000_000n, dueMinor: 2_720_000n },
    });
    expect(src.invoices[0]!.invoice.payments).toHaveLength(1);
    expect(src.members.map((m) => m.email).sort()).toEqual(['kiran@onestop.in', 'ravi@onestop.in']);
  });

  it('exports everything as JSON with the money tables and no secrets, and logs it', async () => {
    const json = (await exportAll(owner))!;
    const data = JSON.parse(json);
    expect(data.format).toBe('agency-os-export');
    expect(data.tables.invoices).toHaveLength(1);
    expect(data.tables.invoice_items).toHaveLength(1);
    expect(data.tables.payments).toHaveLength(1);
    // Reminder rows are written as the daily job sends them; the table is there, empty for now.
    expect(data.tables.reminders).toEqual([]);
    expect(json).not.toMatch(/public_token_hash|token_hash|code_hash/);
    const logged = (await auditFor(owner, { action: 'data.exported' })).rows;
    expect(logged[0]).toMatchObject({ actor: 'Kiran Rao', subject: 'Everything (JSON)' });
  });

  it('gives nothing to a role that may not export', async () => {
    expect(await exportSource(member)).toBeNull();
    expect(await exportAll(member)).toBeNull();
  });
});
