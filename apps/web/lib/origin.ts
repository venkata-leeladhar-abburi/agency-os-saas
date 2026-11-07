// Server only. The site's own address, for links people open outside the app.
import { headers } from 'next/headers';

export async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

/** The caller's address, recorded with a signature. */
export async function callerIp(): Promise<string> {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
}

/** The caller's browser, for the signing record; cut to a sane length. */
export async function callerUserAgent(): Promise<string | null> {
  return (await headers()).get('user-agent')?.slice(0, 300) ?? null;
}
