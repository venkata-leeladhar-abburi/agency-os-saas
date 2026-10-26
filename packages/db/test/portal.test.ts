import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { acceptInvitation, createWorkspace, inviteMember } from '../src/accounts';
import { withUser, type Session } from '../src/client';
import { claimPortalAccess, createClient, getClient, invitePortalContact } from '../src/clients';
import {
  addPortalFile,
  deleteFile,
  listFiles,
  portalFiles,
  portalThread,
  postMessage,
  postPortalMessage,
  projectTeam,
  projectThread,
  registerFile,
  setFileVisibility,
} from '../src/portal';
import { createProject } from '../src/projects';
import { files, messages } from '../src/schema';
import { createTestDb, type TestDb } from './db';

let t: TestDb;
let owner: Session;
let member: Session;
let bystander: Session;
let portal: Session;
let otherClientPortal: Session;
let ws: string;
let projectId: string;
let otherProject: string;

const as = <T>(s: Session, fn: Parameters<typeof withUser<T>>[2]) => withUser(t.db, s, fn);
const pgError = (pattern: RegExp) => ({
  cause: expect.objectContaining({ message: expect.stringMatching(pattern) }),
});
const pdf = { name: 'Brief.pdf', mime: 'application/pdf', sizeBytes: 120_000 };

beforeAll(async () => {
  t = await createTestDb();
  const user = async (email: string) => ({ userId: await t.createUser(email), email });
  owner = await user('kiran@onestop.in');
  member = await user('arjun@onestop.in');
  bystander = await user('neha@onestop.in');
  portal = await user('client@kite.example');
  otherClientPortal = await user('client@lumen.example');
  ws = await as(owner, (tx) => createWorkspace(tx, { name: 'One Stop Solutions' }));
  await t.admin`update workspaces set plan = 'growth' where id = ${ws}`;
  for (const s of [member, bystander]) {
    const { token } = await as(owner, (tx) =>
      inviteMember(tx, {
        workspaceId: ws,
        email: s.email!,
        role: 'member',
        invitedBy: owner.userId,
      }),
    );
    await as(s, (tx) => acceptInvitation(tx, token));
  }
  const kite = await as(owner, (tx) =>
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
  const lumen = await as(owner, (tx) =>
    createClient(
      tx,
      ws,
      {
        name: 'Example Lumen Foods',
        contact: { name: 'Example Lumen', email: 'client@lumen.example' },
      },
      owner.userId,
    ),
  );
  for (const [clientId, s] of [
    [kite, portal],
    [lumen, otherClientPortal],
  ] as const) {
    const contact = (await as(owner, (tx) => getClient(tx, clientId)))!.contacts[0]!;
    await as(owner, (tx) => invitePortalContact(tx, contact.id, owner.userId));
    await as(s, (tx) => claimPortalAccess(tx));
  }
  projectId = await as(owner, (tx) =>
    createProject(
      tx,
      ws,
      { clientId: kite, name: 'Example Website', memberIds: [member.userId], template: 'blank' },
      owner.userId,
    ),
  );
  otherProject = await as(owner, (tx) =>
    createProject(
      tx,
      ws,
      { clientId: lumen, name: 'Example Menu', template: 'blank' },
      owner.userId,
    ),
  );
}, 60_000);

afterAll(async () => {
  await t?.drop();
});

describe('files', () => {
  it('registers internal files with a safe path in the workspace', async () => {
    const { id, path } = await as(member, (tx) =>
      registerFile(
        tx,
        ws,
        {
          projectId,
          subjectType: 'project',
          subjectId: projectId,
          ...pdf,
          name: 'Wireframes v2 (final).pdf',
        },
        member.userId,
      ),
    );
    expect(path).toBe(`${ws}/${id}/Wireframes-v2-final.pdf`);
    const [file] = await as(member, (tx) => listFiles(tx, ws, { projectId }));
    expect(file).toMatchObject({
      id,
      visibility: 'internal',
      uploadedBy: member.userId,
      name: 'Wireframes v2 (final).pdf',
    });
  });

  it('refuses files that are too big or of the wrong type, with what to do', async () => {
    await expect(
      as(member, (tx) =>
        registerFile(
          tx,
          ws,
          {
            projectId,
            subjectType: 'project',
            subjectId: projectId,
            ...pdf,
            sizeBytes: 30_000_000,
          },
          member.userId,
        ),
      ),
    ).rejects.toMatchObject({
      code: 'file_invalid',
      message: 'Files can be up to 25 MB. Compress it or share a link instead.',
    });
    await expect(
      as(member, (tx) =>
        registerFile(
          tx,
          ws,
          {
            projectId,
            subjectType: 'project',
            subjectId: projectId,
            name: 'run.exe',
            mime: 'application/x-msdownload',
            sizeBytes: 10,
          },
          member.userId,
        ),
      ),
    ).rejects.toMatchObject({ code: 'file_invalid' });
  });

  it('keeps files to the project team and the workspace path', async () => {
    expect(await as(bystander, (tx) => listFiles(tx, ws))).toEqual([]);
    await expect(
      as(bystander, (tx) =>
        registerFile(
          tx,
          ws,
          { projectId, subjectType: 'project', subjectId: projectId, ...pdf },
          bystander.userId,
        ),
      ),
    ).rejects.toMatchObject(pgError(/row-level security/));
    await expect(
      as(owner, (tx) =>
        tx.insert(files).values({
          workspaceId: ws,
          projectId,
          subjectType: 'project',
          subjectId: projectId,
          storagePath: 'someone-else/x.pdf',
          ...pdf,
          uploadedBy: owner.userId,
        }),
      ),
    ).rejects.toMatchObject(pgError(/file_mismatch/));
  });
});

describe('the project thread', () => {
  it('lets the team write to the client and share files', async () => {
    const { id: fileId } = await as(member, (tx) =>
      registerFile(
        tx,
        ws,
        { projectId, subjectType: 'project', subjectId: projectId, ...pdf, name: 'Moodboard.pdf' },
        member.userId,
      ),
    );
    const sent = await as(member, (tx) =>
      postMessage(
        tx,
        ws,
        { projectId, body: ' Here is the moodboard. ', fileIds: [fileId] },
        member.userId,
      ),
    );
    expect(sent.clientEmails).toEqual(['client@kite.example']);
    const shared = (await as(member, (tx) => listFiles(tx, ws, { projectId }))).find(
      (f) => f.id === fileId,
    );
    expect(shared?.visibility).toBe('client');
    expect(await as(bystander, (tx) => projectThread(tx, ws, projectId))).toEqual([]);
    await expect(
      as(bystander, (tx) => postMessage(tx, ws, { projectId, body: 'Hi' }, bystander.userId)),
    ).rejects.toMatchObject(pgError(/row-level security/));
    await expect(
      as(member, (tx) => postMessage(tx, ws, { projectId, body: '  ' }, member.userId)),
    ).rejects.toMatchObject({
      code: 'message_invalid',
    });
  });

  it('shows the client the thread with names and only shared files', async () => {
    const thread = await as(portal, (tx) => portalThread(tx, projectId));
    expect(thread).toEqual([
      expect.objectContaining({
        body: 'Here is the moodboard.',
        fromClient: false,
        author: 'arjun',
        files: [expect.objectContaining({ name: 'Moodboard.pdf' })],
      }),
    ]);
    const shared = await as(portal, (tx) => portalFiles(tx, projectId));
    expect(shared.map((f) => f.name)).toEqual(['Moodboard.pdf']);
    expect(JSON.stringify(shared)).not.toContain('Wireframes');
  });

  it('lets the client reply with a file, and tells the team', async () => {
    const { id: fileId, path } = await as(portal, (tx) =>
      addPortalFile(tx, projectId, { ...pdf, name: 'Our logo.png', mime: 'image/png' }),
    );
    expect(path.startsWith(`${ws}/${fileId}/`)).toBe(true);
    await as(portal, (tx) => postPortalMessage(tx, projectId, 'Logo attached.', [fileId]));
    const thread = await as(member, (tx) => projectThread(tx, ws, projectId));
    expect(thread.at(-1)).toMatchObject({
      body: 'Logo attached.',
      authorId: null,
      fileIds: [fileId],
    });
    expect(thread.at(-1)!.authorContactId).not.toBeNull();
    const portalView = await as(portal, (tx) => portalThread(tx, projectId));
    expect(portalView.at(-1)).toMatchObject({ fromClient: true, author: 'Example Client' });
    const team = await as(owner, (tx) => projectTeam(tx, projectId));
    expect(team.sort()).toEqual([owner.userId, member.userId].sort());
  });

  it('keeps clients out of other clients’ projects and internal files', async () => {
    await expect(as(otherClientPortal, (tx) => portalThread(tx, projectId))).rejects.toMatchObject({
      code: 'project_not_found',
    });
    await expect(
      as(otherClientPortal, (tx) => postPortalMessage(tx, projectId, 'Hello')),
    ).rejects.toMatchObject({ code: 'project_not_found' });
    await expect(
      as(otherClientPortal, (tx) => addPortalFile(tx, projectId, pdf)),
    ).rejects.toMatchObject({ code: 'project_not_found' });
    expect(await as(otherClientPortal, (tx) => portalThread(tx, otherProject))).toEqual([]);
    const internal = (await as(member, (tx) => listFiles(tx, ws, { projectId }))).find(
      (f) => f.visibility === 'internal',
    )!;
    await expect(
      as(portal, (tx) => postPortalMessage(tx, projectId, 'Sneaky', [internal.id])),
    ).rejects.toMatchObject({ code: 'message_invalid' });
    await expect(
      as(portal, (tx) => postPortalMessage(tx, projectId, 'Bad', ["x'); drop table files; --"])),
    ).rejects.toMatchObject({
      code: 'message_invalid',
    });
    expect(await as(portal, (tx) => tx.select().from(messages))).toEqual([]);
    expect(await as(portal, (tx) => tx.select().from(files))).toEqual([]);
  });

  it('can unshare and trash files', async () => {
    const shared = (await as(member, (tx) => listFiles(tx, ws, { projectId }))).find(
      (f) => f.name === 'Moodboard.pdf',
    )!;
    await as(member, (tx) => setFileVisibility(tx, shared.id, 'internal'));
    expect((await as(portal, (tx) => portalFiles(tx, projectId))).map((f) => f.name)).toEqual([
      'Our logo.png',
    ]);
    const logo = (await as(member, (tx) => listFiles(tx, ws, { projectId }))).find(
      (f) => f.name === 'Our logo.png',
    )!;
    await as(member, (tx) => deleteFile(tx, logo.id));
    expect(await as(portal, (tx) => portalFiles(tx, projectId))).toEqual([]);
    await expect(as(bystander, (tx) => deleteFile(tx, logo.id))).rejects.toMatchObject({
      code: 'file_not_found',
    });
  });
});
