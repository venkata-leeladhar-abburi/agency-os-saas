// Server only. The knowledge base on the database, as the member (RLS decides what's there).
import { can, ROLES, scopeOf, type Role } from '@agency-os/core';
import {
  AccountError,
  countKnowledgeItems,
  createKnowledgeFolder,
  createKnowledgeItem,
  deleteKnowledgeFolder,
  deleteKnowledgeItem,
  getKnowledgeItem,
  knowledgeAuthors,
  knowledgeTags,
  listClients,
  listKnowledgeFolders,
  listKnowledgeItems,
  portalKnowledge,
  updateKnowledgeFolder,
  updateKnowledgeItem,
  type KnowledgeFilter,
} from '@agency-os/db';
import { asContact, type PortalCtx } from '../../server/portal';
import { asMember, type WorkspaceCtx } from '../../server/workspace';
import type { KnowledgeFolder, KnowledgeInput, KnowledgeItem } from '../knowledge-types';

const asRoles = (roles: string[]) =>
  roles.filter((r): r is Role => (ROLES as readonly string[]).includes(r));

function mayEdit(ctx: WorkspaceCtx, item: { createdBy: string | null; visibility: string }) {
  const mine = item.createdBy === ctx.session.userId;
  if (mine) return can(ctx.role, 'knowledge.write', true);
  return item.visibility !== 'private' && can(ctx.role, 'knowledge.write');
}

export async function knowledgeFor(ctx: WorkspaceCtx, filter: KnowledgeFilter) {
  return asMember(ctx, async (tx) => {
    const [folders, rows, tags, total] = await Promise.all([
      listKnowledgeFolders(tx, ctx.workspaceId),
      listKnowledgeItems(tx, ctx.workspaceId, filter),
      knowledgeTags(tx, ctx.workspaceId),
      countKnowledgeItems(tx, ctx.workspaceId),
    ]);
    const creators = await knowledgeAuthors(tx, [
      ...new Set(rows.map((r) => r.createdBy).filter((x): x is string => Boolean(x))),
    ]);
    const items: KnowledgeItem[] = rows.map((r) => ({
      id: r.id,
      folderId: r.folderId,
      kind: r.kind,
      title: r.title,
      summary: r.summary,
      body: '',
      url: r.url,
      tags: r.tags,
      visibility: r.visibility,
      roles: asRoles(r.roles),
      allClients: r.allClients,
      clientIds: [],
      clientCount: r.clientCount,
      status: r.status,
      updatedAt: r.updatedAt.toISOString(),
      updatedBy: r.updatedByName ?? '',
      createdBy: (r.createdBy && creators.get(r.createdBy)) || '',
      canEdit: mayEdit(ctx, r),
      example: r.isExample || undefined,
    }));
    return {
      folders: folders.map<KnowledgeFolder>((f) => ({
        id: f.id,
        parentId: f.parentId,
        name: f.name,
        description: f.description,
        items: f.items,
        example: f.isExample || undefined,
      })),
      items,
      tags,
      total,
    };
  });
}

export async function knowledgeItemFor(
  ctx: WorkspaceCtx,
  id: string,
): Promise<KnowledgeItem | null> {
  return asMember(ctx, async (tx) => {
    const found = await getKnowledgeItem(tx, id);
    if (!found || found.item.workspaceId !== ctx.workspaceId) return null;
    const i = found.item;
    return {
      id: i.id,
      folderId: i.folderId,
      kind: i.kind,
      title: i.title,
      summary: i.summary,
      body: i.body,
      url: i.url,
      tags: i.tags,
      visibility: i.visibility,
      roles: asRoles(i.roles),
      allClients: i.allClients,
      clientIds: found.clientIds,
      clientCount: found.clientIds.length,
      status: i.status,
      updatedAt: i.updatedAt.toISOString(),
      updatedBy: found.updatedByName ?? '',
      createdBy: found.createdByName ?? '',
      canEdit: mayEdit(ctx, i),
      example: i.isExample || undefined,
    };
  });
}

/** What this member may do: add items, share with clients, and manage folders. */
export function knowledgeRightsFor(ctx: WorkspaceCtx) {
  const scope = scopeOf(ctx.role, 'knowledge.write');
  return { add: scope !== undefined, manage: scope === 'all' };
}

export function saveKnowledgeItemFor(ctx: WorkspaceCtx, input: KnowledgeInput, id?: string) {
  return asMember(ctx, (tx) =>
    id
      ? updateKnowledgeItem(tx, id, input, ctx.session.userId).then(() => id)
      : createKnowledgeItem(tx, ctx.workspaceId, input, ctx.session.userId),
  );
}

export function deleteKnowledgeItemFor(ctx: WorkspaceCtx, id: string) {
  return asMember(ctx, (tx) => deleteKnowledgeItem(tx, id, ctx.session.userId));
}

export function saveKnowledgeFolderFor(
  ctx: WorkspaceCtx,
  input: { name: string; description: string | null; parentId: string | null },
  id?: string,
) {
  return asMember(ctx, (tx) =>
    id
      ? updateKnowledgeFolder(tx, id, input).then(() => id)
      : createKnowledgeFolder(tx, ctx.workspaceId, input, ctx.session.userId),
  );
}

export function deleteKnowledgeFolderFor(ctx: WorkspaceCtx, id: string) {
  return asMember(ctx, (tx) => deleteKnowledgeFolder(tx, id));
}

/** Clients to share items with. */
export async function sharingClientsFor(ctx: WorkspaceCtx) {
  const rows = await asMember(ctx, (tx) => listClients(tx, ctx.workspaceId, { limit: null }));
  return rows.map((c) => ({ id: c.id, name: c.name }));
}

/** The portal's guides, read as the client's contact. */
export function portalGuidesFor(pc: PortalCtx) {
  return asContact(pc, (tx) => portalKnowledge(tx, pc.clientId));
}

export { AccountError };
