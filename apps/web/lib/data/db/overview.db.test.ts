// The dashboard and Today from a real Postgres (TEST_DATABASE_URL): the same figures and lists
// as example mode, worked out from what the member can see.
import { randomBytes } from 'node:crypto';
import { createWorkspace, withUser, type Session } from '@agency-os/db';
import { createTestDb, type TestDb } from '@agency-os/db/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { WorkspaceCtx } from '../../server/workspace';
import { dashboardFrom, overviewOf, todayFrom } from '../index';
import { istDate } from '../views';
import { createInvoiceFor, invoiceRows, recordPaymentFor } from './invoices';
import { createClientFor, createLeadFor, markLeadLostFor, winLeadFor } from './people';
import { onboardingFor, setDismissed } from './onboarding';
import { snapshot } from './snapshot';
import { createProjectFor, createTaskFor, requestGateFor } from './work';

const run = describe.skipIf(!process.env.TEST_DATABASE_URL);
const DAY = 86_400_000;
const now = new Date();
const on = (days: number) => istDate(new Date(now.getTime() + days * DAY).toISOString());
let t: TestDb;
let ctx: WorkspaceCtx;
let project: string;

const lead = (name: string, valueMinor: bigint, followUpOn: string | null) => ({
  name,
  company: null,
  email: `${name.split(' ')[1]!.toLowerCase()}@example.com`,
  phone: null,
  source: 'referral' as const,
  service: 'Website',
  valueMinor,
  followUpOn,
  notes: '',
});

run('dashboard and Today on the database', () => {
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

    // Two open leads (one to follow up, overdue), one won, one lost.
    await createLeadFor(ctx, lead('Example Kite', 18_000_000n, on(-1)));
    await createLeadFor(ctx, lead('Example Lumen', 7_000_000n, on(5)));
    await winLeadFor(ctx, await createLeadFor(ctx, lead('Example Acme', 0n, null)));
    await markLeadLostFor(
      ctx,
      await createLeadFor(ctx, lead('Example Delta', 0n, null)),
      'price',
      '',
    );

    const client = await createClientFor(ctx, {
      name: 'Example Northwind',
      contactName: 'Example Sarah',
      email: 'sarah@northwind.example',
      phone: null,
      city: null,
      country: 'IN',
      currency: 'INR',
      gstin: null,
      stateCode: '29',
      notes: '',
    });
    project = await createProjectFor(ctx, {
      name: 'Website',
      clientId: client,
      template: 'seven_phases',
      lead: 'Kiran Rao',
      budgetMinor: 8_000_000n,
      startOn: on(-20),
      dueOn: on(40),
    });
    await requestGateFor(ctx, project, 'Discovery notes');
    await createTaskFor(ctx, {
      title: 'Homepage wireframe',
      projectId: project,
      phase: null,
      assignee: 'Kiran Rao',
      dueOn: on(-2),
      priority: 'high',
      status: 'todo',
      description: '',
    });

    // Issued 10 days ago, due 3 days ago, part paid today.
    await createInvoiceFor(
      ctx,
      {
        clientId: client,
        currency: 'INR',
        dueOn: on(-3),
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
      },
      new Date(now.getTime() - 10 * DAY),
    );
    const [inv] = await invoiceRows(ctx, now);
    await recordPaymentFor(ctx, inv!.id, {
      amountMinor: 1_800_000n,
      receivedOn: on(0),
      method: 'upi',
      reference: null,
      status: 'partially_paid',
    });
  }, 60_000);

  afterAll(async () => {
    vi.unstubAllEnvs();
    await t?.drop();
  });

  it('works out the money, the pipeline, the win rate, projects at risk and team load', async () => {
    const at = new Date();
    const d = dashboardFrom(overviewOf(await snapshot(ctx, at)), at);
    expect(d.empty).toBe(false);
    expect(d.metrics.revenue).toMatchObject({ value: '₹18,000', note: '1 payment' });
    expect(d.metrics.overdue).toMatchObject({ value: '₹1,00,000', note: '1 invoice' });
    expect(d.metrics.pending).toMatchObject({ note: '0 invoices' });
    expect(d.metrics.pipeline).toMatchObject({
      value: '₹2.5 L',
      note: 'Win rate 50% (90 days)',
    });
    expect(d.atRisk).toEqual([
      expect.objectContaining({
        id: project,
        client: 'Example Northwind',
        why: expect.stringContaining('1 task overdue'),
      }),
    ]);
    expect(d.teamLoad).toEqual([{ id: ctx.session.userId, name: 'Kiran Rao', open: 1 }]);
  });

  it('lists what needs doing today: the follow-up, my late task, the approval and the invoice', async () => {
    const at = new Date();
    const items = todayFrom(overviewOf(await snapshot(ctx, at)), 'one-stop', at);
    expect(items.map((i) => [i.group, i.overdue])).toEqual([
      ['Follow-ups', true],
      ['Tasks', true],
      ['Approvals waiting', false],
      ['Invoices', true],
    ]);
    expect(items.map((i) => i.title)).toEqual([
      'Follow up Example Kite',
      'Homepage wireframe',
      'Proposal accepted',
      expect.stringMatching(/^OSS\/\d\d-\d\d\/001 · ₹1,00,000\.00$/),
    ]);
    expect(items[3]!.href).toMatch(/^\/w\/one-stop\/invoices\//);
  });

  it('ticks the setup steps from real records, and hides or brings the checklist back', async () => {
    let o = await onboardingFor(ctx);
    expect(Object.fromEntries(o.steps.map((x) => [x.id, x.done]))).toEqual({
      services: false,
      lead: true,
      quote: false,
      portal: false,
      invoice: true,
    });
    expect(o).toMatchObject({ done: 2, show: true, dismissed: false, hasExample: false });
    await setDismissed(ctx, true);
    o = await onboardingFor(ctx);
    expect(o).toMatchObject({ show: false, dismissed: true });
    await setDismissed(ctx, false);
    expect((await onboardingFor(ctx)).show).toBe(true);
  });
});
