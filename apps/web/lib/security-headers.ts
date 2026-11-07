// Response headers from security-and-compliance.md: a nonce-based CSP per request (set in
// proxy.ts) and fixed headers for every response (next.config.ts).

/**
 * The Content-Security-Policy for app pages. Scripts need this request's nonce
 * ('strict-dynamic' lets Next's own chunks load); styles allow inline because React style
 * attributes and the portal's brand colour sheet are inline. Images allow data: (logos in
 * example mode) and https: (signed storage URLs).
 */
export function contentSecurityPolicy(
  nonce: string,
  { dev = false, supabaseUrl }: { dev?: boolean; supabaseUrl?: string } = {},
): string {
  const supabase = supabaseUrl ? new URL(supabaseUrl).origin : null;
  const directives: [string, ...string[]][] = [
    ['default-src', "'self'"],
    [
      'script-src',
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(dev ? ["'unsafe-eval'"] : []),
    ],
    ['style-src', "'self'", "'unsafe-inline'"],
    ['img-src', "'self'", 'data:', 'blob:', 'https:'],
    ['font-src', "'self'"],
    [
      'connect-src',
      "'self'",
      ...(supabase ? [supabase, supabase.replace(/^https:/, 'wss:')] : []),
      ...(dev ? ['ws:'] : []),
    ],
    ['frame-ancestors', "'none'"],
    ['form-action', "'self'"],
    ['base-uri', "'self'"],
    ['object-src', "'none'"],
  ];
  const policy = directives.map((d) => d.join(' ')).join('; ');
  return dev ? policy : `${policy}; upgrade-insecure-requests`;
}

/** A fresh 128-bit nonce, base64. Works in the edge and Node runtimes. */
export function makeNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

/** Headers on every response, pages and files alike. */
export const STATIC_SECURITY_HEADERS: { key: string; value: string }[] = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=(), payment=(self)',
  },
];
