// Server only. Who is using the client portal.
import { cookies } from 'next/headers';
import { EXAMPLE_SLUG, exampleMode } from './data';
import {
  EXAMPLE_PORTAL_CLIENT,
  portalSession,
  portalSessionFromDb,
  type PortalSession,
} from './data/portal';
import { PORTAL_COOKIE, portalCtx } from './server/portal';

export { PORTAL_COOKIE };

/**
 * The signed-in client contact, or null. On the database: the person signed in with the email
 * the agency invited, as a contact of one of this workspace's clients. In example mode the
 * agency can look at any example client's portal (Acme Labs by default).
 */
export async function currentPortal(slug: string): Promise<PortalSession | null> {
  if (!exampleMode()) {
    const pc = await portalCtx(slug);
    return pc ? portalSessionFromDb(pc) : null;
  }
  if (slug !== EXAMPLE_SLUG) return null;
  const chosen = (await cookies()).get(PORTAL_COOKIE)?.value ?? EXAMPLE_PORTAL_CLIENT;
  return (await portalSession(chosen)) ?? (await portalSession(EXAMPLE_PORTAL_CLIENT));
}
