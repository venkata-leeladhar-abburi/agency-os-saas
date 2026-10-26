import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { acceptInvitation, createWorkspace, inviteMember } from '../src/accounts';
import { withUser, type Session } from '../src/client';
import { createClient } from '../src/clients';
import { dashboardMetrics, projectsAtRisk, teamLoad, todayFor } from '../src/dashboard';
import { createInvoice, issueInvoice, recordPayment } from '../src/invoices';
import { createLead, listStages, moveLead, setFollowUp } from '../src/leads';
import { createProject, getProject, requestGateApproval } from '../src/projects';
import { gates, phases } from '../src/schema';
import { createTask } from '../src/tasks';
import { createTestDb, type TestDb } from './db';

let t: TestDb;
let owner: Session;
let lead: Session;
let member: Session;
let ws: string;
let risky: string;
let calm: string;

const as = <T>(s: Session, fn: Parameters<typeof withUser<T>>[2]) => withUser(t.db, s, fn);
// Monday 26 Oct 2026, 15:00 in India.
const now = new Date('2026-10-26T09:30:00Z');
const item = (rateMinor: bigint) => ({
  description: 'Example work',
  quantity: 1,
  rateMinor,
  taxRateBp: 1800,
});

beforeAll(async () => {
  t = await createTestDb();
  const user = async (email: string) => ({ userId: await t.createUser(email), email });
  owner = await user('kiran@onestop.in');
  lead = await user('ravi@onestop.in');
  member = await user('arjun@onestop.in');
  ws = await as(owner, (tx) => createWorkspace(tx, { name: 'One Stop Solutions' }));
  await t.admin`update workspaces set plan = 'growth', gstin = '36AAACO1234A1Z5', state_code = '36' where id = ${ws}`;
  for (const [s, role] of [
    [lead, 'project_lead'],
    [member, 'member'],
  ] as const) {
    const { token } = await as(owner, (tx) =>
      inviteMember(tx, { workspaceId: ws, email: s.email!, role, invitedBy: owner.userId }),
    );
    await as(s, (tx) => acceptInvitation(tx, token));
  }
  const local = await as(owner, (tx) =>
    createClient(tx, ws, { name: 'Example Kite & Co', stateCode: '36' }, owner.userId),
  );
  const us = await as(owner, (tx) =>
    createClient(tx, ws, { name: 'Example US Inc', country: 'US' }, owner.userId),
  );

  // Invoice A: ₹1,18,000 issued today (due 2 Nov), ₹50,000 paid on 10 Oct.
  const a = await as(owner, (tx) =>
    createInvoice(tx, ws, { clientId: local, items: [item(10_000_000n)] }, owner.userId, now),
  );
  await as(owner, (tx) => issueInvoice(tx, a, owner.userId, now));
  await as(owner, (tx) =>
    recordPayment(tx, {
      invoiceId: a,
      amountMinor: 5_000_000n,
      method: 'upi',
      receivedOn: '2026-10-10',
    }),
  );
  // Invoice B: US$2,360 at 84.20, US$1,000 paid on 12 Oct (₹84,200).
  const b = await as(owner, (tx) =>
    createInvoice(
      tx,
      ws,
      { clientId: us, items: [item(200_000n)], exchangeRate: '84.20' },
      owner.userId,
      now,
    ),
  );
  await as(owner, (tx) => issueInvoice(tx, b, owner.userId, now));
  await as(owner, (tx) =>
    recordPayment(tx, {
      invoiceId: b,
      amountMinor: 100_000n,
      method: 'wise',
      receivedOn: '2026-10-12',
    }),
  );
  // Invoice C: ₹1,18,000 issued 10 Sep (due 17 Sep, so overdue), ₹60,000 paid on 15 Sep.
  const c = await as(owner, (tx) =>
    createInvoice(tx, ws, { clientId: local, items: [item(10_000_000n)] }, owner.userId, now),
  );
  await as(owner, (tx) => issueInvoice(tx, c, owner.userId, new Date('2026-09-10T06:00:00Z')));
  await as(owner, (tx) =>
    recordPayment(tx, {
      invoiceId: c,
      amountMinor: 6_000_000n,
      method: 'bank_transfer',
      receivedOn: '2026-09-15',
    }),
  );

  // Pipeline: two open INR leads, one USD lead, one won, one lost, one won then reopened.
  const stages = await as(owner, (tx) => listStages(tx, ws));
  const won = stages.find((s) => s.kind === 'won')!.id;
  const lost = stages.find((s) => s.kind === 'lost')!.id;
  const open = stages.find((s) => s.kind === 'open')!.id;
  const mk = (name: string, valueMinor: bigint, currency = 'INR') =>
    as(owner, (tx) =>
      createLead(
        tx,
        ws,
        {
          name,
          email: `${name.replace(/\W/g, '').toLowerCase()}@example.com`,
          valueMinor,
          currency,
        },
        owner.userId,
        { now },
      ),
    );
  const first = await mk('Example Open One', 48_600_000n);
  await mk('Example Open Two', 10_000_000n);
  await mk('Example Dollar', 500_000n, 'USD');
  const w = await mk('Example Won', 30_000_000n);
  const l = await mk('Example Lost', 20_000_000n);
  const r = await mk('Example Reopened', 0n);
  await as(owner, (tx) => moveLead(tx, { leadId: w, stageId: won, actorId: owner.userId }));
  await as(owner, (tx) =>
    moveLead(tx, { leadId: l, stageId: lost, lostReason: 'price', actorId: owner.userId }),
  );
  await as(owner, (tx) => moveLead(tx, { leadId: r, stageId: won, actorId: owner.userId }));
  await as(owner, (tx) => moveLead(tx, { leadId: r, stageId: open, actorId: owner.userId }));
  await as(owner, (tx) => setFollowUp(tx, first, new Date('2026-10-26T05:30:00Z'), owner.userId));

  // Projects: one late (a task and a gated phase past their dates), one on time.
  risky = await as(owner, (tx) =>
    createProject(
      tx,
      ws,
      {
        clientId: local,
        name: 'Example Website',
        leadMemberId: lead.userId,
        memberIds: [member.userId],
      },
      owner.userId,
    ),
  );
  calm = await as(owner, (tx) =>
    createProject(
      tx,
      ws,
      { clientId: local, name: 'Example Calm', template: 'blank' },
      owner.userId,
    ),
  );
  await as(lead, (tx) =>
    createTask(
      tx,
      ws,
      {
        projectId: risky,
        title: 'Example late task',
        assigneeId: lead.userId,
        dueOn: '2026-10-20',
      },
      lead.userId,
    ),
  );
  await as(lead, (tx) =>
    createTask(
      tx,
      ws,
      {
        projectId: risky,
        title: 'Example later task',
        assigneeId: lead.userId,
        dueOn: '2026-11-20',
      },
      lead.userId,
    ),
  );
  await as(owner, (tx) =>
    createTask(
      tx,
      ws,
      { projectId: calm, title: 'Example on time', dueOn: '2026-11-01' },
      owner.userId,
    ),
  );
  const define = (await as(owner, (tx) => getProject(tx, risky)))!.phases.find(
    (p) => p.name === 'Define',
  )!;
  await as(owner, (tx) =>
    tx.update(phases).set({ endsOn: '2026-10-22' }).where(eq(phases.id, define.id)),
  );
}, 90_000);

afterAll(async () => {
  await t?.drop();
});

describe('dashboard metrics', () => {
  it('adds up revenue, pending and overdue in the base currency', async () => {
    const m = await as(owner, (tx) => dashboardMetrics(tx, ws, now));
    expect(m.currency).toBe('INR');
    // ₹50,000 + US$1,000 × 84.20 this month; ₹60,000 last month.
    expect(m.revenue).toEqual({
      valueMinor: 13_420_000n,
      count: 2,
      previousMinor: 6_000_000n,
      changePercent: 123,
    });
    // A owes ₹68,000; B owes US$1,360 × 84.20 = ₹1,14,512.
    expect(m.pending).toEqual({ valueMinor: 6_800_000n + 11_451_200n, count: 2 });
    expect(m.overdue).toEqual({ valueMinor: 5_800_000n, count: 1 });
  });

  it('shows the open pipeline and the 90-day win rate', async () => {
    const m = await as(owner, (tx) => dashboardMetrics(tx, ws, now));
    expect(m.pipeline).toEqual({ valueMinor: 58_600_000n, count: 3, otherCurrencyLeads: 1 });
    expect(m.winRate).toEqual({ percent: 50, won: 1, lost: 1 });
  });

  it('counts only what the viewer may see', async () => {
    const m = await as(member, (tx) => dashboardMetrics(tx, ws, now));
    expect(m.revenue.valueMinor).toBe(0n);
    expect(m.pipeline.count).toBe(0);
    expect(m.winRate.percent).toBeNull();
  });
});

describe('projects at risk and team load', () => {
  it('lists late projects with the reasons', async () => {
    const list = await as(owner, (tx) => projectsAtRisk(tx, ws, now));
    expect(list).toEqual([
      expect.objectContaining({
        id: risky,
        name: 'Example Website',
        reasons: ['1 task overdue', 'Strategy and scope sign-off is late'],
      }),
    ]);
    expect(list.map((p) => p.id)).not.toContain(calm);
  });

  it('counts open tasks per member', async () => {
    const load = await as(member, (tx) => teamLoad(tx, ws));
    expect(load.find((m) => m.userId === lead.userId)?.openTasks).toBe(2);
    expect(load.find((m) => m.userId === member.userId)?.openTasks).toBe(0);
  });
});

describe('Today', () => {
  it('shows a project lead their tasks and the gates waiting on clients', async () => {
    const connect = (await as(owner, (tx) => getProject(tx, risky)))!.phases[0]!.gate!;
    await as(lead, (tx) => requestGateApproval(tx, connect.id, 'Please review'));
    const today = await as(lead, (tx) => todayFor(tx, ws, lead.userId, now));
    expect(today.date).toBe('2026-10-26');
    expect(today.tasks.map((x) => x.title)).toEqual(['Example late task']);
    expect(today.gatesWithClients.map((g) => g.title)).toEqual(['Proposal accepted']);
    expect(today.gatesForMe).toEqual([]);
    expect(today.invoicesDue).toEqual([]);
  });

  it('shows the owner follow-ups, internal approvals and invoices due', async () => {
    const grow = (await as(owner, (tx) => getProject(tx, risky)))!.phases.find(
      (p) => p.name === 'Grow',
    )!;
    await as(owner, (tx) =>
      tx.insert(gates).values({
        workspaceId: ws,
        phaseId: grow.id,
        title: 'Example internal review',
        approverType: 'internal',
      }),
    );
    const gate = (await as(owner, (tx) => getProject(tx, risky)))!.phases.find(
      (p) => p.name === 'Grow',
    )!.gate!;
    await as(lead, (tx) => requestGateApproval(tx, gate.id));
    const today = await as(owner, (tx) => todayFor(tx, ws, owner.userId, now));
    expect(today.followUps.map((l) => l.name)).toEqual(['Example Open One']);
    expect(today.gatesForMe.map((g) => g.title)).toEqual(['Example internal review']);
    expect(today.invoicesDue).toHaveLength(1);
    expect(today.invoicesDue[0]!.dueOn).toBe('2026-09-17');
    const forMember = await as(member, (tx) => todayFor(tx, ws, member.userId, now));
    expect(forMember).toMatchObject({ followUps: [], tasks: [], gatesForMe: [], invoicesDue: [] });
  });
});
