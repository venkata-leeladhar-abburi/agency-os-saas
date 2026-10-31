// Example data in a real workspace (TEST_DATABASE_URL): loaded by an owner, labelled on every
// screen, never counted as the workspace's own work, and removed in one go.
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
import { invoiceRows } from './invoices';
import { onboardingFor, loadExamplesFor, removeExamplesFor } from './onboarding';
import { clientList, leadList } from './people';
import { projectList } from './work';

const run = describe.skipIf(!process.env.TEST_DATABASE_URL);
let t: TestDb;
let owner: WorkspaceCtx;
let member: WorkspaceCtx;

run('example data on the database', () => {
  beforeAll(async () => {
    vi.stubEnv('LINK_SIGNING_SECRET', randomBytes(32).toString('hex'));
    t = await createTestDb();
    const kiran: Session = {
      userId: await t.createUser('kiran@onestop.in'),
      email: 'kiran@onestop.in',
    };
    const arjun: Session = {
      userId: await t.createUser('arjun@onestop.in'),
      email: 'arjun@onestop.in',
    };
    const ws = await withUser(t.db, kiran, (tx) =>
      createWorkspace(tx, { name: 'One Stop Solutions', slug: 'one-stop' }),
    );
    await t.admin`update workspaces set plan = 'growth' where id = ${ws}`;
    await t.admin`update profiles set full_name = 'Kiran Rao' where id = ${kiran.userId}`;
    const { token } = await withUser(t.db, kiran, (tx) =>
      inviteMember(tx, {
        workspaceId: ws,
        email: arjun.email!,
        role: 'member',
        invitedBy: kiran.userId,
      }),
    );
    await withUser(t.db, arjun, (tx) => acceptInvitation(tx, token));
    owner = {
      db: t.db,
      session: kiran,
      workspaceId: ws,
      slug: 'one-stop',
      role: 'owner',
      plan: 'growth',
    };
    member = { ...owner, session: arjun, role: 'member' };
  }, 60_000);

  afterAll(async () => {
    vi.unstubAllEnvs();
    await t?.drop();
  });

  it('offers it to owners only, loads it labelled, and the checklist still counts only your work', async () => {
    expect(await onboardingFor(owner)).toMatchObject({
      hasExample: false,
      canManageExamples: true,
    });
    expect(await onboardingFor(member)).toMatchObject({ canManageExamples: false });
    await expect(loadExamplesFor(member)).rejects.toMatchObject({ code: 'no_access' });
    expect(await loadExamplesFor(owner)).toBe(10);

    const leads = await leadList(owner);
    expect(leads.map((l) => l.company).sort()).toEqual([
      'Kite & Co',
      'Lumen Foods',
      'Mitra Clinic',
      'Northwind',
    ]);
    expect(leads.every((l) => l.example)).toBe(true);
    expect((await clientList(owner)).map((c) => [c.client.name, c.client.example])).toEqual([
      ['Acme Labs', true],
    ]);
    expect((await projectList(owner)).map((p) => p.project.name)).toEqual(['Website redesign']);
    expect((await invoiceRows(owner)).map((i) => [i.number, i.status])).toEqual([
      ['Draft', 'draft'],
    ]);

    const o = await onboardingFor(owner);
    expect(o).toMatchObject({ hasExample: true, allExamples: true });
    expect(o.steps.find((s) => s.id === 'lead')!.done).toBe(false);
    expect(o.steps.find((s) => s.id === 'invoice')!.done).toBe(false);
  });

  it('removes it in one go, leaving an empty workspace', async () => {
    expect(await removeExamplesFor(owner)).toEqual({ removed: 10, kept: [] });
    expect(await leadList(owner)).toEqual([]);
    expect(await clientList(owner)).toEqual([]);
    expect(await onboardingFor(owner)).toMatchObject({ hasExample: false });
  });
});
