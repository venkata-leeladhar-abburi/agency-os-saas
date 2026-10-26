/**
 * The Supabase project address, reduced to its origin. People often paste the REST address
 * (https://ref.supabase.co/rest/v1/) from the dashboard; the client libraries need only the origin.
 */
export function supabaseUrl(raw: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL) {
  if (!raw) return undefined;
  try {
    return new URL(raw.trim()).origin;
  } catch {
    return undefined;
  }
}

export function supabaseKey(raw: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  return raw?.trim() || undefined;
}

/** True when both public Supabase values are set, so sign-in can work. */
export function authConfigured() {
  return Boolean(supabaseUrl() && supabaseKey());
}
