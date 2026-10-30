// Server only. Who is using the client portal on the database: the signed-in person, as the
// portal contact of one of the workspace's clients. Queries go through withUser, so the
// portal policies and functions decide what they see.
import {
  claimPortalAccess,
  portalClients,
  withUser,
  type Db,
  type PortalClient,
  type Session,
  type Tx,
} from '@agency-os/db';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { currentUser } from '../supabase/server';
import { database } from './db';

export type PortalCtx = {
  db: Db;
  session: Session;
  workspaceId: string;
  slug: string;
  clientId: string;
  contactId: string;
  client: PortalClient;
  /** Logins linked on this visit: more than 0 the first time they open the portal. */
  claimed: number;
  /** Every client of this agency they're a contact for, to switch between. */
  choices: { id: string; name: string }[];
};

/** Which of their clients a contact looks at, when they are a contact for more than one. */
export const PORTAL_COOKIE = 'agency_os_portal_client';

/**
 * The signed-in contact's portal for a workspace, once per request, or null: signed out, or
 * not a contact of any of its clients (the same answer either way).
 */
export const portalCtx = cache(async (slug: string): Promise<PortalCtx | null> => {
  const user = await currentUser();
  if (!user) return null;
  const db = database();
  if (!db) throw new Error('DATABASE_URL is not set');
  const chosen = (await cookies()).get(PORTAL_COOKIE)?.value;
  return portalCtxFor(db, { userId: user.id, email: user.email }, slug, chosen);
});

/**
 * The portal context for a signed-in person. Links their login to any contact invited with
 * this email first; `chosen` picks the client when they are a contact for more than one.
 */
export async function portalCtxFor(
  db: Db,
  session: Session,
  slug: string,
  chosen?: string,
): Promise<PortalCtx | null> {
  const { claimed, mine } = await withUser(db, session, async (tx) => ({
    claimed: await claimPortalAccess(tx),
    mine: await portalClients(tx),
  }));
  const here = mine.filter((c) => c.workspace_slug === slug);
  if (!here.length) return null;
  const client = here.find((c) => c.client_id === chosen) ?? here[0]!;
  return {
    db,
    session,
    workspaceId: client.workspace_id,
    slug,
    clientId: client.client_id,
    contactId: client.contact_id,
    client,
    claimed,
    choices: here.map((c) => ({ id: c.client_id, name: c.client_name })),
  };
}

/** Runs queries as the portal contact, in one transaction. */
export function asContact<T>(ctx: PortalCtx, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return withUser(ctx.db, ctx.session, fn);
}
