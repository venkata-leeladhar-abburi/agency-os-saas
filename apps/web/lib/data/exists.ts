// Server only. Whether the record a workspace link points at is there, so a missing one answers
// with a real 404 (D-073). A cheap check run before the page starts streaming; the page still
// loads the record itself.
import { recordVisible, type RecordKind } from '@agency-os/db';
import { asMember } from '../server/workspace';
import { ctxFor } from './ctx';
import { seenInExample } from './knowledge';
import { store } from './shared';

export type { RecordKind };

/** Segments that are pages of their own, not record ids. */
const NOT_IDS = new Set(['new', 'import', 'folders']);

const ROUTES: [RegExp, RecordKind][] = [
  [/^\/leads\/([^/]+)$/, 'lead'],
  [/^\/clients\/([^/]+)$/, 'client'],
  [/^\/projects\/([^/]+)$/, 'project'],
  [/^\/tasks\/([^/]+)$/, 'task'],
  [/^\/invoices\/([^/]+)$/, 'invoice'],
  [/^\/sales\/quotes\/([^/]+)$/, 'quote'],
  [/^\/sales\/proposals\/([^/]+)$/, 'proposal'],
  [/^\/knowledge\/([^/]+)(?:\/edit)?$/, 'knowledge'],
  [/^\/knowledge\/folders\/([^/]+)$/, 'knowledge-folder'],
];

/** The record a workspace path shows, if it's a record page: "/w/acme/leads/123" is lead 123. */
export function recordAt(pathname: string, slug: string): { kind: RecordKind; id: string } | null {
  const prefix = `/w/${slug}`;
  if (!pathname.startsWith(`${prefix}/`)) return null;
  const rest = pathname.slice(prefix.length).replace(/\/+$/, '');
  for (const [pattern, kind] of ROUTES) {
    const id = pattern.exec(rest)?.[1];
    if (id && !NOT_IDS.has(id)) {
      try {
        return { kind, id: decodeURIComponent(id) };
      } catch {
        return { kind, id };
      }
    }
  }
  return null;
}

/**
 * Whether the person can see the record. Never stricter than the page: each check matches what
 * the page's own query finds (RLS decides who sees what), so a "no" here is a page that would
 * have said "not found" anyway.
 */
export async function recordExists(kind: RecordKind, id: string, slug: string): Promise<boolean> {
  const ctx = await ctxFor(slug);
  if (!ctx) return inExample(kind, id);
  return asMember(ctx, (tx) => recordVisible(tx, ctx.workspaceId, kind, id));
}

function inExample(kind: RecordKind, id: string): boolean {
  const s = store();
  const has = (list: { id: string }[]) => list.some((r) => r.id === id);
  switch (kind) {
    case 'lead':
      return has(s.leads);
    case 'client':
      return has(s.clients);
    case 'project':
      return has(s.projects);
    case 'task':
      return has(s.tasks);
    case 'invoice':
      return has(s.invoices);
    case 'quote':
      return has(s.quotes);
    case 'proposal':
      return has(s.proposals);
    case 'knowledge':
      return s.knowledgeItems.some((i) => i.id === id && seenInExample(i));
    case 'knowledge-folder':
      return has(s.knowledgeFolders);
  }
}
