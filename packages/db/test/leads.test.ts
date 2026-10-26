import {
  guessLeadMapping,
  parseCsv,
  toLeadImport,
  toCsv,
  type LeadImportRow,
} from '@agency-os/core';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { acceptInvitation, createWorkspace, inviteMember } from '../src/accounts';
import { withUser, type Session } from '../src/client';
import {
  addLeadActivity,
  addStage,
  createEnquiryForm,
  createLead,
  deleteLead,
  deleteStage,
  exportLeads,
  followUpsDue,
  importLeads,
  leadActivities,
  leadBoard,
  listLeads,
  listStages,
  moveLead,
  moveStage,
  renameStage,
  restoreLead,
  setFollowUp,
  submitEnquiry,
  updateLead,
} from '../src/leads';
import { exportWorkspace, listNotifications } from '../src/platform';
import { activities, leads, pipelineStages } from '../src/schema';
import { createTestDb, type TestDb } from './db';

let t: TestDb;
let owner: Session;
let finance: Session;
let member: Session;
let outsider: Session;
let ws: string;
let other: string;

const as = <T>(s: Session, fn: Parameters<typeof withUser<T>>[2]) => withUser(t.db, s, fn);
const pgError = (pattern: RegExp) => ({
  cause: expect.objectContaining({ message: expect.stringMatching(pattern) }),
});
const denied = pgError(/row-level security/);
const stageId = async (name: string, workspace = ws, s = owner) =>
  (await as(s, (tx) => listStages(tx, workspace))).find((x) => x.name === name)!.id;
// Monday 26 Oct 2026, 15:00 in India.
const monday = new Date('2026-10-26T09:30:00Z');
const add = (name: string, extra: Parameters<typeof createLead>[2] = {}) =>
  as(owner, (tx) =>
    createLead(
      tx,
      ws,
      { name, email: `${name.toLowerCase().replace(/\W/g, '')}@example.com`, ...extra },
      owner.userId,
      { now: monday },
    ),
  );

beforeAll(async () => {
  t = await createTestDb();
  owner = { userId: await t.createUser('kiran@onestop.in'), email: 'kiran@onestop.in' };
  finance = { userId: await t.createUser('meera@onestop.in'), email: 'meera@onestop.in' };
  member = { userId: await t.createUser('arjun@onestop.in'), email: 'arjun@onestop.in' };
  outsider = {
    userId: await t.createUser('sarah@northwind.example'),
    email: 'sarah@northwind.example',
  };
  ws = await as(owner, (tx) => createWorkspace(tx, { name: 'One Stop Solutions' }));
  other = await as(outsider, (tx) =>
    createWorkspace(tx, { name: 'Northwind Studio', country: 'GB' }),
  );
  await t.admin`update workspaces set plan = 'growth' where id = ${ws}`;
  for (const [s, role] of [
    [finance, 'finance'],
    [member, 'member'],
  ] as const) {
    const { token } = await as(owner, (tx) =>
      inviteMember(tx, { workspaceId: ws, email: s.email!, role, invitedBy: owner.userId }),
    );
    await as(s, (tx) => acceptInvitation(tx, token));
  }
}, 60_000);

afterAll(async () => {
  await t?.drop();
});

describe('stages', () => {
  it('gives every new workspace the default pipeline', async () => {
    const stages = await as(owner, (tx) => listStages(tx, ws));
    expect(stages.map((s) => [s.name, s.kind])).toEqual([
      ['New', 'open'],
      ['Contacted', 'open'],
      ['Proposal', 'open'],
      ['Won', 'won'],
      ['Lost', 'lost'],
    ]);
    expect(await as(outsider, (tx) => listStages(tx, other))).toHaveLength(5);
  });

  it('adds open stages before Won, renames, reorders and removes them', async () => {
    const id = await as(owner, (tx) => addStage(tx, ws, ' Negotiation '));
    let names = (await as(owner, (tx) => listStages(tx, ws))).map((s) => s.name);
    expect(names).toEqual(['New', 'Contacted', 'Proposal', 'Negotiation', 'Won', 'Lost']);
    const newStage = await stageId('New');
    const after = await as(owner, (tx) => addStage(tx, ws, 'Qualified', newStage));
    expect(await as(owner, (tx) => renameStage(tx, after, 'Qualified lead'))).toBe(true);
    await as(owner, async (tx) => moveStage(tx, id, { before: null, after: await stageId('New') }));
    names = (await as(owner, (tx) => listStages(tx, ws))).map((s) => s.name);
    expect(names).toEqual([
      'Negotiation',
      'New',
      'Qualified lead',
      'Contacted',
      'Proposal',
      'Won',
      'Lost',
    ]);
    expect(await as(owner, (tx) => deleteStage(tx, id))).toBe(true);
    expect(await as(owner, (tx) => deleteStage(tx, after))).toBe(true);
  });

  it('keeps Won and Lost fixed', async () => {
    const lost = await stageId('Lost');
    await expect(as(owner, (tx) => deleteStage(tx, lost))).rejects.toMatchObject({
      code: 'stage_fixed',
    });
    await expect(
      as(owner, (tx) =>
        tx
          .insert(pipelineStages)
          .values({ workspaceId: ws, name: 'Won again', position: 'b0', kind: 'won' }),
      ),
    ).rejects.toMatchObject(pgError(/stage_fixed/));
    await expect(
      as(owner, (tx) =>
        tx.update(pipelineStages).set({ kind: 'open' }).where(eq(pipelineStages.id, lost)),
      ),
    ).rejects.toMatchObject(pgError(/stage_fixed/));
    expect(await as(owner, (tx) => renameStage(tx, lost, 'Lost'))).toBe(true);
  });

  it('lets only leads.write change stages', async () => {
    const newStage = await stageId('New', ws, finance);
    expect(await as(finance, (tx) => renameStage(tx, newStage, 'Mine'))).toBe(false);
    await expect(as(finance, (tx) => addStage(tx, ws, 'Finance stage'))).rejects.toMatchObject(
      denied,
    );
    expect(await as(member, (tx) => listStages(tx, ws))).toHaveLength(5);
  });
});

describe('adding leads', () => {
  it('puts a new lead at the top of New with the default follow-up', async () => {
    const first = await add('Example Lead One', {
      company: 'Kite & Co',
      valueMinor: 48_600_000n,
      source: 'instagram',
    });
    const second = await add('Example Lead Two');
    const [lead] = await as(owner, (tx) => tx.select().from(leads).where(eq(leads.id, first)));
    expect(lead).toMatchObject({
      stageId: await stageId('New'),
      ownerId: owner.userId,
      currency: 'INR',
      email: 'exampleleadone@example.com',
      source: 'instagram',
      createdBy: owner.userId,
    });
    // Next working day at 11:00 IST.
    expect(lead!.nextFollowUpAt!.toISOString()).toBe('2026-10-27T05:30:00.000Z');
    const board = await as(owner, (tx) => leadBoard(tx, ws));
    expect(board[0]!.leads.map((l) => l.id)).toEqual([second, first]);
    expect(await as(owner, (tx) => leadActivities(tx, ws, first))).toEqual([
      expect.objectContaining({ kind: 'created', actorId: owner.userId }),
    ]);
  });

  it('needs a name or company and a way to reach them', async () => {
    await expect(
      as(owner, (tx) => createLead(tx, ws, { email: 'x@example.com' }, owner.userId)),
    ).rejects.toMatchObject({ code: 'lead_name_required' });
    await expect(
      as(owner, (tx) => createLead(tx, ws, { name: 'No contact' }, owner.userId)),
    ).rejects.toMatchObject({ code: 'lead_contact_required' });
    const id = await as(owner, (tx) =>
      createLead(
        tx,
        ws,
        { company: 'Lumen Foods', phone: '+91 98765 43210', nextFollowUpAt: null },
        owner.userId,
      ),
    );
    const [lead] = await t.admin`select name, next_follow_up_at from leads where id = ${id}`;
    expect(lead).toMatchObject({ name: 'Lumen Foods', next_follow_up_at: null });
    expect((await t.admin`select phone from leads where id = ${id}`)[0]!.phone).toBe(
      '+919876543210',
    );
  });

  it('refuses a stage from another workspace', async () => {
    const theirs = await stageId('New', other, outsider);
    await expect(
      as(owner, (tx) =>
        createLead(tx, ws, { name: 'X', email: 'x@example.com', stageId: theirs }, owner.userId),
      ),
    ).rejects.toMatchObject({
      code: 'stage_not_found',
    });
    await expect(
      as(owner, (tx) =>
        tx
          .insert(leads)
          .values({ workspaceId: ws, stageId: theirs, position: 'a0', name: 'X', currency: 'INR' }),
      ),
    ).rejects.toMatchObject(pgError(/stage_not_found/));
  });
});

describe('moving leads', () => {
  it('needs a lost reason (and a note for Other), then clears the follow-up', async () => {
    const id = await add('Example Lost Lead');
    const lost = await stageId('Lost');
    await expect(
      as(owner, (tx) => moveLead(tx, { leadId: id, stageId: lost, actorId: owner.userId })),
    ).rejects.toMatchObject({
      code: 'lost_reason_required',
    });
    await expect(
      as(owner, (tx) =>
        moveLead(tx, { leadId: id, stageId: lost, lostReason: 'other', actorId: owner.userId }),
      ),
    ).rejects.toMatchObject({
      code: 'lost_note_required',
    });
    await as(owner, (tx) =>
      moveLead(tx, { leadId: id, stageId: lost, lostReason: 'price', actorId: owner.userId }),
    );
    const [lead] = await t.admin`select lost_reason, next_follow_up_at from leads where id = ${id}`;
    expect(lead).toMatchObject({ lost_reason: 'price', next_follow_up_at: null });
    const [move] = await as(owner, (tx) => leadActivities(tx, ws, id));
    expect(move).toMatchObject({
      kind: 'stage_change',
      meta: { from: 'New', to: 'Lost', lostReason: 'price' },
    });
    // Back to open: the lost reason goes.
    await as(owner, async (tx) =>
      moveLead(tx, { leadId: id, stageId: await stageId('Contacted'), actorId: owner.userId }),
    );
    expect(
      (await t.admin`select lost_reason from leads where id = ${id}`)[0]!.lost_reason,
    ).toBeNull();
  });

  it('orders cards between their neighbours, and reordering is not a stage change', async () => {
    const proposal = await stageId('Proposal');
    const [a, b, c] = [await add('Example A'), await add('Example B'), await add('Example C')];
    for (const id of [a, b])
      await as(owner, (tx) =>
        moveLead(tx, { leadId: id, stageId: proposal, actorId: owner.userId }),
      );
    // Proposal is now [b, a]. Put c between them.
    await as(owner, (tx) =>
      moveLead(tx, { leadId: c, stageId: proposal, before: b, after: a, actorId: owner.userId }),
    );
    const column = (await as(owner, (tx) => leadBoard(tx, ws))).find(
      (col) => col.stage.id === proposal,
    )!;
    expect(column.leads.map((l) => l.id)).toEqual([b, c, a]);
    await as(owner, (tx) =>
      moveLead(tx, { leadId: b, stageId: proposal, before: a, after: null, actorId: owner.userId }),
    );
    const again = (await as(owner, (tx) => leadBoard(tx, ws))).find(
      (col) => col.stage.id === proposal,
    )!;
    expect(again.leads.map((l) => l.id)).toEqual([c, a, b]);
    expect(
      (await as(owner, (tx) => leadActivities(tx, ws, b))).filter((x) => x.kind === 'stage_change'),
    ).toHaveLength(1);
  });
});

describe('the board, table and Today', () => {
  it('totals each column by count and value', async () => {
    const won = await stageId('Won');
    const x = await add('Example Won One', { valueMinor: 10_000_000n });
    const y = await add('Example Won Two', { valueMinor: 5_050_000n });
    const z = await add('Example Won Dollars', { valueMinor: 120_000n, currency: 'USD' });
    for (const id of [x, y, z])
      await as(owner, (tx) => moveLead(tx, { leadId: id, stageId: won, actorId: owner.userId }));
    const column = (await as(owner, (tx) => leadBoard(tx, ws))).find(
      (col) => col.stage.id === won,
    )!;
    expect(column.count).toBe(3);
    expect(column.totals).toEqual(
      expect.arrayContaining([
        { currency: 'INR', valueMinor: 15_050_000n },
        { currency: 'USD', valueMinor: 120_000n },
      ]),
    );
  });

  it('filters by search, source and owner', async () => {
    expect(
      (await as(owner, (tx) => listLeads(tx, ws, { search: 'kite' }))).map((r) => r.lead.company),
    ).toEqual(['Kite & Co']);
    expect(await as(owner, (tx) => listLeads(tx, ws, { search: '98765 43210' }))).toHaveLength(1);
    expect(await as(owner, (tx) => listLeads(tx, ws, { search: '100%' }))).toEqual([]);
    expect(
      (await as(owner, (tx) => listLeads(tx, ws, { sources: ['instagram'] }))).map(
        (r) => r.lead.source,
      ),
    ).toEqual(['instagram']);
    expect(await as(owner, (tx) => listLeads(tx, ws, { ownerId: finance.userId }))).toEqual([]);
    const byValue = await as(owner, (tx) => listLeads(tx, ws, { sort: 'value', limit: 1 }));
    expect(byValue[0]!.lead.valueMinor).toBe(48_600_000n);
    expect(
      (await as(owner, (tx) => listLeads(tx, ws, { sort: 'name', limit: 1 })))[0]!.lead.name,
    ).toBe('Example A');
  });

  it('lists follow-ups due, and logs when one is set or done', async () => {
    const due = await as(owner, (tx) => followUpsDue(tx, ws, new Date('2026-10-27T23:59:00Z')));
    expect(due.length).toBeGreaterThan(3);
    const id = due[0]!.id;
    await as(owner, (tx) => setFollowUp(tx, id, new Date('2026-11-05T05:30:00Z'), owner.userId));
    await as(owner, (tx) => setFollowUp(tx, id, null, owner.userId));
    const kinds = (await as(owner, (tx) => leadActivities(tx, ws, id))).map((a) => a.kind);
    expect(kinds.slice(0, 2)).toEqual(['follow_up_done', 'follow_up_set']);
    expect(
      await as(owner, (tx) => followUpsDue(tx, ws, new Date('2027-01-01'), member.userId)),
    ).toEqual([]);
  });

  it('logs notes and calls on the timeline', async () => {
    const id = await add('Example Timeline');
    await as(owner, (tx) =>
      addLeadActivity(tx, {
        workspaceId: ws,
        leadId: id,
        kind: 'call',
        body: 'Asked for a quote by Friday.',
        actorId: owner.userId,
      }),
    );
    expect((await as(finance, (tx) => leadActivities(tx, ws, id)))[0]).toMatchObject({
      kind: 'call',
      body: 'Asked for a quote by Friday.',
    });
  });
});

describe('access', () => {
  it('lets finance read leads but not change them', async () => {
    const [row] = await as(finance, (tx) => listLeads(tx, ws, { limit: 1 }));
    expect(row).toBeDefined();
    await expect(
      as(finance, (tx) => updateLead(tx, row!.lead.id, { name: 'Changed' })),
    ).rejects.toMatchObject({ code: 'lead_not_found' });
    await expect(
      as(finance, (tx) =>
        createLead(tx, ws, { name: 'X', email: 'x@example.com' }, finance.userId),
      ),
    ).rejects.toMatchObject(denied);
  });

  it('hides leads from members without leads.read and from other workspaces', async () => {
    expect(await as(member, (tx) => listLeads(tx, ws))).toEqual([]);
    expect(await as(member, (tx) => tx.select().from(activities))).toEqual([]);
    expect(await as(outsider, (tx) => tx.select().from(leads))).toEqual([]);
    expect(await as(outsider, (tx) => leadBoard(tx, ws))).toEqual([]);
  });

  it('keeps the timeline append-only and inside the workspace', async () => {
    const [row] = await as(owner, (tx) => listLeads(tx, ws, { limit: 1 }));
    await expect(
      as(owner, (tx) => tx.update(activities).set({ body: 'edited' })),
    ).rejects.toMatchObject(pgError(/permission denied/));
    await expect(
      as(outsider, (tx) =>
        addLeadActivity(tx, {
          workspaceId: other,
          leadId: row!.lead.id,
          kind: 'note',
          body: 'x',
          actorId: outsider.userId,
        }),
      ),
    ).rejects.toMatchObject(denied);
    await expect(
      as(owner, (tx) =>
        addLeadActivity(tx, {
          workspaceId: ws,
          leadId: row!.lead.id,
          kind: 'note',
          body: 'x',
          actorId: finance.userId,
        }),
      ),
    ).rejects.toMatchObject(denied);
  });

  it('deletes to the trash with leads.delete only, and restores', async () => {
    const id = await add('Example Trash');
    await expect(as(finance, (tx) => deleteLead(tx, id))).rejects.toMatchObject({
      code: 'no_access',
    });
    await as(owner, (tx) => deleteLead(tx, id));
    expect(await as(owner, (tx) => listLeads(tx, ws, { search: 'Example Trash' }))).toEqual([]);
    await as(owner, (tx) => restoreLead(tx, id));
    expect(await as(owner, (tx) => listLeads(tx, ws, { search: 'Example Trash' }))).toHaveLength(1);
    await expect(
      as(owner, (tx) => deleteLead(tx, '00000000-0000-7000-8000-000000000000')),
    ).rejects.toMatchObject({ code: 'lead_not_found' });
  });
});

describe('plan limit for open leads', () => {
  it('stops Free at 25 open leads; won and lost leads do not count', async () => {
    const free = await as(outsider, (tx) => createWorkspace(tx, { name: 'Example Free Studio' }));
    const mk = (n: number) =>
      as(outsider, (tx) =>
        createLead(
          tx,
          free,
          { name: `Example ${n}`, phone: `+9198765432${String(n).padStart(2, '0')}` },
          outsider.userId,
        ),
      );
    const ids: string[] = [];
    for (let n = 0; n < 25; n++) ids.push(await mk(n));
    await expect(mk(25)).rejects.toMatchObject({
      code: 'plan_limit',
      message: 'Your Free plan includes 25 open leads. Upgrade to Agency Starter to add more.',
    });
    const won = await stageId('Won', free, outsider);
    await as(outsider, (tx) =>
      moveLead(tx, { leadId: ids[0]!, stageId: won, actorId: outsider.userId }),
    );
    await mk(25);
    await expect(
      as(outsider, async (tx) =>
        moveLead(tx, {
          leadId: ids[0]!,
          stageId: await stageId('New', free, outsider),
          actorId: outsider.userId,
        }),
      ),
    ).rejects.toMatchObject({ code: 'plan_limit' });
    const rows: LeadImportRow[] = [
      {
        name: 'Example Import',
        company: null,
        email: 'i@example.com',
        phone: null,
        source: 'other',
        valueMinor: null,
        service: null,
        stage: null,
        notes: null,
      },
    ];
    await expect(
      as(outsider, (tx) => importLeads(tx, free, rows, outsider.userId)),
    ).rejects.toMatchObject({ code: 'plan_limit' });
  });
});

describe('import and export', () => {
  it('imports checked CSV rows into the matching stages', async () => {
    const csv =
      'Name,Company,Email,Phone,Source,Budget,Stage\n' +
      'Example Import One,Northwind,one@example.com,,LinkedIn,4.86 L,Contacted\n' +
      'Example Import Two,,,+44 20 7946 0000,Referral,,Somewhere else\n';
    const [headers, ...body] = parseCsv(csv);
    const mapping = guessLeadMapping(headers!);
    const rows = body
      .map((r) => toLeadImport(r, mapping, 'INR'))
      .flatMap((r) => (r.ok ? [r.lead] : []));
    expect(rows).toHaveLength(2);
    expect(await as(owner, (tx) => importLeads(tx, ws, rows, owner.userId))).toEqual({
      created: 2,
    });
    expect(await as(owner, (tx) => importLeads(tx, ws, [], owner.userId))).toEqual({ created: 0 });
    const one = (await as(owner, (tx) => listLeads(tx, ws, { search: 'Example Import One' })))[0]!;
    expect(one).toMatchObject({
      stageName: 'Contacted',
      lead: { source: 'linkedin', valueMinor: 48_600_000n },
    });
    const two = (await as(owner, (tx) => listLeads(tx, ws, { search: 'Example Import Two' })))[0]!;
    expect(two.stageName).toBe('New');
    expect((await as(owner, (tx) => leadActivities(tx, ws, two.lead.id)))[0]).toMatchObject({
      kind: 'created',
      meta: { via: 'import' },
    });
  });

  it('exports leads as rows people can read', async () => {
    const rows = await as(owner, (tx) => exportLeads(tx, ws));
    const kite = rows.find((r) => r.company === 'Kite & Co')!;
    expect(kite).toMatchObject({
      stage: 'New',
      source: 'Instagram',
      value: '486000.00',
      currency: 'INR',
    });
    expect(toCsv(rows)).toContain('Kite & Co');
    const all = await as(owner, (tx) => exportWorkspace(tx, ws, owner.userId));
    expect(all.tables.leads!.length).toBe(rows.length);
    expect(all.tables.pipeline_stages).toHaveLength(5);
  });
});

describe('enquiry form', () => {
  it('creates a Website lead without an owner and tells the owners', async () => {
    const { token } = await as(owner, (tx) => createEnquiryForm(tx, ws));
    const id = await submitEnquiry(
      t.db,
      token,
      {
        name: 'Example Enquirer',
        email: 'Hello@Example.com',
        service: 'Website',
        budget: '₹1–2 L',
        message: 'We need a new site.',
        consent: true,
      },
      monday,
    );
    const [lead] = await t.admin`select * from leads where id = ${id}`;
    expect(lead).toMatchObject({
      source: 'website',
      owner_id: null,
      email: 'hello@example.com',
      notes: 'We need a new site.\n\nBudget: ₹1–2 L',
    });
    const kinds = (await as(owner, (tx) => leadActivities(tx, ws, id))).map((a) => a.kind);
    expect(kinds).toEqual(expect.arrayContaining(['created', 'enquiry']));
    const [note] = await as(owner, (tx) => listNotifications(tx, ws));
    expect(note).toMatchObject({
      kind: 'lead.enquiry',
      payload: { leadId: id, name: 'Example Enquirer' },
    });
  });

  it('refuses a replaced link, a missing consent and missing contact details', async () => {
    const { token: old } = await as(owner, (tx) => createEnquiryForm(tx, ws));
    const { token } = await as(owner, (tx) => createEnquiryForm(tx, ws));
    await expect(
      submitEnquiry(t.db, old, { name: 'X', email: 'x@example.com', consent: true }),
    ).rejects.toMatchObject({ code: 'enquiry_closed' });
    await expect(
      submitEnquiry(t.db, 'nonsense', { name: 'X', email: 'x@example.com', consent: true }),
    ).rejects.toMatchObject({ code: 'enquiry_closed' });
    await expect(
      submitEnquiry(t.db, token, { name: 'X', email: 'x@example.com', consent: false }),
    ).rejects.toMatchObject({ code: 'consent_required' });
    await expect(submitEnquiry(t.db, token, { name: 'X', consent: true })).rejects.toMatchObject({
      code: 'lead_contact_required',
    });
  });

  it('keeps enquiries past the plan limit', async () => {
    await t.admin`update workspaces set plan = 'free' where id = ${ws}`;
    const { token } = await as(owner, (tx) => createEnquiryForm(tx, ws));
    await expect(
      submitEnquiry(t.db, token, { name: 'Example Late', phone: '+919876500000', consent: true }),
    ).resolves.toBeTruthy();
    await t.admin`update workspaces set plan = 'growth' where id = ${ws}`;
  });
});
