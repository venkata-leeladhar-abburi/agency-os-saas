import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { acceptInvitation, createWorkspace, inviteMember } from '../src/accounts';
import { withService, withUser, type Session } from '../src/client';
import {
  claimPortalAccess,
  createClient,
  getClient,
  invitePortalContact,
  listClients,
} from '../src/clients';
import { exportWorkspace, listNotifications } from '../src/platform';
import {
  addChecklistItem,
  addProjectMember,
  completePhase,
  createProject,
  decideGate,
  decideGateAsClient,
  deliverEvent,
  getProject,
  listProjects,
  portalProjects,
  projectActivities,
  requestGateApproval,
  saveTemplate,
  setChecklistItem,
  skipPhase,
  startPhase,
  updateProject,
} from '../src/projects';
import { createProposal, requestSigningCode, sendProposal, signProposal } from '../src/sales-docs';
import { gates, phases, projects } from '../src/schema';
import { createTestDb, type TestDb } from './db';

let t: TestDb;
let owner: Session;
let lead: Session;
let member: Session;
let bystander: Session;
let finance: Session;
let outsider: Session;
let portal: Session;
let ws: string;
let clientId: string;
let projectId: string;

const as = <T>(s: Session, fn: Parameters<typeof withUser<T>>[2]) => withUser(t.db, s, fn);
const pgError = (pattern: RegExp) => ({
  cause: expect.objectContaining({ message: expect.stringMatching(pattern) }),
});
const project = (s: Session = owner, id = projectId) => as(s, (tx) => getProject(tx, id));
const phaseNamed = async (name: string, id = projectId) =>
  (await project(owner, id))!.phases.find((p) => p.name === name)!;

beforeAll(async () => {
  t = await createTestDb();
  const user = async (email: string) => ({ userId: await t.createUser(email), email });
  owner = await user('kiran@onestop.in');
  lead = await user('ravi@onestop.in');
  member = await user('arjun@onestop.in');
  bystander = await user('neha@onestop.in');
  finance = await user('meera@onestop.in');
  outsider = await user('sarah@northwind.example');
  portal = await user('client@kite.example');
  ws = await as(owner, (tx) => createWorkspace(tx, { name: 'One Stop Solutions' }));
  await as(outsider, (tx) => createWorkspace(tx, { name: 'Northwind Studio' }));
  await t.admin`update workspaces set plan = 'growth' where id = ${ws}`;
  for (const [s, role] of [
    [lead, 'project_lead'],
    [member, 'member'],
    [bystander, 'member'],
    [finance, 'finance'],
  ] as const) {
    const { token } = await as(owner, (tx) =>
      inviteMember(tx, { workspaceId: ws, email: s.email!, role, invitedBy: owner.userId }),
    );
    await as(s, (tx) => acceptInvitation(tx, token));
  }
  clientId = await as(owner, (tx) =>
    createClient(
      tx,
      ws,
      {
        name: 'Example Kite & Co',
        contact: { name: 'Example Client', email: 'client@kite.example' },
      },
      owner.userId,
    ),
  );
  const contactId = (await as(owner, (tx) => getClient(tx, clientId)))!.contacts[0]!.id;
  await as(owner, (tx) => invitePortalContact(tx, contactId, owner.userId));
  await as(portal, (tx) => claimPortalAccess(tx));
  projectId = await as(owner, (tx) =>
    createProject(
      tx,
      ws,
      {
        clientId,
        name: 'Example Website',
        leadMemberId: lead.userId,
        memberIds: [member.userId],
        budgetMinor: 48_600_000n,
      },
      owner.userId,
    ),
  );
}, 60_000);

afterAll(async () => {
  await t?.drop();
});

describe('creating a project', () => {
  it('uses the seven phases with their checklists and client gates', async () => {
    const p = (await project())!;
    expect(p).toMatchObject({
      name: 'Example Website',
      currency: 'INR',
      templateName: 'Seven phases',
      leadMemberId: lead.userId,
      progress: 0,
    });
    expect(p.phases.map((ph) => ph.name)).toEqual([
      'Connect',
      'Discover',
      'Define',
      'Design',
      'Build',
      'Launch',
      'Grow',
    ]);
    expect(p.phases.flatMap((ph) => ph.checklist)).toHaveLength(47);
    const gated = p.phases.filter((ph) => ph.gate);
    expect(gated.map((ph) => ph.gate!.title)).toEqual([
      'Proposal accepted',
      'Strategy and scope sign-off',
      'Design sign-off',
      'Acceptance testing sign-off',
      'Handover accepted',
    ]);
    const contact = (await as(owner, (tx) => getClient(tx, clientId)))!.contacts[0]!;
    expect(
      gated.every(
        (ph) => ph.gate!.approverType === 'client' && ph.gate!.approverContactId === contact.id,
      ),
    ).toBe(true);
    expect(p.members.map((m) => m.userId).sort()).toEqual([lead.userId, member.userId].sort());
    expect((await as(owner, (tx) => projectActivities(tx, ws, projectId)))[0]).toMatchObject({
      kind: 'created',
      meta: { template: 'Seven phases' },
    });
  });

  it('starts with Proposal accepted approved when the proposal is signed', async () => {
    const proposalId = await as(owner, (tx) => createProposal(tx, ws, { clientId }, owner.userId));
    const { token } = await as(owner, (tx) => sendProposal(tx, proposalId, owner.userId));
    const { code } = await requestSigningCode(t.db, token, 'client@kite.example');
    await signProposal(t.db, token, { name: 'Example Client', email: 'client@kite.example', code });
    const id = await as(owner, (tx) =>
      createProject(tx, ws, { clientId, name: 'Example Signed', proposalId }, owner.userId),
    );
    const connect = await phaseNamed('Connect', id);
    expect(connect).toMatchObject({ status: 'done', gate: { status: 'approved' } });
    await as(owner, async (tx) => startPhase(tx, (await phaseNamed('Discover', id)).id));
  });

  it('offers a blank template and refuses a missing name', async () => {
    const id = await as(owner, (tx) =>
      createProject(tx, ws, { clientId, name: 'Example Blank', template: 'blank' }, owner.userId),
    );
    expect((await project(owner, id))!.phases.map((p) => [p.name, p.gate])).toEqual([
      ['Work', null],
    ]);
    await expect(
      as(owner, (tx) => createProject(tx, ws, { clientId, name: ' ' }, owner.userId)),
    ).rejects.toMatchObject({ code: 'project_name_required' });
  });
});

describe('who sees and changes a project', () => {
  it('shows a project to its team, all to finance, and nothing to others', async () => {
    expect(await project(lead)).not.toBeNull();
    expect(await project(member)).not.toBeNull();
    expect(await project(bystander)).toBeNull();
    expect(await project(outsider)).toBeNull();
    expect((await as(finance, (tx) => listProjects(tx, ws))).length).toBeGreaterThan(2);
    expect(await as(bystander, (tx) => listProjects(tx, ws))).toEqual([]);
  });

  it('lets project members see their projects’ clients now', async () => {
    expect((await as(member, (tx) => listClients(tx, ws))).map((c) => c.id)).toEqual([clientId]);
    expect(await as(bystander, (tx) => listClients(tx, ws))).toEqual([]);
  });

  it('lets the lead change their project but not others; members can’t change it', async () => {
    await as(lead, (tx) => updateProject(tx, projectId, { health: 'at_risk' }));
    await expect(
      as(member, (tx) => updateProject(tx, projectId, { health: 'off_track' })),
    ).rejects.toMatchObject({ code: 'project_not_found' });
    const other = await as(owner, (tx) =>
      createProject(
        tx,
        ws,
        { clientId, name: 'Example Not Ravi', template: 'blank' },
        owner.userId,
      ),
    );
    await expect(
      as(lead, (tx) => updateProject(tx, other, { name: 'Mine now' })),
    ).rejects.toMatchObject({ code: 'project_not_found' });
  });

  it('lets a project lead create projects they lead, only', async () => {
    const id = await as(lead, (tx) =>
      createProject(
        tx,
        ws,
        { clientId, name: 'Example Lead Project', template: 'blank' },
        lead.userId,
      ),
    );
    expect(await project(lead, id)).not.toBeNull();
    await expect(
      as(lead, (tx) =>
        createProject(
          tx,
          ws,
          { clientId, name: 'X', leadMemberId: owner.userId, template: 'blank' },
          lead.userId,
        ),
      ),
    ).rejects.toMatchObject(pgError(/row-level security/));
  });

  it('keeps people and clients from other workspaces out', async () => {
    await expect(
      as(owner, (tx) => addProjectMember(tx, projectId, outsider.userId)),
    ).rejects.toMatchObject({ code: 'project_mismatch' });
    await expect(
      as(owner, (tx) =>
        createProject(tx, ws, { clientId, name: 'X', leadMemberId: outsider.userId }, owner.userId),
      ),
    ).rejects.toMatchObject({
      code: 'project_mismatch',
    });
  });
});

describe('phases, checklist and progress', () => {
  it('counts done checklist items, ignoring skipped phases', async () => {
    const connect = await phaseNamed('Connect');
    for (const item of connect.checklist)
      await as(lead, (tx) => setChecklistItem(tx, item.id, true, lead.userId));
    expect((await project())!.progress).toBe(14); // 7 of 47
    await as(lead, async (tx) => skipPhase(tx, (await phaseNamed('Discover')).id));
    expect((await project())!.progress).toBe(17); // 7 of 40
    await as(lead, async (tx) => skipPhase(tx, (await phaseNamed('Discover')).id, false));
    await as(lead, (tx) => setChecklistItem(tx, connect.checklist[0]!.id, false, lead.userId));
    expect((await project())!.progress).toBe(12);
    const added = await as(lead, (tx) => addChecklistItem(tx, connect.id, ' Send the NDA '));
    expect((await phaseNamed('Connect')).checklist.at(-1)).toMatchObject({
      id: added,
      title: 'Send the NDA',
    });
    const kinds = (await as(owner, (tx) => projectActivities(tx, ws, projectId))).map(
      (a) => a.kind,
    );
    expect(kinds).toEqual(expect.arrayContaining(['phase_skipped', 'phase_restored']));
  });

  it('starts work after a gate only once it is approved', async () => {
    await as(lead, async (tx) => startPhase(tx, (await phaseNamed('Connect')).id));
    await expect(
      as(lead, async (tx) => startPhase(tx, (await phaseNamed('Discover')).id)),
    ).rejects.toMatchObject({ code: 'gate_not_approved' });
    await expect(
      as(lead, async (tx) => completePhase(tx, (await phaseNamed('Connect')).id)),
    ).rejects.toMatchObject({ code: 'gate_not_approved' });
  });

  it('never lets anyone approve a gate or skip a phase by editing the row', async () => {
    const connect = await phaseNamed('Connect');
    await expect(
      as(owner, (tx) =>
        tx.update(gates).set({ status: 'approved' }).where(eq(gates.id, connect.gate!.id)),
      ),
    ).rejects.toMatchObject(pgError(/gate_decision_locked/));
    await expect(
      as(owner, (tx) =>
        tx.update(phases).set({ status: 'skipped' }).where(eq(phases.id, connect.id)),
      ),
    ).rejects.toMatchObject(pgError(/gate_decision_locked/));
    const grow = await phaseNamed('Grow');
    await expect(
      as(owner, (tx) =>
        tx.insert(gates).values({
          workspaceId: ws,
          phaseId: grow.id,
          title: 'Sneaky',
          approverType: 'client',
          status: 'approved',
        }),
      ),
    ).rejects.toMatchObject(pgError(/gate_decision_locked/));
  });
});

describe('gate approval', () => {
  it('lets the project lead ask the client for sign-off', async () => {
    const gateId = (await phaseNamed('Connect')).gate!.id;
    await expect(
      as(member, (tx) => requestGateApproval(tx, gateId, 'Please review')),
    ).rejects.toMatchObject({ code: 'gate_not_found' });
    await expect(as(outsider, (tx) => requestGateApproval(tx, gateId))).rejects.toMatchObject({
      code: 'gate_not_found',
    });
    const event = await as(lead, (tx) =>
      requestGateApproval(tx, gateId, ' The proposal is ready for you. '),
    );
    expect(event).toMatchObject({
      kind: 'gate.requested',
      contactEmails: ['client@kite.example'],
      userIds: [],
      payload: { gate: 'Proposal accepted', message: 'The proposal is ready for you.' },
    });
    expect((await phaseNamed('Connect')).gate).toMatchObject({
      status: 'waiting',
      requestedBy: lead.userId,
    });
    await expect(as(lead, (tx) => requestGateApproval(tx, gateId))).rejects.toMatchObject({
      code: 'gate_not_open',
    });
  });

  it('shows the client their project without internal details', async () => {
    const mine = await as(portal, (tx) => portalProjects(tx));
    const site = mine.find((p) => p.id === projectId)!;
    expect(site.phases.map((p) => p.name)).toHaveLength(7);
    expect(site.phases[0]).toMatchObject({
      clientLine: 'We learn your business and agree the plan.',
      gate: {
        title: 'Proposal accepted',
        status: 'waiting',
        requestMessage: 'The proposal is ready for you.',
      },
    });
    const text = JSON.stringify(mine);
    expect(text).not.toContain('Research the lead');
    expect(text).not.toContain('48600000');
    expect(await as(portal, (tx) => tx.select().from(projects))).toEqual([]);
    expect(await as(outsider, (tx) => portalProjects(tx))).toEqual([]);
  });

  it('lets only the client decide a client gate; changes need a comment', async () => {
    const gateId = (await phaseNamed('Connect')).gate!.id;
    await expect(as(owner, (tx) => decideGate(tx, gateId, true))).rejects.toMatchObject({
      code: 'gate_not_your_decision',
    });
    await expect(as(outsider, (tx) => decideGateAsClient(tx, gateId, true))).rejects.toMatchObject({
      code: 'gate_not_found',
    });
    await expect(
      as(portal, (tx) => decideGateAsClient(tx, gateId, false, ' ')),
    ).rejects.toMatchObject({ code: 'gate_comment_required' });
    await as(portal, (tx) =>
      decideGateAsClient(tx, gateId, false, 'Please add the blog to the scope.'),
    );
    expect((await phaseNamed('Connect')).gate).toMatchObject({
      status: 'changes_requested',
      decisionComment: 'Please add the blog to the scope.',
    });
    await as(lead, (tx) => requestGateApproval(tx, gateId, 'Blog added.'));
    await as(portal, (tx) => decideGateAsClient(tx, gateId, true));
    const connect = await phaseNamed('Connect');
    expect(connect).toMatchObject({
      status: 'done',
      gate: { status: 'approved', decidedBy: null },
    });
    expect(connect.gate!.decidedByContactId).not.toBeNull();
    await expect(as(portal, (tx) => decideGateAsClient(tx, gateId, true))).rejects.toMatchObject({
      code: 'gate_not_waiting',
    });
    await as(lead, async (tx) => startPhase(tx, (await phaseNamed('Discover')).id));
    const kinds = (await as(owner, (tx) => projectActivities(tx, ws, projectId))).map(
      (a) => a.kind,
    );
    expect(kinds).toEqual(
      expect.arrayContaining(['gate_requested', 'gate_changes_requested', 'gate_approved']),
    );
    const audit =
      await t.admin`select action from audit_log where workspace_id = ${ws} and subject_type = 'gate'`;
    expect(audit.map((a) => a.action)).toContain('gate.approved');
  });

  it('decides internal gates by their approver, and tells the project lead', async () => {
    const discover = await phaseNamed('Discover');
    await as(owner, (tx) =>
      tx.insert(gates).values({
        workspaceId: ws,
        phaseId: discover.id,
        title: 'Internal review',
        approverType: 'internal',
      }),
    );
    const gateId = (await phaseNamed('Discover')).gate!.id;
    await as(lead, (tx) => requestGateApproval(tx, gateId));
    await expect(as(lead, (tx) => decideGate(tx, gateId, true))).rejects.toMatchObject({
      code: 'gate_not_your_decision',
    });
    const event = await as(owner, (tx) => decideGate(tx, gateId, true, 'Research is solid.'));
    expect(event).toMatchObject({
      kind: 'gate.decided',
      userIds: [lead.userId],
      payload: { outcome: 'approved', comment: 'Research is solid.' },
    });
    await withService(t.db, ws, (tx) => deliverEvent(tx, event));
    expect((await as(lead, (tx) => listNotifications(tx, ws)))[0]).toMatchObject({
      kind: 'gate.decided',
    });
    expect((await phaseNamed('Discover')).status).toBe('done');
  });
});

describe('templates', () => {
  it('saves a project as the workspace’s own template', async () => {
    const templateId = await as(owner, (tx) =>
      saveTemplate(tx, projectId, 'Our process', owner.userId),
    );
    const id = await as(owner, (tx) =>
      createProject(
        tx,
        ws,
        { clientId, name: 'Example From Template', template: templateId },
        owner.userId,
      ),
    );
    const p = (await project(owner, id))!;
    expect(p.templateName).toBe('Our process');
    expect(p.phases.map((ph) => ph.name)).toEqual([
      'Connect',
      'Discover',
      'Define',
      'Design',
      'Build',
      'Launch',
      'Grow',
    ]);
    expect(p.phases[1]!.gate).toMatchObject({
      title: 'Internal review',
      approverType: 'internal',
      status: 'not_started',
    });
    expect(p.phases[0]!.checklist.at(-1)!.title).toBe('Send the NDA');
    await expect(
      as(owner, (tx) => saveTemplate(tx, projectId, ' ', owner.userId)),
    ).rejects.toMatchObject({ code: 'template_invalid', message: 'Give the template a name.' });
    await expect(
      as(owner, (tx) =>
        createProject(
          tx,
          ws,
          { clientId, name: 'X', template: '00000000-0000-7000-8000-000000000000' },
          owner.userId,
        ),
      ),
    ).rejects.toMatchObject({
      code: 'template_not_found',
    });
  });
});

describe('export', () => {
  it('includes projects and sales documents, without link tokens', async () => {
    const data = await as(owner, (tx) => exportWorkspace(tx, ws, owner.userId));
    expect(data.tables.projects!.length).toBeGreaterThan(3);
    expect(data.tables.gates!.length).toBeGreaterThan(5);
    expect(data.tables.proposals).toHaveLength(1);
    expect(data.tables.signatures).toHaveLength(1);
    expect(JSON.stringify(data, (_k, v) => (typeof v === 'bigint' ? String(v) : v))).not.toContain(
      'public_token_hash',
    );
  });
});
