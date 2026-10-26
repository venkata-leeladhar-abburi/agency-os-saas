// Server only. Who is using the client portal.
import { cookies } from 'next/headers';
import { EXAMPLE_SLUG, exampleMode } from './data';
import { EXAMPLE_PORTAL_CLIENT, portalSession } from './data/portal';

export const PORTAL_COOKIE = 'agency_os_portal_client';

/**
 * The signed-in client contact. In example mode the agency can look at any client's portal
 * (Acme Labs by default); real portal sign-in uses the contact's verified email (M9) and
 * arrives with the database.
 */
export async function currentPortal(slug: string) {
  if (!exampleMode() || slug !== EXAMPLE_SLUG) return null;
  const chosen = (await cookies()).get(PORTAL_COOKIE)?.value ?? EXAMPLE_PORTAL_CLIENT;
  return (await portalSession(chosen)) ?? (await portalSession(EXAMPLE_PORTAL_CLIENT));
}
