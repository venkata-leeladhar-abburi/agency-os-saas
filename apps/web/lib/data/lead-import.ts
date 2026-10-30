// Server only. Leads in and out as CSV.
import {
  DEFAULT_SERVICES,
  LEAD_SOURCE_LABELS,
  nextFollowUp,
  toCsv,
  toLeadImport,
  type LeadImportMapping,
} from '@agency-os/core';
import { normaliseIndianPhone } from '../auth/helpers';
import { ctxFor } from './ctx';
import { importLeadsFor } from './db/lead-import';
import { leadList } from './db/people';
import { activity, EXAMPLE_USER, newId, store } from './shared';
import { STAGES, type StageId } from './types';

export const MAX_IMPORT_ROWS = 5000;

export type ImportResult = {
  imported: number;
  skipped: { row: number; name: string; reasons: string[] }[];
};

const key = (v: string | null) => v?.toLowerCase().replace(/[^\d+a-z@.]/g, '') ?? '';

/** A row that passed the checks, ready to add as a lead. */
export type ImportRow = {
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  /** The stage's name as written in the file, or null for the first stage. */
  stage: string | null;
  open: boolean;
  valueMinor: bigint;
  source: keyof typeof LEAD_SOURCE_LABELS;
  service: string;
  notes: string;
};

/**
 * Checks rows the same way in example mode and on the database: rows with problems, leads already
 * in the workspace (same email or phone) and open leads beyond `room` are skipped with a reason.
 * `closed` names the stages that aren't open (Won, Lost); `refuse` names stages a row can't go
 * to, with why.
 */
export function checkImportRows(
  rows: string[][],
  mapping: LeadImportMapping,
  room: number,
  existing: { email: string | null; phone: string | null }[],
  closed: (stage: string | null) => boolean,
  refuse: (stage: string | null) => string | null = () => null,
) {
  const seen = new Set(
    existing.flatMap((l) => [l.email, l.phone].filter(Boolean).map((v) => key(v))),
  );
  const accepted: { row: number; lead: ImportRow }[] = [];
  const skipped: ImportResult['skipped'] = [];
  let openAdded = 0;
  rows.slice(0, MAX_IMPORT_ROWS).forEach((cells, i) => {
    if (cells.every((c) => !c.trim())) return;
    const row = i + 2; // the header is row 1
    const checked = toLeadImport(cells, mapping, 'INR');
    if (!checked.ok) {
      const name = cells[mapping.company ?? -1] || cells[mapping.name ?? -1] || '—';
      skipped.push({ row, name, reasons: checked.errors });
      return;
    }
    const l = checked.lead;
    const phone = l.phone ? (normaliseIndianPhone(l.phone) ?? l.phone) : null;
    const dupe = [l.email, phone].filter(Boolean).find((v) => seen.has(key(v)));
    if (dupe) {
      skipped.push({
        row,
        name: l.company ?? l.name,
        reasons: [`Already a lead (same ${dupe === l.email ? 'email' : 'phone'}).`],
      });
      return;
    }
    const stage = l.stage?.trim() || null;
    const refused = refuse(stage);
    if (refused) {
      skipped.push({ row, name: l.company ?? l.name, reasons: [refused] });
      return;
    }
    const open = !closed(stage);
    if (open && openAdded >= room) {
      skipped.push({
        row,
        name: l.company ?? l.name,
        reasons: ['Your plan’s limit of open leads is reached. Upgrade to import the rest.'],
      });
      return;
    }
    if (open) openAdded += 1;
    for (const v of [l.email, phone]) if (v) seen.add(key(v));
    const service =
      DEFAULT_SERVICES.find((sv) => sv.toLowerCase() === l.service?.trim().toLowerCase()) ??
      l.service ??
      '';
    accepted.push({
      row,
      lead: {
        name: l.name,
        company: l.company,
        email: l.email,
        phone,
        stage,
        open,
        valueMinor: l.valueMinor ?? 0n,
        source: l.source,
        service,
        notes: l.notes ?? '',
      },
    });
  });
  return { accepted, skipped };
}

const stageOf = (name: string | null) =>
  STAGES.find((st) => st.name.toLowerCase() === name?.toLowerCase())?.id ?? ('new' as StageId);

/**
 * Imports checked rows; skips rows with problems, leads already in the workspace, and open
 * leads beyond `room` (what the plan has left).
 */
export async function importLeads(
  rows: string[][],
  mapping: LeadImportMapping,
  room = Infinity,
  slug?: string,
): Promise<ImportResult> {
  const ctx = await ctxFor(slug);
  if (ctx) return importLeadsFor(ctx, rows, mapping, room);
  const s = store();
  const { accepted, skipped } = checkImportRows(rows, mapping, room, s.leads, (name) => {
    const stage = stageOf(name);
    return stage === 'won' || stage === 'lost';
  });
  const now = new Date();
  for (const { lead: l } of accepted) {
    const stage = stageOf(l.stage);
    s.leads.unshift({
      id: newId('lead'),
      name: l.name,
      company: l.company,
      email: l.email,
      phone: l.phone,
      stage,
      valueMinor: l.valueMinor,
      source: l.source,
      service: l.service,
      owner: EXAMPLE_USER.name,
      followUpAt: l.open ? nextFollowUp(now, 'Asia/Kolkata').toISOString() : null,
      notes: l.notes,
      lostReason: null,
      clientId: null,
      createdAt: now.toISOString(),
      activities: [activity('imported', 'imported the lead from a CSV')],
    });
  }
  return { imported: accepted.length, skipped };
}

export async function leadsCsv(slug?: string): Promise<string> {
  const ctx = await ctxFor(slug);
  const list = ctx ? await leadList(ctx) : store().leads;
  return toCsv(
    list.map((l) => ({
      Name: l.name,
      Company: l.company ?? '',
      Email: l.email ?? '',
      Phone: l.phone ?? '',
      Stage: STAGES.find((s) => s.id === l.stage)!.name,
      Value: (Number(l.valueMinor) / 100).toFixed(2),
      Source: LEAD_SOURCE_LABELS[l.source],
      Service: l.service,
      Owner: l.owner,
      Notes: l.notes,
    })),
  );
}

/** The template people can download and fill in. */
export const IMPORT_TEMPLATE = toCsv([
  {
    Name: 'Example: Priya Shah',
    Company: 'Example Stores',
    Email: 'priya@example.in',
    Phone: '+91 98480 22331',
    Source: 'Referral',
    Value: '40,000',
    Service: 'Website',
    Notes: '',
  },
]);
