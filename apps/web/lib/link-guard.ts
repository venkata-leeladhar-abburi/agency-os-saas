// Server only. Public links (pay, proposal, invite) carry 128-bit tokens, so guessing one is
// hopeless; this still slows a network that keeps opening links that lead nowhere.
import { callerIp } from './origin';
import { allow, exhausted } from './rate-limit';

export async function findByLink<T>(
  find: () => Promise<T | null>,
): Promise<{ found: T } | { blocked: true } | null> {
  const ip = await callerIp();
  if (await exhausted('unknownLinks', ip)) return { blocked: true };
  const found = await find();
  if (found) return { found };
  await allow('unknownLinks', ip);
  return null;
}

export function tooManyResponse() {
  return new Response('Too many tries. Wait a few minutes and open the link again.', {
    status: 429,
    headers: { 'Retry-After': '600', 'Cache-Control': 'no-store' },
  });
}
