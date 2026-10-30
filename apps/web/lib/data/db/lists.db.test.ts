// Search, leads CSV and the plan page on the database (TEST_DATABASE_URL): the member's own
// records, the workspace's own stages, and the counts the database checks before each "add".
import { randomBytes } from 'node:crypto';
import { parseCsv } from '@agency-os/core';
import { createWorkspace, withUser, type Session } from '@agency-os/db';
import { createTestDb, type TestDb } from '@agency-os/db/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { WorkspaceCtx } from '../../server/workspace';
import { importLeadsFor } from './lead-import';
import { createClientFor, createLeadFor, leadList } from './people';
import { planOverviewFor } from './plan';
import { profileFor, saveProfileFor } from './profile';
import { deleteViewFor, savedViewsFor, saveViewFor } from './saved-views';
import { searchIndexFor } from './search';

const run = describe.skipIf(!process.env.TEST_DATABASE_URL);
let t: TestDb;
let ctx: WorkspaceCtx;

const csv = `Name,Company,Email,Phone,Source,Value,Service,Stage
Example Meera Iyer,Example Kite & Co,meera@kite.example,,Referral,"40,000",Website,Contacted
Example Omar Shaikh,Example Orbit Fitness,omar@orbit.example,,Instagram,,Mobile app,
Example Duplicate,Example Lumen Foods,lakshmi@lumen.example,,Referral,,Website,
Example Gone,Example Gone Ltd,gone@gone.example,,Referral,,Website,Lost
,,,,,,,`;

run('search, leads CSV and the plan page on the database', () => {
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
    await t.admin`update profiles set full_name = 'Kiran Rao' where id = ${kiran.userId}`;
    ctx = {
      db: t.db,
      session: kiran,
      workspaceId: ws,
      slug: 'one-stop',
      role: 'owner',
      plan: 'free',
    };
    await createLeadFor(ctx, {
      name: 'Example Lakshmi Iyer',
      company: 'Example Lumen Foods',
      email: 'lakshmi@lumen.example',
      phone: null,
      source: 'referral',
      service: 'Brand identity',
      valueMinor: 15_000_000n,
      followUpOn: null,
      notes: '',
    });
    await createClientFor(ctx, {
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
  }, 60_000);

  afterAll(async () => {
    vi.unstubAllEnvs();
    await t?.drop();
  });

  it('imports new leads into the workspace’s own stages, skipping duplicates and lost leads', async () => {
    const [header, ...rows] = parseCsv(csv);
    const col = (name: string) => header!.indexOf(name);
    const result = await importLeadsFor(
      ctx,
      rows,
      {
        name: col('Name'),
        company: col('Company'),
        email: col('Email'),
        phone: col('Phone'),
        source: col('Source'),
        value: col('Value'),
        service: col('Service'),
        stage: col('Stage'),
      },
      Infinity,
    );
    expect(result.imported).toBe(2);
    expect(result.skipped.map((s) => [s.row, s.reasons[0]])).toEqual([
      [4, 'Already a lead (same email).'],
      [5, 'Add lost leads by hand, so they keep their reason.'],
    ]);
    const leads = await leadList(ctx);
    expect(leads.find((l) => l.company === 'Example Kite & Co')).toMatchObject({
      stage: 'contacted',
      valueMinor: 4_000_000n,
      source: 'referral',
      owner: 'Kiran Rao',
    });
  });

  it('stops at the plan’s room for open leads', async () => {
    const result = await importLeadsFor(
      ctx,
      [['Example Tara', 'Example Tara Textiles', 'tara@tara.example']],
      { name: 0, company: 1, email: 2 },
      0,
    );
    expect(result).toMatchObject({ imported: 0 });
    expect(result.skipped[0]!.reasons[0]).toMatch(/limit of open leads/);
  });

  it('searches the member’s own records, not the example data', async () => {
    const index = await searchIndexFor(ctx, 'one-stop');
    expect(index.map((i) => [i.kind, i.label]).sort()).toEqual([
      ['client', 'Example Acme Labs'],
      ['lead', 'Example Kite & Co'],
      ['lead', 'Example Lumen Foods'],
      ['lead', 'Example Orbit Fitness'],
    ]);
    expect(index.find((i) => i.kind === 'client')!.href).toMatch(/^\/w\/one-stop\/clients\//);
  });

  it('shows the plan and what it has used, from the database’s own counts', async () => {
    const o = await planOverviewFor(ctx);
    expect(o.plan).toBe('free');
    expect(o.rows.find((r) => r.resource === 'open_leads')).toEqual({
      resource: 'open_leads',
      used: 3,
      limit: 25,
    });
    expect(o.rows.find((r) => r.resource === 'members')).toMatchObject({ used: 1, limit: 1 });
  });

  it('keeps your saved views on the leads page', async () => {
    await saveViewFor(ctx, 'leads', 'Referrals', 'source=referral');
    await saveViewFor(ctx, 'leads', 'Due', 'due=1');
    const views = await savedViewsFor(ctx, 'leads');
    expect(views.map((v) => v.name)).toEqual(['Due', 'Referrals']);
    expect(await deleteViewFor(ctx, views[0]!.id)).toBe(true);
    expect(await savedViewsFor(ctx, 'leads')).toEqual([
      { id: expect.any(String), name: 'Referrals', query: 'source=referral' },
    ]);
  });

  it('shows and saves your own profile', async () => {
    expect(await profileFor(ctx)).toEqual({
      name: 'Kiran Rao',
      phone: null,
      email: 'kiran@onestop.in',
    });
    await saveProfileFor(ctx, { name: 'Kiran Kumar Rao', phone: '+919848022338' });
    expect(await profileFor(ctx)).toMatchObject({
      name: 'Kiran Kumar Rao',
      phone: '+919848022338',
    });
  });
});
