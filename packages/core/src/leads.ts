import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing';

/** Lead defaults (defaults-and-content.md §2). */
export type StageKind = 'open' | 'won' | 'lost';

export const DEFAULT_PIPELINE_STAGES: readonly { name: string; kind: StageKind }[] = [
  { name: 'New', kind: 'open' },
  { name: 'Contacted', kind: 'open' },
  { name: 'Proposal', kind: 'open' },
  { name: 'Won', kind: 'won' },
  { name: 'Lost', kind: 'lost' },
];

export const LEAD_SOURCES = [
  'referral',
  'instagram',
  'linkedin',
  'website',
  'marketplace',
  'ads',
  'indiamart',
  'whatsapp',
  'other',
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  referral: 'Referral',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  website: 'Website',
  marketplace: 'Marketplace',
  ads: 'Ads',
  indiamart: 'IndiaMART',
  whatsapp: 'WhatsApp',
  other: 'Other',
};

export const LOST_REASONS = [
  'price',
  'timing',
  'chose_another_provider',
  'no_reply',
  'not_a_fit',
  'budget_cut',
  'other',
] as const;
export type LostReason = (typeof LOST_REASONS)[number];

export const LOST_REASON_LABELS: Record<LostReason, string> = {
  price: 'Price',
  timing: 'Timing',
  chose_another_provider: 'Chose another provider',
  no_reply: 'No reply',
  not_a_fit: 'Not a fit',
  budget_cut: 'Budget cut',
  other: 'Other',
};

export const DEFAULT_SERVICES = [
  'Website',
  'Landing page',
  'Brand identity',
  'UI/UX design',
  'Mobile app',
  'Web app or SaaS',
  'Online store',
  'ERP or internal tool',
  'SEO',
  'Ads',
  'Automation',
  'Maintenance',
] as const;

/** Matches a free-text source (from a CSV, say) to a known one; unknown text becomes Other. */
export function toLeadSource(text: string | null | undefined): LeadSource {
  const key = (text ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  return (
    LEAD_SOURCES.find((s) => s === key || LEAD_SOURCE_LABELS[s].toLowerCase() === key) ?? 'other'
  );
}

// ---- Follow-ups ----

function zonedParts(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    weekday: 'short',
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    second: Number(get('second')),
    weekday: get('weekday'),
  };
}

/** The instant when the wall clock in `timeZone` shows the given local date and time. */
export function zonedTime(
  local: { year: number; month: number; day: number; hour?: number; minute?: number },
  timeZone: string,
): Date {
  const wanted = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour ?? 0,
    local.minute ?? 0,
  );
  let guess = wanted;
  // Two passes settle the offset, including across a daylight-saving change.
  for (let i = 0; i < 2; i++) {
    const p = zonedParts(new Date(guess), timeZone);
    const shown = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    guess += wanted - shown;
  }
  return new Date(guess);
}

/** A new lead's follow-up: the next working day (Monday to Friday) at 11:00 in the workspace's time zone. */
export function nextFollowUp(from: Date, timeZone: string): Date {
  const today = zonedParts(from, timeZone);
  const date = new Date(Date.UTC(today.year, today.month - 1, today.day));
  do date.setUTCDate(date.getUTCDate() + 1);
  while (date.getUTCDay() === 0 || date.getUTCDay() === 6);
  return zonedTime(
    {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: 11,
    },
    timeZone,
  );
}

// ---- Board order ----

/**
 * Order keys for cards and stages (fractional indexing): a key between two neighbours, so a
 * move writes one row. `before` and `after` are the neighbours' keys, or null at either end.
 */
export function positionBetween(before: string | null, after: string | null): string {
  return generateKeyBetween(before, after);
}

export function positions(count: number, after: string | null = null): string[] {
  return generateNKeysBetween(after, null, count);
}
