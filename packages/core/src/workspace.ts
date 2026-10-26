/** Defaults a new workspace gets from its country (PRD E0.2: India sets INR, en-IN and IST). */
export type WorkspaceDefaults = { currency: string; locale: string; timeZone: string };

const DEFAULTS: Record<string, WorkspaceDefaults> = {
  IN: { currency: 'INR', locale: 'en-IN', timeZone: 'Asia/Kolkata' },
  US: { currency: 'USD', locale: 'en-US', timeZone: 'America/New_York' },
  GB: { currency: 'GBP', locale: 'en-GB', timeZone: 'Europe/London' },
  AE: { currency: 'AED', locale: 'en-GB', timeZone: 'Asia/Dubai' },
  SG: { currency: 'SGD', locale: 'en-GB', timeZone: 'Asia/Singapore' },
  AU: { currency: 'AUD', locale: 'en-GB', timeZone: 'Australia/Sydney' },
  CA: { currency: 'CAD', locale: 'en-US', timeZone: 'America/Toronto' },
};

export const SUPPORTED_COUNTRIES = Object.keys(DEFAULTS);

export function workspaceDefaults(country: string): WorkspaceDefaults {
  const defaults = DEFAULTS[country.toUpperCase()];
  if (!defaults) throw new RangeError(`No defaults for country ${country}`);
  return defaults;
}

/** URL slug from a workspace name: "One Stop Solutions" → "one-stop-solutions". */
export function slugify(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/g, '');
  return slug || 'workspace';
}

/** Invoice prefix from the workspace's initials: "One Stop Solutions" → "OSS". */
export function initialsPrefix(name: string): string {
  const letters = name
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase())
    .join('');
  return (letters || 'INV').slice(0, 6);
}

/** Invitations expire after 7 days (PRD E0.2). */
export const INVITE_TTL_DAYS = 7;

export function inviteExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
}
