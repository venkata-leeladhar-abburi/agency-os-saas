import { and, asc, count, eq } from 'drizzle-orm';
import { AccountError } from './accounts';
import type { Tx } from './client';
import { savedViews } from './schema';

/** The lists that have saved views. */
export type ViewArea = 'leads';

export type SavedView = { id: string; name: string; query: string };

export const MAX_SAVED_VIEWS = 20;

/** The signed-in member's saved views for a list, by name. RLS shows only their own. */
export async function listSavedViews(
  tx: Tx,
  workspaceId: string,
  userId: string,
  area: ViewArea,
): Promise<SavedView[]> {
  return tx
    .select({ id: savedViews.id, name: savedViews.name, query: savedViews.query })
    .from(savedViews)
    .where(
      and(
        eq(savedViews.workspaceId, workspaceId),
        eq(savedViews.userId, userId),
        eq(savedViews.area, area),
      ),
    )
    .orderBy(asc(savedViews.name));
}

/**
 * Saves the list's current filters under a name. Saving under a name you already use replaces
 * that view's filters. Returns the view's id.
 */
export async function saveView(
  tx: Tx,
  workspaceId: string,
  userId: string,
  input: { area: ViewArea; name: string; query: string },
): Promise<string> {
  const name = input.name.trim().replace(/\s+/g, ' ');
  if (!name) throw new AccountError('view_name_required');
  if (name.length > 60) throw new AccountError('view_name_too_long');
  const mine = and(
    eq(savedViews.workspaceId, workspaceId),
    eq(savedViews.userId, userId),
    eq(savedViews.area, input.area),
  );
  const [same] = await tx
    .select({ id: savedViews.id })
    .from(savedViews)
    .where(and(mine, eq(savedViews.name, name)));
  if (same) {
    await tx.update(savedViews).set({ query: input.query }).where(eq(savedViews.id, same.id));
    return same.id;
  }
  const [mineCount] = await tx.select({ n: count() }).from(savedViews).where(mine);
  if ((mineCount?.n ?? 0) >= MAX_SAVED_VIEWS) throw new AccountError('too_many_views');
  const [row] = await tx
    .insert(savedViews)
    .values({ workspaceId, userId, area: input.area, name, query: input.query })
    .returning({ id: savedViews.id });
  return row!.id;
}

/** Deletes one of your saved views. Returns false when it isn't there (or isn't yours). */
export async function deleteSavedView(tx: Tx, workspaceId: string, id: string): Promise<boolean> {
  const gone = await tx
    .delete(savedViews)
    .where(and(eq(savedViews.workspaceId, workspaceId), eq(savedViews.id, id)))
    .returning({ id: savedViews.id });
  return gone.length > 0;
}
