import { and, asc, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';
import { AccountError, call } from './accounts';
import type { Tx } from './client';
import { knowledgeFolders, knowledgeItemClients, knowledgeItems, profiles } from './schema';

export const KNOWLEDGE_KINDS = [
  'process',
  'prompt',
  'tool',
  'website',
  'component',
  'template',
  'checklist',
  'board',
  'learning',
] as const;
export type KnowledgeKind = (typeof KNOWLEDGE_KINDS)[number];
export type KnowledgeVisibility = 'private' | 'team' | 'clients';
export type KnowledgeStatus = 'draft' | 'published';

export type KnowledgeFolderRow = {
  id: string;
  parentId: string | null;
  name: string;
  description: string | null;
  /** Items in this folder that the person can see (not counting subfolders). */
  items: number;
  isExample: boolean;
};

export type KnowledgeItemInput = {
  folderId: string | null;
  kind: KnowledgeKind;
  title: string;
  summary?: string | null;
  body?: string;
  url?: string | null;
  tags?: string[];
  visibility: KnowledgeVisibility;
  /** Team items: only these roles (empty: everyone). */
  roles?: string[];
  /** Client items: every client, or these. */
  allClients?: boolean;
  clientIds?: string[];
  status: KnowledgeStatus;
  isExample?: boolean;
};

// ---- Folders ----

/** Every folder in the workspace, by name, with how many items in each the person can see. */
export async function listKnowledgeFolders(tx: Tx, workspaceId: string) {
  const rows = await tx
    .select({
      id: knowledgeFolders.id,
      parentId: knowledgeFolders.parentId,
      name: knowledgeFolders.name,
      description: knowledgeFolders.description,
      isExample: knowledgeFolders.isExample,
      // Written out in full: inside a sub-query a bare "id" would be the inner table's.
      items: sql<number>`(select count(*)::int from knowledge_items i
        where i.folder_id = "knowledge_folders"."id" and i.deleted_at is null)`,
    })
    .from(knowledgeFolders)
    .where(eq(knowledgeFolders.workspaceId, workspaceId))
    .orderBy(asc(knowledgeFolders.position), asc(knowledgeFolders.name));
  return rows as KnowledgeFolderRow[];
}

export async function createKnowledgeFolder(
  tx: Tx,
  workspaceId: string,
  input: {
    name: string;
    description?: string | null;
    parentId?: string | null;
    isExample?: boolean;
  },
  actorId: string,
) {
  const name = input.name.trim().replace(/\s+/g, ' ');
  if (!name) throw new AccountError('knowledge_folder_name_required');
  const id = uuidv7();
  await call(() =>
    tx.insert(knowledgeFolders).values({
      id,
      workspaceId,
      parentId: input.parentId ?? null,
      name,
      description: input.description?.trim() || null,
      isExample: input.isExample ?? false,
      createdBy: actorId,
    }),
  );
  return id;
}

export async function updateKnowledgeFolder(
  tx: Tx,
  folderId: string,
  input: { name: string; description?: string | null; parentId?: string | null },
) {
  const name = input.name.trim().replace(/\s+/g, ' ');
  if (!name) throw new AccountError('knowledge_folder_name_required');
  const rows = await call(() =>
    tx
      .update(knowledgeFolders)
      .set({
        name,
        description: input.description?.trim() || null,
        parentId: input.parentId ?? null,
      })
      .where(eq(knowledgeFolders.id, folderId))
      .returning({ id: knowledgeFolders.id }),
  );
  if (rows.length === 0) throw new AccountError('no_access');
}

/** Deletes an empty folder. */
export async function deleteKnowledgeFolder(tx: Tx, folderId: string) {
  const rows = await call(() =>
    tx
      .delete(knowledgeFolders)
      .where(eq(knowledgeFolders.id, folderId))
      .returning({ id: knowledgeFolders.id }),
  );
  if (rows.length === 0) throw new AccountError('no_access');
}

// ---- Items ----

/** Lower case, trimmed, no repeats, at most 10 of 30 characters. */
export function cleanTags(tags: string[] = []): string[] {
  const out: string[] = [];
  for (const t of tags) {
    const tag = t.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 30);
    if (tag && !out.includes(tag)) out.push(tag);
  }
  return out.slice(0, 10);
}

function checkItem(input: KnowledgeItemInput) {
  const title = input.title.trim().replace(/\s+/g, ' ');
  if (!title) throw new AccountError('knowledge_title_required');
  const url = input.url?.trim() || null;
  if (url && !/^https?:\/\/\S+$/i.test(url)) throw new AccountError('knowledge_url_invalid');
  const clients = input.visibility === 'clients';
  if (clients && !input.allClients && !input.clientIds?.length)
    throw new AccountError('knowledge_clients_required');
  return {
    folderId: input.folderId,
    kind: input.kind,
    title,
    summary: input.summary?.trim() || null,
    body: input.body ?? '',
    url,
    tags: cleanTags(input.tags),
    visibility: input.visibility,
    roles: input.visibility === 'private' ? [] : [...new Set(input.roles ?? [])],
    allClients: clients ? Boolean(input.allClients) : false,
    status: input.status,
  };
}

async function setItemClients(tx: Tx, workspaceId: string, itemId: string, clientIds: string[]) {
  await call(() => tx.delete(knowledgeItemClients).where(eq(knowledgeItemClients.itemId, itemId)));
  if (clientIds.length)
    await call(() =>
      tx
        .insert(knowledgeItemClients)
        .values([...new Set(clientIds)].map((clientId) => ({ workspaceId, itemId, clientId }))),
    );
}

export async function createKnowledgeItem(
  tx: Tx,
  workspaceId: string,
  input: KnowledgeItemInput,
  actorId: string,
) {
  const values = checkItem(input);
  const id = uuidv7();
  await call(() =>
    tx.insert(knowledgeItems).values({
      id,
      workspaceId,
      ...values,
      isExample: input.isExample ?? false,
      createdBy: actorId,
      updatedBy: actorId,
    }),
  );
  if (values.visibility === 'clients' && !values.allClients)
    await setItemClients(tx, workspaceId, id, input.clientIds ?? []);
  return id;
}

export async function updateKnowledgeItem(
  tx: Tx,
  itemId: string,
  input: KnowledgeItemInput,
  actorId: string,
) {
  const values = checkItem(input);
  const rows = await call(() =>
    tx
      .update(knowledgeItems)
      .set({ ...values, updatedBy: actorId })
      .where(and(eq(knowledgeItems.id, itemId), isNull(knowledgeItems.deletedAt)))
      .returning({ workspaceId: knowledgeItems.workspaceId }),
  );
  if (rows.length === 0) throw new AccountError('knowledge_not_found');
  await setItemClients(
    tx,
    rows[0]!.workspaceId,
    itemId,
    values.visibility === 'clients' && !values.allClients ? (input.clientIds ?? []) : [],
  );
}

/** Deletes an item (kept for the record, gone from every list). */
export async function deleteKnowledgeItem(tx: Tx, itemId: string, actorId: string) {
  const rows = await call(() =>
    tx
      .update(knowledgeItems)
      .set({ deletedAt: new Date(), updatedBy: actorId })
      .where(and(eq(knowledgeItems.id, itemId), isNull(knowledgeItems.deletedAt)))
      .returning({ id: knowledgeItems.id }),
  );
  if (rows.length === 0) throw new AccountError('knowledge_not_found');
}

export type KnowledgeFilter = {
  folderId?: string | null;
  kind?: KnowledgeKind;
  tag?: string;
  /** Words in the title, summary, body or tags. */
  search?: string;
  limit?: number;
};

const updatedByName = sql<string | null>`(select p.full_name from profiles p
  where p.id = "knowledge_items"."updated_by")`;

/** The items the person can see, most recently changed first. */
export async function listKnowledgeItems(tx: Tx, workspaceId: string, f: KnowledgeFilter = {}) {
  const term = f.search
    ?.trim()
    .replace(/\s+/g, ' ')
    .slice(0, 100)
    .replace(/[\\%_]/g, (c) => `\\${c}`);
  return tx
    .select({
      id: knowledgeItems.id,
      folderId: knowledgeItems.folderId,
      kind: knowledgeItems.kind,
      title: knowledgeItems.title,
      summary: knowledgeItems.summary,
      url: knowledgeItems.url,
      tags: knowledgeItems.tags,
      visibility: knowledgeItems.visibility,
      roles: knowledgeItems.roles,
      allClients: knowledgeItems.allClients,
      status: knowledgeItems.status,
      isExample: knowledgeItems.isExample,
      createdBy: knowledgeItems.createdBy,
      updatedAt: knowledgeItems.updatedAt,
      updatedByName,
      clientCount: sql<number>`(select count(*)::int from knowledge_item_clients k
        where k.item_id = "knowledge_items"."id")`,
    })
    .from(knowledgeItems)
    .where(
      and(
        eq(knowledgeItems.workspaceId, workspaceId),
        isNull(knowledgeItems.deletedAt),
        f.folderId === undefined
          ? undefined
          : f.folderId === null
            ? isNull(knowledgeItems.folderId)
            : eq(knowledgeItems.folderId, f.folderId),
        f.kind ? eq(knowledgeItems.kind, f.kind) : undefined,
        f.tag ? sql`${f.tag} = any(${knowledgeItems.tags})` : undefined,
        term
          ? or(
              ilike(knowledgeItems.title, `%${term}%`),
              ilike(knowledgeItems.summary, `%${term}%`),
              ilike(knowledgeItems.body, `%${term}%`),
              sql`exists (select 1 from unnest(${knowledgeItems.tags}) t where t ilike ${`%${term}%`})`,
            )
          : undefined,
      ),
    )
    .orderBy(desc(knowledgeItems.updatedAt), asc(knowledgeItems.id))
    .limit(f.limit ?? 200);
}

/** One item with the clients it's shared with, or null when it isn't there for this person. */
export async function getKnowledgeItem(tx: Tx, itemId: string) {
  const [item] = await tx
    .select({
      item: knowledgeItems,
      updatedByName,
      createdByName: sql<string | null>`(select p.full_name from profiles p
        where p.id = "knowledge_items"."created_by")`,
    })
    .from(knowledgeItems)
    .where(and(eq(knowledgeItems.id, itemId), isNull(knowledgeItems.deletedAt)));
  if (!item) return null;
  const clients = await tx
    .select({ clientId: knowledgeItemClients.clientId })
    .from(knowledgeItemClients)
    .where(eq(knowledgeItemClients.itemId, itemId));
  return { ...item, clientIds: clients.map((c) => c.clientId) };
}

/** Tags in use, with how many items (that the person can see) carry each. */
export async function knowledgeTags(tx: Tx, workspaceId: string) {
  const rows = await tx.execute<{ tag: string; n: number }>(sql`
    select t as tag, count(*)::int as n
    from knowledge_items i, unnest(i.tags) t
    where i.workspace_id = ${workspaceId} and i.deleted_at is null
    group by t order by count(*) desc, t`);
  return rows.map((r) => ({ tag: r.tag, items: r.n }));
}

/** Names of the people who changed items, for lists (kept out of the hot query). */
export async function knowledgeAuthors(tx: Tx, userIds: string[]) {
  if (userIds.length === 0) return new Map<string, string>();
  const rows = await tx
    .select({ id: profiles.id, name: profiles.fullName })
    .from(profiles)
    .where(inArray(profiles.id, userIds));
  return new Map(rows.map((r) => [r.id, r.name ?? '']));
}

export type PortalKnowledgeItem = {
  id: string;
  kind: KnowledgeKind;
  title: string;
  summary: string | null;
  body: string;
  url: string | null;
  tags: string[];
  updatedAt: string;
  folder: string | null;
};

/** The client portal's guides for one client, read as one of its contacts. */
export async function portalKnowledge(tx: Tx, clientId: string): Promise<PortalKnowledgeItem[]> {
  const [row] = await tx.execute<{ items: PortalKnowledgeItem[] }>(
    sql`select portal_knowledge(${clientId}::uuid) as items`,
  );
  return row?.items ?? [];
}
