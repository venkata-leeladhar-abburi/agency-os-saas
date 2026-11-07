// The leads page's filters: read from its link, written back as a link, and checked so a stale
// or edited link (or remembered value) only ever filters by things that exist.
import { LEAD_SOURCES, type LeadSource } from '@agency-os/core';

export type LeadFilter = { source?: LeadSource; owner?: string; due?: boolean };

export function parseLeadFilter(params: {
  source?: string | null;
  owner?: string | null;
  due?: string | null;
}): LeadFilter {
  const f: LeadFilter = {};
  if (params.source && (LEAD_SOURCES as readonly string[]).includes(params.source))
    f.source = params.source as LeadSource;
  const owner = params.owner?.trim();
  if (owner && owner.length <= 120) f.owner = owner;
  if (params.due === '1') f.due = true;
  return f;
}

/** The filter as link parameters, always in the same order: `source=…&owner=…&due=1`. */
export function leadFilterQuery(f: LeadFilter): string {
  return new URLSearchParams({
    ...(f.source ? { source: f.source } : {}),
    ...(f.owner ? { owner: f.owner } : {}),
    ...(f.due ? { due: '1' } : {}),
  }).toString();
}

/** Reads a saved or remembered query back, keeping only what's valid. */
export function leadFilterFromQuery(query: string): LeadFilter {
  const p = new URLSearchParams(query);
  return parseLeadFilter({ source: p.get('source'), owner: p.get('owner'), due: p.get('due') });
}

export const hasLeadFilter = (f: LeadFilter) => Boolean(f.source || f.owner || f.due);

/** The cookie that remembers a person's last filters on a workspace's leads page. */
export const leadFilterCookie = (workspace: string) => `aos-leads-filter-${workspace}`;
