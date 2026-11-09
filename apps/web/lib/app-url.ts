/**
 * The address used for links in emails and PDFs: NEXT_PUBLIC_APP_URL when set (production),
 * else this deployment's own address on Vercel (previews), else empty.
 */
export function resolveAppUrl(env: Record<string, string | undefined> = process.env): string {
  const set = env.NEXT_PUBLIC_APP_URL?.trim();
  const vercel = env.VERCEL_URL?.trim();
  const url = set || (vercel ? `https://${vercel}` : '');
  return url.replace(/\/+$/, '');
}
