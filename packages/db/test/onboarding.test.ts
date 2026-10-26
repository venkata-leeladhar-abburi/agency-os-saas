import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { acceptInvitation, createWorkspace, inviteMember } from '../src/accounts';
import { withService, withUser, type Session } from '../src/client';
import { addContact, createClient, invitePortalContact, listClients } from '../src/clients';
import { dashboardMetrics, todayFor } from '../src/dashboard';
import { createInvoice, issueInvoice, listInvoices } from '../src/invoices';
import { createLead, listLeads } from '../src/leads';
import {
  dismissOnboarding,
  hasSampleData,
  loadSampleData,
  onboardingState,
  removeSampleData,
  showOnboarding,
} from '../src/onboarding';
import { checkPlanLimit } from '../src/platform';
import { getProject, listProjects } from '../src/projects';
import { createQuote, sendQuote } from '../src/sales-docs';
import { createTestDb, type TestDb } from './db';

let t: TestDb;
let owner: Session;
let member: Session;
let ws: string;

const as = <T>(s: Session, fn: Parameters<typeof withUser<T>>[2]) => withUser(t.db, s, fn);
const now = new Date('2026-10-26T09:30:00Z');

beforeAll(async () => {
  t = await createTestDb();
  owner = { userId: await t.createUser('kiran@onestop.in'), email: 'kiran@onestop.in' };
  member = { userId: await t.createUser('arjun@onestop.in'), email: 'arjun@onestop.in' };
  ws = await as(owner, (tx) => createWorkspace(tx, { name: 'One Stop Solutions' }));
  await t.admin`update workspaces set state_code = '36' where id = ${ws}`;
}, 60_000);

afterAll(async () => {
  await t?.drop();
});

describe('example data', () => {
  it('loads the example set once, all marked as examples', async () => {
    expect(
      await withService(t.db, ws, (tx, id) => loadSampleData(tx, id, owner.userId, now)),
    ).toMatchObject({ loaded: true });
    expect(
      await withService(t.db, ws, (tx, id) => loadSampleData(tx, id, owner.userId, now)),
    ).toEqual({ loaded: false });
    expect(await as(owner, (tx) => hasSampleData(tx, ws))).toBe(true);

    const clients = await as(owner, (tx) => listClients(tx, ws));
    expect(clients.map((c) => [c.name, c.isExample])).toEqual([['Kite & Co', true]]);
    const leads = await as(owner, (tx) => listLeads(tx, ws));
    expect(leads.map((r) => [r.lead.company, r.lead.isExample]).sort()).toEqual([
      ['Lumen Foods', true],
      ['Northwind', true],
    ]);
    const [project] = await as(owner, (tx) => listProjects(tx, ws));
    const full = (await as(owner, (tx) => getProject(tx, project!.id)))!;
    expect(full.phases.map((p) => p.status).slice(0, 5)).toEqual([
      'done',
      'done',
      'done',
      'in_progress',
      'not_started',
    ]);
    expect(full.phases[3]!.gate).toMatchObject({ title: 'Design sign-off', status: 'waiting' });
    expect(full.isExample).toBe(true);
    const invoices = await as(owner, (tx) => listInvoices(tx, ws));
    expect(invoices.map((i) => [i.number, i.status]).sort()).toEqual([
      ['EXAMPLE-001', 'paid'],
      ['EXAMPLE-002', 'issued'],
    ]);
  });

  it('never counts towards plan limits or ticks onboarding steps', async () => {
    expect(await as(owner, (tx) => checkPlanLimit(tx, ws, 'open_leads'))).toMatchObject({
      used: 0,
      allowed: true,
    });
    const state = await as(owner, (tx) => onboardingState(tx, ws));
    expect(state).toMatchObject({ done: 0, total: 5, visible: true });
  });

  it('leaves the real invoice series alone', async () => {
    const clientId = await as(owner, (tx) =>
      createClient(tx, ws, { name: 'Real Client Pvt Ltd' }, owner.userId),
    );
    const id = await as(owner, (tx) =>
      createInvoice(
        tx,
        ws,
        {
          clientId,
          items: [{ description: 'Design', quantity: 1, rateMinor: 1_000_000n, taxRateBp: 1800 }],
        },
        owner.userId,
        now,
      ),
    );
    expect((await as(owner, (tx) => issueInvoice(tx, id, owner.userId, now))).number).toBe(
      'OSS/26-27/001',
    );
  });

  it('shows in the dashboard and Today while loaded', async () => {
    const metrics = await as(owner, (tx) => dashboardMetrics(tx, ws, now));
    // Not GST-registered, so the example invoices are bills of supply: ₹1,00,000.
    expect(metrics.revenue.valueMinor).toBe(10_000_000n);
    const today = await as(owner, (tx) => todayFor(tx, ws, owner.userId, now));
    expect(today.tasks.map((x) => x.title)).toEqual(['Hi-fi design, desktop and phone']);
    expect(today.gatesWithClients.map((g) => g.title)).toEqual(['Design sign-off']);
  });

  it('removes every example record and nothing else', async () => {
    const removed = await withService(t.db, ws, (tx, id) => removeSampleData(tx, id));
    expect(removed).toEqual({ invoices: 2, projects: 1, leads: 2, clients: 1 });
    expect((await as(owner, (tx) => listClients(tx, ws))).map((c) => c.name)).toEqual([
      'Real Client Pvt Ltd',
    ]);
    expect(await as(owner, (tx) => listLeads(tx, ws))).toEqual([]);
    expect(await as(owner, (tx) => listProjects(tx, ws))).toEqual([]);
    expect((await as(owner, (tx) => listInvoices(tx, ws))).map((i) => i.number)).toEqual([
      'OSS/26-27/001',
    ]);
    expect(await as(owner, (tx) => hasSampleData(tx, ws))).toBe(false);
    const leftovers =
      await t.admin`select count(*)::int as n from activities where workspace_id = ${ws} and (is_example or subject_type in ('project', 'invoice'))`;
    expect(leftovers[0]!.n).toBe(0);
    expect(await withService(t.db, ws, (tx, id) => removeSampleData(tx, id))).toEqual({
      invoices: 0,
      projects: 0,
      leads: 0,
      clients: 0,
    });
  });

  it('still never deletes a real issued invoice or payment', async () => {
    await expect(t.admin`delete from invoices where number = 'OSS/26-27/001'`).rejects.toThrow(
      /invoice_locked/,
    );
  });
});

describe('onboarding checklist', () => {
  it('ticks steps from real records', async () => {
    await t.admin`update workspaces set plan = 'growth' where id = ${ws}`;
    const clientId = (await as(owner, (tx) => listClients(tx, ws)))[0]!.id;
    await as(owner, (tx) =>
      createLead(tx, ws, { name: 'Real Lead', email: 'lead@real.example' }, owner.userId),
    );
    const quote = await as(owner, (tx) =>
      createQuote(
        tx,
        ws,
        {
          clientId,
          items: [{ description: 'Design', quantity: 1, rateMinor: 1_000_000n, taxRateBp: 1800 }],
        },
        owner.userId,
        now,
      ),
    );
    await as(owner, (tx) => sendQuote(tx, quote, owner.userId, now));
    let state = await as(owner, (tx) => onboardingState(tx, ws));
    expect(state.steps.map((s) => [s.key, s.done])).toEqual([
      ['brand', false],
      ['lead', true],
      ['quote', true],
      ['portal', false],
      ['invoice', true],
    ]);
    await t.admin`update workspaces set logo_path = ${`${ws}/logo.png`} where id = ${ws}`;
    const contactId = await as(owner, (tx) =>
      addContact(tx, clientId, { name: 'Real Contact', email: 'contact@real.example' }),
    );
    await as(owner, (tx) => invitePortalContact(tx, contactId, owner.userId));
    state = await as(owner, (tx) => onboardingState(tx, ws));
    expect(state).toMatchObject({ done: 5, complete: true, visible: false });
  });

  it('can be dismissed by an owner and brought back from Help', async () => {
    const fresh = await as(member, (tx) => createWorkspace(tx, { name: 'Example Fresh Studio' }));
    await t.admin`update workspaces set plan = 'starter' where id = ${fresh}`;
    expect((await as(member, (tx) => onboardingState(tx, fresh))).visible).toBe(true);
    await as(member, (tx) => dismissOnboarding(tx, fresh));
    expect((await as(member, (tx) => onboardingState(tx, fresh))).visible).toBe(false);
    await as(member, (tx) => showOnboarding(tx, fresh));
    expect((await as(member, (tx) => onboardingState(tx, fresh))).visible).toBe(true);
    const { token } = await as(member, (tx) =>
      inviteMember(tx, {
        workspaceId: fresh,
        email: owner.email!,
        role: 'member',
        invitedBy: member.userId,
      }),
    );
    await as(owner, (tx) => acceptInvitation(tx, token));
    await expect(as(owner, (tx) => dismissOnboarding(tx, fresh))).rejects.toMatchObject({
      code: 'no_access',
    });
  });
});
