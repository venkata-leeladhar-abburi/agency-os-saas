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
import { activity, EXAMPLE_USER, newId, store } from './shared';
import { STAGES, type StageId } from './types';

export const MAX_IMPORT_ROWS = 5000;

export type ImportResult = {
  imported: number;
  skipped: { row: number; name: string; reasons: string[] }[];
};

const key = (v: string | null) => v?.toLowerCase().replace(/[^\d+a-z@.]/g, '') ?? '';

/** Imports checked rows; skips rows with problems and leads already in the workspace. */
export async function importLeads(
  rows: string[][],
  mapping: LeadImportMapping,
): Promise<ImportResult> {
  const s = store();
  const seen = new Set(
    s.leads.flatMap((l) => [l.email, l.phone].filter(Boolean).map((v) => key(v))),
  );
  const result: ImportResult = { imported: 0, skipped: [] };
  const now = new Date();
  rows.slice(0, MAX_IMPORT_ROWS).forEach((cells, i) => {
    if (cells.every((c) => !c.trim())) return;
    const row = i + 2; // the header is row 1
    const checked = toLeadImport(cells, mapping, 'INR');
    if (!checked.ok) {
      const name = cells[mapping.company ?? -1] || cells[mapping.name ?? -1] || '—';
      result.skipped.push({ row, name, reasons: checked.errors });
      return;
    }
    const l = checked.lead;
    const phone = l.phone ? (normaliseIndianPhone(l.phone) ?? l.phone) : null;
    const dupe = [l.email, phone].filter(Boolean).find((v) => seen.has(key(v)));
    if (dupe) {
      result.skipped.push({
        row,
        name: l.company ?? l.name,
        reasons: [`Already a lead (same ${dupe === l.email ? 'email' : 'phone'}).`],
      });
      return;
    }
    for (const v of [l.email, phone]) if (v) seen.add(key(v));
    const stage =
      STAGES.find((st) => st.name.toLowerCase() === l.stage?.trim().toLowerCase())?.id ??
      ('new' as StageId);
    const service =
      DEFAULT_SERVICES.find((sv) => sv.toLowerCase() === l.service?.trim().toLowerCase()) ??
      l.service ??
      '';
    s.leads.unshift({
      id: newId('lead'),
      name: l.name,
      company: l.company,
      email: l.email,
      phone,
      stage,
      valueMinor: l.valueMinor ?? 0n,
      source: l.source,
      service,
      owner: EXAMPLE_USER.name,
      followUpAt:
        stage === 'won' || stage === 'lost'
          ? null
          : nextFollowUp(now, 'Asia/Kolkata').toISOString(),
      notes: l.notes ?? '',
      lostReason: null,
      clientId: null,
      createdAt: now.toISOString(),
      activities: [activity('imported', 'imported the lead from a CSV')],
    });
    result.imported += 1;
  });
  return result;
}

export async function leadsCsv(): Promise<string> {
  return toCsv(
    store().leads.map((l) => ({
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
