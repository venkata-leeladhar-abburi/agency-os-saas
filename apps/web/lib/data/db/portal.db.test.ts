// The client portal from a real Postgres (TEST_DATABASE_URL): the invited contact signs in,
// sees only their own client's projects and invoices, approves work and messages the team, who
// see it on the project page and in their notifications.
import { randomBytes } from 'node:crypto';
import { createWorkspace, withUser, type Session } from '@agency-os/db';
import { createTestDb, type TestDb } from '@agency-os/db/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { portalCtxFor, type PortalCtx } from '../../server/portal';
import type { WorkspaceCtx } from '../../server/workspace';
import { createInvoiceFor, invoiceRows, recordPaymentFor } from './invoices';
import { createClientFor, inviteToPortalFor } from './people';
import {
  decideGateFor,
  portalHomeFor,
  portalInvoiceFor,
  portalInvoicesFor,
  portalProjectFor,
  projectMessagesFor,
  saveContactFor,
  sendPortalMessageFor,
  teamMessageFor,
} from './portal';
import { notificationList } from './team';
import { createProjectFor, projectDetail, requestGateFor } from './work';

const run = describe.skipIf(!process.env.TEST_DATABASE_URL);
let t: TestDb;
let ctx: WorkspaceCtx;
let sarah: Session;
let pc: PortalCtx;
let project: string;
let otherProject: string;
let invoiceId: string;

const client = (name: string, email: string) => ({
  name,
  contactName: `${name} contact`,
  email,
  phone: null,
  city: 'Bengaluru',
  country: 'IN',
  currency: 'INR',
  gstin: null,
  stateCode: '29',
  notes: 'Pays late',
});

run('the client portal on the database', () => {
  beforeAll(async () => {
    vi.stubEnv('LINK_SIGNING_SECRET', randomBytes(32).toString('hex'));
    t = await createTestDb();
    const kiran: Session = {
      userId: await t.createUser('kiran@onestop.in'),
      email: 'kiran@onestop.in',
    };
    sarah = {
      userId: await t.createUser('sarah@northwind.example'),
      email: 'sarah@northwind.example',
    };
    const ws = await withUser(t.db, kiran, (tx) =>
      createWorkspace(tx, { name: 'One Stop Solutions', slug: 'one-stop' }),
    );
    await t.admin`update workspaces set plan = 'growth', gstin = '37ABCDE1234F1ZZ', state_code = '37' where id = ${ws}`;
    await t.admin`update profiles set full_name = 'Kiran Rao' where id = ${kiran.userId}`;
    ctx = {
      db: t.db,
      session: kiran,
      workspaceId: ws,
      slug: 'one-stop',
      role: 'owner',
      plan: 'growth',
    };

    const northwind = await createClientFor(
      ctx,
      client('Example Northwind', 'sarah@northwind.example'),
    );
    const acme = await createClientFor(ctx, client('Example Acme', 'srinivas@acme.example'));
    await inviteToPortalFor(ctx, northwind);
    await inviteToPortalFor(ctx, acme);
    const base = {
      template: 'seven_phases' as const,
      lead: 'Kiran Rao',
      budgetMinor: 8_000_000n,
      startOn: '2026-10-20',
      dueOn: '2026-12-15',
    };
    project = await createProjectFor(ctx, { ...base, name: 'Website', clientId: northwind });
    otherProject = await createProjectFor(ctx, { ...base, name: 'Acme app', clientId: acme });
    await requestGateFor(ctx, project, 'The proposal is ready for you.');

    await createInvoiceFor(ctx, {
      clientId: northwind,
      currency: 'INR',
      dueOn: '2026-11-15',
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
    });
    await createInvoiceFor(ctx, {
      clientId: acme,
      currency: 'INR',
      dueOn: '2026-11-15',
      exchangeRate: null,
      lines: [
        { description: 'App', sac: '998314', quantity: 1, rateMinor: 5_000_000n, taxRateBp: 1800 },
      ],
      issue: true,
      reminders: false,
    });
    invoiceId = (await invoiceRows(ctx)).find((r) => r.client === 'Example Northwind')!.id;
    await recordPaymentFor(ctx, invoiceId, {
      amountMinor: 1_800_000n,
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

  it('signs in the invited contact to their own client, once linked', async () => {
    pc = (await portalCtxFor(t.db, sarah, 'one-stop'))!;
    expect(pc).toMatchObject({ claimed: 1, client: { client_name: 'Example Northwind' } });
    expect((await portalCtxFor(t.db, sarah, 'one-stop'))!.claimed).toBe(0);
    expect(await portalCtxFor(t.db, sarah, 'another-agency')).toBeNull();
    const stranger: Session = {
      userId: await t.createUser('x@else.example'),
      email: 'x@else.example',
    };
    expect(await portalCtxFor(t.db, stranger, 'one-stop')).toBeNull();
  });

  it('shows what needs them, their projects only, and nothing internal', async () => {
    const home = await portalHomeFor(pc, 'one-stop');
    expect(home.needs.map((n) => n.title)).toEqual([
      'Approve: Proposal accepted',
      'Pay ₹1,00,000.00',
    ]);
    expect(home.projects.map((p) => p.name)).toEqual(['Website']);
    expect(await portalProjectFor(pc, otherProject)).toBeNull();
    const text = JSON.stringify(await portalProjectFor(pc, project));
    expect(text).not.toContain('8000000');
    expect(text).not.toContain('Pays late');
  });

  it('shows their issued invoices with the totals they were issued with', async () => {
    const list = await portalInvoicesFor(pc);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      totals: { total: { amountMinor: 11_800_000n } },
      state: { paidMinor: 1_800_000n, dueMinor: 10_000_000n },
    });
    const found = (await portalInvoiceFor(pc, invoiceId))!;
    expect(found.client).toMatchObject({ name: 'Example Northwind', stateCode: '29' });
    expect(found.settings).toMatchObject({ name: 'One Stop Solutions', gstin: '37ABCDE1234F1ZZ' });
    const acmeInvoice = (await invoiceRows(ctx)).find((r) => r.client === 'Example Acme')!.id;
    expect(await portalInvoiceFor(pc, acmeInvoice)).toBeNull();
  });

  it('asks for changes with a note, and tells the project lead', async () => {
    expect(await decideGateFor(pc, project, 'changes', ' ')).toEqual({
      ok: false,
      error: 'Say what should change, so the team knows what to do.',
    });
    expect(await decideGateFor(pc, otherProject, 'approved', '')).toMatchObject({ ok: false });
    expect(await decideGateFor(pc, project, 'changes', 'Add the blog, please.')).toEqual({
      ok: true,
    });
    const view = (await portalProjectFor(pc, project))!;
    expect(view.project.gate).toMatchObject({ status: 'changes', title: 'Proposal accepted' });
    expect(await decideGateFor(pc, project, 'approved', '')).toEqual({
      ok: false,
      error: 'There’s nothing waiting for your approval.',
    });
    const team = (await projectDetail(ctx, project))!.project;
    expect(team.gateHistory[0]).toMatchObject({
      decision: 'changes',
      comment: 'Add the blog, please.',
    });
    const { rows } = await notificationList(ctx, 'one-stop');
    expect(rows[0]!.title).toBe('Example Northwind asked for changes to Proposal accepted');
  });

  it('keeps one thread per project between the client and the team', async () => {
    expect(await sendPortalMessageFor(pc, project, '  ')).toEqual({
      ok: false,
      error: 'Write a message first.',
    });
    expect(await sendPortalMessageFor(pc, otherProject, 'Hi')).toMatchObject({ ok: false });
    expect(await sendPortalMessageFor(pc, project, 'When is the next review?')).toEqual({
      ok: true,
    });
    expect(await teamMessageFor(ctx, project, 'Thursday at 11.')).toEqual({ ok: true });

    const theirs = (await portalProjectFor(pc, project))!.messages;
    expect(theirs.map((m) => [m.who, m.fromClient, m.text])).toEqual([
      ['Example Northwind contact', true, 'When is the next review?'],
      ['Kiran Rao', false, 'Thursday at 11.'],
    ]);
    expect(await projectMessagesFor(ctx, project)).toHaveLength(2);
    expect(await projectMessagesFor(ctx, otherProject)).toEqual([]);
    const { rows } = await notificationList(ctx, 'one-stop');
    expect(rows[0]).toMatchObject({
      title: 'New message from Example Northwind contact about Website',
      href: `/w/one-stop/projects/${project}`,
    });
    const home = await portalHomeFor(pc, 'one-stop');
    expect(home.latest.map((x) => `${x.who} ${x.text}`)).toContain('Kiran Rao sent you a message');
  });

  it('lets the contact update their own details', async () => {
    expect(
      await saveContactFor(pc, {
        contactName: 'Example Sarah Iyer',
        email: 'sarah@northwind.example',
        phone: '+919014952056',
      }),
    ).toEqual({ ok: true });
    const again = (await portalCtxFor(t.db, sarah, 'one-stop'))!;
    expect(again.client).toMatchObject({
      contact_name: 'Example Sarah Iyer',
      contact_phone: '+919014952056',
    });
  });
});
