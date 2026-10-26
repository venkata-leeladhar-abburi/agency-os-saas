// Server only.
import type { Session } from '@agency-os/db';
import { redirect } from 'next/navigation';
import { supabaseServer } from '../supabase/server';

/** Who is signed in, checked with Supabase (not just read from the cookie). */
export async function currentSession(): Promise<Session | null> {
  const supabase = await supabaseServer();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ? { userId: data.user.id, email: data.user.email ?? null } : null;
}

export async function requireSession(next: string): Promise<Session> {
  const session = await currentSession();
  if (!session) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  return session;
}

/** The address the app is served from, for links in emails and redirects. */
export function appOrigin(requestHeaders: Headers) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, '');
  if (configured) return configured;
  const host =
    requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host') ?? 'localhost:3000';
  const proto =
    requestHeaders.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}
