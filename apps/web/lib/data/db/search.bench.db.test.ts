// The command palette at 10,000 records (PRD E0.3: results in under 300 ms). Slow to seed (about
// 7 minutes), so it runs only with BENCH=1 and TEST_DATABASE_URL:
//   BENCH=1 pnpm vitest run search.bench
// BENCH_KEEP=1 keeps the seeded database and prints how to reuse it (BENCH_DB_URL and BENCH_IDS).
import { randomBytes } from 'node:crypto';
import {
  connect,
  createClient,
  createInvoice,
  createLead,
  createProject,
  createTask,
  createWorkspace,
  withUser,
  type Session,
} from '@agency-os/db';
import { createTestDb, type TestDb } from '@agency-os/db/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { WorkspaceCtx } from '../../server/workspace';
import { invoiceRows } from './invoices';
import { clientList, leadList } from './people';
import { salesItems } from './sales';
import { searchFor } from './search';
import { snapshot } from './snapshot';
import { projectList, taskList } from './work';

const run = describe.skipIf(!process.env.TEST_DATABASE_URL || !process.env.BENCH);
let t: TestDb | undefined;
let close: (() => Promise<void>) | undefined;
let ctx: WorkspaceCtx;

const COUNTS = { leads: 4000, clients: 2000, projects: 200, tasks: 2800, invoices: 1000 };

/** Straight to the terminal: vitest hides a passing test's console. */
const log = (...parts: unknown[]) =>
  process.stderr.write(
    `${parts.map((p) => (typeof p === 'string' ? p : JSON.stringify(p))).join(' ')}\n`,
  );

const time = async <T>(fn: () => Promise<T>) => {
  const start = performance.now();
  const value = await fn();
  return { value, ms: Math.round(performance.now() - start) };
};

run('the command palette at 10,000 records', () => {
  beforeAll(async () => {
    vi.stubEnv('LINK_SIGNING_SECRET', randomBytes(32).toString('hex'));
    const reuse = process.env.BENCH_DB_URL;
    if (reuse) {
      const conn = connect(reuse);
      close = conn.close;
      const [workspaceId, userId] = (process.env.BENCH_IDS ?? '').split(':');
      const kiran: Session = { userId: userId!, email: 'kiran@onestop.in' };
      ctx = {
        db: conn.db,
        session: kiran,
        workspaceId: workspaceId!,
        slug: 'one-stop',
        role: 'owner',
        plan: 'enterprise',
      };
      return;
    }
    t = await createTestDb();
    const tdb = t;
    const kiran: Session = {
      userId: await tdb.createUser('kiran@onestop.in'),
      email: 'kiran@onestop.in',
    };
    const ws = await withUser(tdb.db, kiran, (tx) =>
      createWorkspace(tx, { name: 'One Stop Solutions', slug: 'one-stop' }),
    );
    await tdb.admin`update workspaces set plan = 'enterprise', gstin = '36AAACO1234A1Z5', state_code = '36' where id = ${ws}`;
    ctx = {
      db: t.db,
      session: kiran,
      workspaceId: ws,
      slug: 'one-stop',
      role: 'owner',
      plan: 'enterprise',
    };
    const seeded = await time(() =>
      withUser(tdb.db, kiran, async (tx) => {
        for (let i = 0; i < COUNTS.leads; i++)
          await createLead(
            tx,
            ws,
            {
              name: `Example Lead ${i}`,
              company: `Example Co ${i}`,
              email: `lead${i}@example.com`,
            },
            kiran.userId,
          );
        const clientIds: string[] = [];
        for (let i = 0; i < COUNTS.clients; i++)
          clientIds.push(
            await createClient(
              tx,
              ws,
              { name: `Example Client ${i}`, stateCode: '36' },
              kiran.userId,
            ),
          );
        const projectIds: string[] = [];
        for (let i = 0; i < COUNTS.projects; i++)
          projectIds.push(
            await createProject(
              tx,
              ws,
              { clientId: clientIds[i]!, name: `Example Project ${i}`, leadMemberId: kiran.userId },
              kiran.userId,
            ),
          );
        for (let i = 0; i < COUNTS.tasks; i++)
          await createTask(
            tx,
            ws,
            { projectId: projectIds[i % COUNTS.projects]!, title: `Example Task ${i}` },
            kiran.userId,
          );
        for (let i = 0; i < COUNTS.invoices; i++)
          await createInvoice(
            tx,
            ws,
            {
              clientId: clientIds[i]!,
              dueOn: '2026-12-01',
              items: [
                {
                  description: 'Design',
                  sacCode: '998314',
                  quantity: 1,
                  rateMinor: 1_000_000n,
                  taxRateBp: 1800,
                },
              ],
            },
            kiran.userId,
          );
      }),
    );
    log(`seeded 10,000 records in ${seeded.ms} ms`);
    if (process.env.BENCH_KEEP)
      log(`kept: BENCH_DB_URL=${tdb.url} BENCH_IDS=${ws}:${kiran.userId}`);
  }, 900_000);

  afterAll(async () => {
    vi.unstubAllEnvs();
    await close?.();
    if (process.env.BENCH_KEEP) await t?.close();
    else await t?.drop();
  });

  it('times each part', async () => {
    for (const [name, fn] of [
      ['leads', () => leadList(ctx)],
      ['clients', () => clientList(ctx)],
      ['projects', () => projectList(ctx)],
      ['tasks', () => taskList(ctx)],
      ['invoice rows', () => invoiceRows(ctx)],
      ['sales', () => salesItems(ctx)],
      ['snapshot', () => snapshot(ctx)],
    ] as const) {
      const { value, ms } = await time(fn as () => Promise<unknown>);
      log(`${name}: ${ms} ms (${Array.isArray(value) ? value.length : 'object'})`);
    }
    // Nothing is left out at this size (lists used to stop at 1,000).
    const s = await snapshot(ctx);
    expect([
      s.leads.length,
      s.clients.length,
      s.projects.length,
      s.tasks.length,
      s.invoices.length,
    ]).toEqual([COUNTS.leads, COUNTS.clients, COUNTS.projects, COUNTS.tasks, COUNTS.invoices]);
  }, 600_000);

  it('answers the palette in under 300 ms, whatever is typed', async () => {
    // Words that match thousands of records, a few, one, none; an email; a phone's digits.
    for (const q of [
      'example',
      'lead 39',
      'Example Client 1999',
      'nothing like it',
      'lead3999@',
      '98480',
    ]) {
      await searchFor(ctx, 'one-stop', q); // warm
      const runs: number[] = [];
      let found = 0;
      for (let i = 0; i < 5; i++) {
        const { value, ms } = await time(() => searchFor(ctx, 'one-stop', q));
        runs.push(ms);
        found = value.length;
      }
      const worst = Math.max(...runs);
      log(`search "${q}": ${found} results, worst of 5 ${worst} ms`);
      expect(worst).toBeLessThan(300);
    }
  }, 600_000);
});
