// Server only. The knowledge base (D-072): the database when signed in, the example store in
// example mode, where the one person is the owner.
import { AccountError } from '@agency-os/db';
import { ctxFor } from './ctx';
import * as dbKb from './db/knowledge';
import {
  KIND_LABELS,
  type KnowledgeFolder,
  type KnowledgeInput,
  type KnowledgeItem,
  type KnowledgeKind,
} from './knowledge-types';
import type { PortalSession } from './portal';
import { EXAMPLE_USER, newId, store } from './shared';

export type KnowledgeView = {
  folders: KnowledgeFolder[];
  items: KnowledgeItem[];
  tags: { tag: string; items: number }[];
  /** Every item the person can see, whatever the filters. */
  total: number;
  /** May add items, and may manage folders and share with clients. */
  rights: { add: boolean; manage: boolean };
};

export type KnowledgeQuery = {
  /** undefined: every item; null: items in no folder. */
  folderId?: string | null;
  kind?: KnowledgeKind;
  tag?: string;
  q?: string;
};

type Stored = Omit<KnowledgeItem, 'canEdit' | 'clientCount'>;

/** Example mode: the owner sees everything but other people's private items. */
const seen = (i: Stored) => i.visibility !== 'private' || i.createdBy === EXAMPLE_USER.name;
const withEdit = (i: Stored): KnowledgeItem => ({
  ...i,
  canEdit: true,
  clientCount: i.clientIds.length,
});

function matches(i: Stored, f: KnowledgeQuery) {
  const words = f.q?.trim().toLowerCase();
  return (
    (f.folderId === undefined || i.folderId === f.folderId) &&
    (!f.kind || i.kind === f.kind) &&
    (!f.tag || i.tags.includes(f.tag)) &&
    (!words ||
      [i.title, i.summary ?? '', i.body, i.kind, KIND_LABELS[i.kind], ...i.tags]
        .join(' ')
        .toLowerCase()
        .includes(words))
  );
}

export async function knowledge(slug: string, f: KnowledgeQuery = {}): Promise<KnowledgeView> {
  const ctx = await ctxFor(slug);
  if (ctx) {
    const view = await dbKb.knowledgeFor(ctx, {
      folderId: f.folderId,
      kind: f.kind,
      tag: f.tag,
      search: f.q,
    });
    return { ...view, rights: dbKb.knowledgeRightsFor(ctx) };
  }
  const s = store();
  const visible = s.knowledgeItems.filter(seen);
  const tags = new Map<string, number>();
  for (const i of visible) for (const t of i.tags) tags.set(t, (tags.get(t) ?? 0) + 1);
  return {
    folders: s.knowledgeFolders.map((folder) => ({
      ...folder,
      items: visible.filter((i) => i.folderId === folder.id).length,
    })),
    items: visible
      .filter((i) => matches(i, f))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(withEdit),
    tags: [...tags]
      .map(([tag, items]) => ({ tag, items }))
      .sort((a, b) => b.items - a.items || a.tag.localeCompare(b.tag)),
    total: visible.length,
    rights: { add: true, manage: true },
  };
}

export async function knowledgeItem(id: string, slug: string): Promise<KnowledgeItem | null> {
  const ctx = await ctxFor(slug);
  if (ctx) return dbKb.knowledgeItemFor(ctx, id);
  const found = store().knowledgeItems.find((i) => i.id === id);
  return found && seen(found) ? withEdit(found) : null;
}

export type KnowledgeOutcome = { id?: string; error?: string; field?: 'title' | 'url' | 'clients' };

const FIELD: Record<string, KnowledgeOutcome['field']> = {
  knowledge_title_required: 'title',
  knowledge_url_invalid: 'url',
  knowledge_clients_required: 'clients',
};

function failed(error: unknown): KnowledgeOutcome {
  if (!(error instanceof AccountError)) throw error;
  return { error: error.message, field: FIELD[error.code] };
}

/** Adds an item, or changes it when an id is given. */
export async function saveKnowledgeItem(
  input: KnowledgeInput,
  slug: string,
  id?: string,
): Promise<KnowledgeOutcome> {
  try {
    const ctx = await ctxFor(slug);
    if (ctx) return { id: await dbKb.saveKnowledgeItemFor(ctx, input, id) };
    const s = store();
    const now = new Date().toISOString();
    const clean = {
      ...input,
      roles: input.visibility === 'private' ? [] : input.roles,
      allClients: input.visibility === 'clients' && input.allClients,
      clientIds: input.visibility === 'clients' && !input.allClients ? input.clientIds : [],
    };
    if (id) {
      const at = s.knowledgeItems.findIndex((i) => i.id === id);
      if (at < 0) throw new AccountError('knowledge_not_found');
      s.knowledgeItems[at] = {
        ...s.knowledgeItems[at]!,
        ...clean,
        updatedAt: now,
        updatedBy: EXAMPLE_USER.name,
      };
      return { id };
    }
    const newIdValue = newId('kb');
    s.knowledgeItems.unshift({
      ...clean,
      id: newIdValue,
      updatedAt: now,
      updatedBy: EXAMPLE_USER.name,
      createdBy: EXAMPLE_USER.name,
    });
    return { id: newIdValue };
  } catch (error) {
    return failed(error);
  }
}

export async function deleteKnowledgeItem(id: string, slug: string): Promise<KnowledgeOutcome> {
  try {
    const ctx = await ctxFor(slug);
    if (ctx) {
      await dbKb.deleteKnowledgeItemFor(ctx, id);
      return {};
    }
    const s = store();
    s.knowledgeItems = s.knowledgeItems.filter((i) => i.id !== id);
    return {};
  } catch (error) {
    return failed(error);
  }
}

export type FolderInput = { name: string; description: string | null; parentId: string | null };

export async function saveKnowledgeFolder(
  input: FolderInput,
  slug: string,
  id?: string,
): Promise<KnowledgeOutcome> {
  try {
    const ctx = await ctxFor(slug);
    if (ctx) return { id: await dbKb.saveKnowledgeFolderFor(ctx, input, id) };
    const s = store();
    if (id) {
      // Not inside itself or one of its own subfolders.
      for (let at: string | null = input.parentId; at;) {
        if (at === id) throw new AccountError('knowledge_folder_parent_invalid');
        at = s.knowledgeFolders.find((f) => f.id === at)?.parentId ?? null;
      }
      const folder = s.knowledgeFolders.find((f) => f.id === id);
      if (!folder) throw new AccountError('no_access');
      Object.assign(folder, input);
      return { id };
    }
    const folderId = newId('kbf');
    s.knowledgeFolders.push({ ...input, id: folderId });
    return { id: folderId };
  } catch (error) {
    return failed(error);
  }
}

export async function deleteKnowledgeFolder(id: string, slug: string): Promise<KnowledgeOutcome> {
  try {
    const ctx = await ctxFor(slug);
    if (ctx) {
      await dbKb.deleteKnowledgeFolderFor(ctx, id);
      return {};
    }
    const s = store();
    if (
      s.knowledgeFolders.some((f) => f.parentId === id) ||
      s.knowledgeItems.some((i) => i.folderId === id)
    )
      throw new AccountError('knowledge_folder_not_empty');
    s.knowledgeFolders = s.knowledgeFolders.filter((f) => f.id !== id);
    return {};
  } catch (error) {
    return failed(error);
  }
}

/** The workspace's clients, to share items with. */
export async function sharingClients(slug: string) {
  const ctx = await ctxFor(slug);
  if (ctx) return dbKb.sharingClientsFor(ctx);
  return store().clients.map((c) => ({ id: c.id, name: c.name }));
}

export type PortalGuide = {
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

/** The guides the agency shares with this client: published, for all clients or this one. */
export async function portalGuides(session: PortalSession): Promise<PortalGuide[]> {
  if (session.db) return dbKb.portalGuidesFor(session.db);
  const s = store();
  const folderName = (id: string | null) =>
    s.knowledgeFolders.find((f) => f.id === id)?.name ?? null;
  return s.knowledgeItems
    .filter(
      (i) =>
        i.visibility === 'clients' &&
        i.status === 'published' &&
        (i.allClients || i.clientIds.includes(session.clientId)),
    )
    .map((i) => ({
      id: i.id,
      kind: i.kind,
      title: i.title,
      summary: i.summary,
      body: i.body,
      url: i.url,
      tags: i.tags,
      updatedAt: i.updatedAt,
      folder: folderName(i.folderId),
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}
