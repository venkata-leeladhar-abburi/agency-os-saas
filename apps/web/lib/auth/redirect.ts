/** Only same-site paths are allowed after sign-in, so a crafted link can't send people elsewhere. */
export function safeNext(next: string | null | undefined, fallback = '/app') {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\'))
    return fallback;
  return next;
}
