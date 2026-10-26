import { checkUpload, storagePath } from '@agency-os/core';
import { and, asc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';
import { AccountError, call } from './accounts';
import type { Tx } from './client';
import { clientContacts, files, messages, projectMembers, projects } from './schema';

export type FileRecord = typeof files.$inferSelect;
export type Visibility = FileRecord['visibility'];

export type NewFile = {
  projectId?: string | null;
  subjectType: string;
  subjectId: string;
  name: string;
  mime: string;
  sizeBytes: number;
  visibility?: Visibility;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function checked(input: Pick<NewFile, 'name' | 'mime' | 'sizeBytes'>) {
  const problem = checkUpload(input.name, input.mime, input.sizeBytes);
  if (problem) throw new AccountError('file_invalid', problem);
}

/** A Postgres uuid[] literal, bound as one parameter; anything that isn't a uuid is refused. */
function uuidArray(ids: string[]) {
  if (!ids.every((id) => UUID.test(id))) throw new AccountError('message_invalid');
  return `{${ids.join(',')}}`;
}

/**
 * Registers a file before its upload and returns the Storage path to upload to (the app asks
 * Storage for a signed upload URL for it). Internal unless shared with the client.
 */
export async function registerFile(tx: Tx, workspaceId: string, input: NewFile, actorId: string) {
  checked(input);
  const id = uuidv7();
  const path = storagePath(workspaceId, id, input.name);
  await call(() =>
    tx.insert(files).values({
      id,
      workspaceId,
      projectId: input.projectId ?? null,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      storagePath: path,
      name: input.name.trim(),
      mime: input.mime,
      sizeBytes: input.sizeBytes,
      visibility: input.visibility ?? 'internal',
      uploadedBy: actorId,
    }),
  );
  return { id, path };
}

export async function listFiles(
  tx: Tx,
  workspaceId: string,
  f: { projectId?: string; subjectType?: string; subjectId?: string } = {},
) {
  return tx
    .select()
    .from(files)
    .where(
      and(
        eq(files.workspaceId, workspaceId),
        isNull(files.deletedAt),
        f.projectId ? eq(files.projectId, f.projectId) : undefined,
        f.subjectType ? eq(files.subjectType, f.subjectType) : undefined,
        f.subjectId ? eq(files.subjectId, f.subjectId) : undefined,
      ),
    )
    .orderBy(sql`${files.createdAt} desc`);
}

export async function setFileVisibility(tx: Tx, fileId: string, visibility: Visibility) {
  const rows = await tx
    .update(files)
    .set({ visibility })
    .where(eq(files.id, fileId))
    .returning({ id: files.id });
  if (rows.length === 0) throw new AccountError('file_not_found');
}

/** Moves a file to the trash (the Storage object goes when the trash is purged). */
export async function deleteFile(tx: Tx, fileId: string) {
  const rows = await tx
    .update(files)
    .set({ deletedAt: new Date() })
    .where(eq(files.id, fileId))
    .returning({ id: files.id });
  if (rows.length === 0) throw new AccountError('file_not_found');
}

// ---- The project thread ----

/**
 * A member writes in the project's thread with the client. Attached files become visible to
 * the client. Returns the portal contacts to tell by email.
 */
export async function postMessage(
  tx: Tx,
  workspaceId: string,
  input: { projectId: string; body: string; fileIds?: string[] },
  actorId: string,
) {
  const fileIds = [...new Set(input.fileIds ?? [])];
  if (fileIds.length)
    await tx
      .update(files)
      .set({ visibility: 'client' })
      .where(and(inArray(files.id, fileIds), eq(files.projectId, input.projectId)));
  const id = uuidv7();
  await call(() =>
    tx.insert(messages).values({
      id,
      workspaceId,
      projectId: input.projectId,
      authorId: actorId,
      body: input.body.trim(),
      fileIds,
    }),
  );
  const [project] = await tx
    .select({ clientId: projects.clientId })
    .from(projects)
    .where(eq(projects.id, input.projectId));
  const contacts = await tx
    .select({ email: clientContacts.email })
    .from(clientContacts)
    .where(
      and(
        eq(clientContacts.clientId, project!.clientId),
        isNotNull(clientContacts.portalInvitedAt),
        isNull(clientContacts.portalRevokedAt),
      ),
    );
  return { id, clientEmails: contacts.flatMap((c) => (c.email ? [c.email] : [])) };
}

export async function projectThread(tx: Tx, workspaceId: string, projectId: string) {
  return tx
    .select()
    .from(messages)
    .where(and(eq(messages.workspaceId, workspaceId), eq(messages.projectId, projectId)))
    .orderBy(asc(messages.createdAt), asc(messages.id));
}

/** Who to tell when the client writes: the project's lead and members (jobs only). */
export async function projectTeam(tx: Tx, projectId: string) {
  const [p] = await tx
    .select({ lead: projects.leadMemberId })
    .from(projects)
    .where(eq(projects.id, projectId));
  const members = await tx
    .select({ userId: projectMembers.userId })
    .from(projectMembers)
    .where(eq(projectMembers.projectId, projectId));
  return [...new Set([...(p?.lead ? [p.lead] : []), ...members.map((m) => m.userId)])];
}

// ---- Portal (signed in as a client contact) ----

export type PortalMessage = {
  id: string;
  body: string;
  createdAt: string;
  fromClient: boolean;
  author: string;
  files: { id: string; name: string; mime: string; sizeBytes: number }[];
};

export async function portalThread(tx: Tx, projectId: string): Promise<PortalMessage[]> {
  const [row] = await call(() =>
    tx.execute<{ t: PortalMessage[] }>(sql`select portal_thread(${projectId}::uuid) as t`),
  );
  return row!.t;
}

/** The client writes in the thread (the team is told by a job, see projectTeam). */
export async function postPortalMessage(
  tx: Tx,
  projectId: string,
  body: string,
  fileIds: string[] = [],
) {
  const ids = uuidArray([...new Set(fileIds)]);
  const [row] = await call(() =>
    tx.execute<{ id: string }>(
      sql`select post_portal_message(${projectId}::uuid, ${body}, ${ids}::uuid[]) as id`,
    ),
  );
  return { id: row!.id, projectId };
}

/** The client uploads a file to their project; returns the Storage path to upload to. */
export async function addPortalFile(
  tx: Tx,
  projectId: string,
  input: { name: string; mime: string; sizeBytes: number },
) {
  checked(input);
  const [ws] = await tx.execute<{ ws: string | null }>(
    sql`select portal_project_workspace(${projectId}::uuid) as ws`,
  );
  if (!ws?.ws) throw new AccountError('project_not_found');
  const id = uuidv7();
  const path = storagePath(ws.ws, id, input.name);
  await call(() =>
    tx.execute(
      sql`select add_portal_file(${projectId}::uuid, ${id}::uuid, ${input.name.trim()}, ${input.mime}, ${input.sizeBytes}, ${path})`,
    ),
  );
  return { id, path };
}

export type PortalFile = {
  id: string;
  name: string;
  mime: string;
  sizeBytes: number;
  path: string;
  createdAt: string;
  fromClient: boolean;
};

export async function portalFiles(tx: Tx, projectId: string): Promise<PortalFile[]> {
  const [row] = await call(() =>
    tx.execute<{ f: PortalFile[] }>(sql`select portal_files(${projectId}::uuid) as f`),
  );
  return row!.f;
}
