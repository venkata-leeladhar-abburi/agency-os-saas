'use server';

import { LEAD_IMPORT_FIELDS, parseCsv, type LeadImportMapping } from '@agency-os/core';
import { revalidatePath } from 'next/cache';
import { importLeads, MAX_IMPORT_ROWS, type ImportResult } from '@/lib/data/lead-import';
import { checkRoom } from '@/lib/data/plan';

export type ImportState = { result?: ImportResult; message?: string };

const MAX_BYTES = 5 * 1024 * 1024;

export async function importLeadsAction(
  slug: string,
  _prev: ImportState,
  form: FormData,
): Promise<ImportState> {
  const csv = String(form.get('csv') ?? '');
  if (!csv.trim()) return { message: 'Choose a CSV file first.' };
  if (csv.length > MAX_BYTES)
    return { message: 'This file is over 5 MB. Split it into smaller files.' };
  let mapping: LeadImportMapping = {};
  try {
    const raw = JSON.parse(String(form.get('mapping') ?? '{}')) as Record<string, unknown>;
    for (const field of LEAD_IMPORT_FIELDS) {
      const index = raw[field];
      if (typeof index === 'number' && Number.isInteger(index) && index >= 0)
        mapping[field] = index;
    }
  } catch {
    mapping = {};
  }
  if (mapping.name === undefined && mapping.company === undefined)
    return { message: 'Pick which column has the name or the company.' };
  const [, ...rows] = parseCsv(csv);
  if (rows.length > MAX_IMPORT_ROWS)
    return {
      message: `This file has ${rows.length.toLocaleString('en-IN')} rows. Import up to 5,000 at a time.`,
    };
  const { limit, used } = await checkRoom('open_leads', 0);
  const room = limit === null ? Infinity : Math.max(0, limit - used);
  const result = await importLeads(rows, mapping, room);
  revalidatePath(`/w/${slug}`, 'layout');
  return { result };
}
