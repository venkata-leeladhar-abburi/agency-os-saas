// The knowledge base's shapes and words, shared by the server and the screens.
import type { Role } from '@agency-os/core';

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

export const KIND_LABELS: Record<KnowledgeKind, string> = {
  process: 'Process or SOP',
  prompt: 'Prompt',
  tool: 'Tool',
  website: 'Website',
  component: 'Component',
  template: 'Template',
  checklist: 'Checklist',
  board: 'Board',
  learning: 'Learning',
};

export type KnowledgeVisibility = 'private' | 'team' | 'clients';
export type KnowledgeStatus = 'draft' | 'published';

export type KnowledgeFolder = {
  id: string;
  parentId: string | null;
  name: string;
  description: string | null;
  /** Items in this folder the person can see. */
  items: number;
  example?: boolean;
};

export type KnowledgeItem = {
  id: string;
  folderId: string | null;
  kind: KnowledgeKind;
  title: string;
  summary: string | null;
  body: string;
  url: string | null;
  tags: string[];
  visibility: KnowledgeVisibility;
  roles: Role[];
  allClients: boolean;
  /** The clients it's shared with; lists leave them out and give only the count. */
  clientIds: string[];
  clientCount: number;
  status: KnowledgeStatus;
  /** ISO timestamp. */
  updatedAt: string;
  updatedBy: string;
  createdBy: string;
  /** Whether this person may change or delete it. */
  canEdit: boolean;
  example?: boolean;
};

export type KnowledgeInput = {
  folderId: string | null;
  kind: KnowledgeKind;
  title: string;
  summary: string | null;
  body: string;
  url: string | null;
  tags: string[];
  visibility: KnowledgeVisibility;
  roles: Role[];
  allClients: boolean;
  clientIds: string[];
  status: KnowledgeStatus;
};

/** Who sees an item, in a few words: "Only you", "Team", "Finance and HR", "2 clients". */
export function audienceText(
  item: Pick<KnowledgeItem, 'visibility' | 'roles' | 'allClients' | 'clientCount'>,
  roleLabels: Record<Role, string>,
): string {
  if (item.visibility === 'private') return 'Only you';
  if (item.visibility === 'clients')
    return item.allClients
      ? 'Team and all clients'
      : `Team and ${item.clientCount} ${item.clientCount === 1 ? 'client' : 'clients'}`;
  if (item.roles.length === 0) return 'Team';
  const names = item.roles.map((r) => roleLabels[r]);
  return names.length === 1 ? names[0]! : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

/** A folder's path from the top, for breadcrumbs and pickers. */
export function folderPath(folders: KnowledgeFolder[], id: string | null): KnowledgeFolder[] {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const path: KnowledgeFolder[] = [];
  let at = id ? byId.get(id) : undefined;
  while (at && path.length < 20) {
    path.unshift(at);
    at = at.parentId ? byId.get(at.parentId) : undefined;
  }
  return path;
}

/** Folders as a tree, in order, with their depth, for the sidebar and pickers. */
export function folderTree(folders: KnowledgeFolder[]): (KnowledgeFolder & { depth: number })[] {
  const out: (KnowledgeFolder & { depth: number })[] = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const f of folders.filter((x) => x.parentId === parentId)) {
      out.push({ ...f, depth });
      if (depth < 10) walk(f.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}
