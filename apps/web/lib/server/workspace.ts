// Server only. Who is asking, in which workspace: the context every database-backed data
// function runs in. Queries go through withUser, so Postgres applies RLS as that person.
import { myWorkspaces, withUser, type Db, type Session, type Tx } from '@agency-os/db';
import type { Plan, Role } from '@agency-os/core';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';
import { currentUser } from '../supabase/server';
import { database } from './db';

export type WorkspaceCtx = {
  db: Db;
  session: Session;
  workspaceId: string;
  slug: string;
  role: Role;
  plan: Plan;
};

/**
 * The signed-in member's context for a workspace, once per request. Signed out → sign-in;
 * not a member (or no such workspace) → 404, the same answer either way.
 */
export const workspaceCtx = cache(async (slug: string): Promise<WorkspaceCtx> => {
  const user = await currentUser();
  if (!user) redirect(`/sign-in?next=/w/${slug}`);
  const db = database();
  if (!db) throw new Error('DATABASE_URL is not set');
  const session: Session = { userId: user.id, email: user.email };
  const all = await withUser(db, session, (tx) => myWorkspaces(tx));
  const ws = all.find((w) => w.slug === slug);
  if (!ws) notFound();
  return { db, session, workspaceId: ws.id, slug, role: ws.role as Role, plan: ws.plan };
});

/** Runs queries as the member, in one transaction. */
export function asMember<T>(ctx: WorkspaceCtx, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return withUser(ctx.db, ctx.session, fn);
}

/** The secret the pay links are made with (LINK_SIGNING_SECRET). */
export function linkSecret(): string {
  const secret = process.env.LINK_SIGNING_SECRET;
  if (!secret || secret.length < 32)
    throw new Error('LINK_SIGNING_SECRET is not set (32+ characters). See .env.example.');
  return secret;
}
