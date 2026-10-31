import { KNOWLEDGE_KINDS, type KnowledgeKind } from '@/lib/data/knowledge-types';
import type { KnowledgeQuery } from '@/lib/data/knowledge';

/** The knowledge pages' filters from their link, checked. */
export function readQuery(sp: Record<string, string | undefined>): KnowledgeQuery {
  const kind = (KNOWLEDGE_KINDS as readonly string[]).includes(sp.kind ?? '')
    ? (sp.kind as KnowledgeKind)
    : undefined;
  const q = sp.q?.trim().slice(0, 100) || undefined;
  const tag = sp.tag?.trim().toLowerCase().slice(0, 30) || undefined;
  return { kind, q, tag };
}
