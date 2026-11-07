// Server only. Saved views: a person's named filters for a list, kept per member.
import { AccountError, MAX_SAVED_VIEWS, type SavedView, type ViewArea } from '@agency-os/db';
import { ctxFor } from './ctx';
import * as dbViews from './db/saved-views';
import { newId, store } from './shared';

export type { SavedView };

export async function savedViews(area: ViewArea, slug?: string): Promise<SavedView[]> {
  const ctx = await ctxFor(slug);
  if (ctx) return dbViews.savedViewsFor(ctx, area);
  return [...store().savedViews].sort((a, b) => a.name.localeCompare(b.name));
}

/** Saves the filters under a name (replacing a view with that name). Returns an error to show. */
export async function saveView(
  area: ViewArea,
  name: string,
  query: string,
  slug?: string,
): Promise<{ error?: string }> {
  try {
    const ctx = await ctxFor(slug);
    if (ctx) {
      await dbViews.saveViewFor(ctx, area, name, query);
      return {};
    }
    const clean = name.trim().replace(/\s+/g, ' ');
    if (!clean) throw new AccountError('view_name_required');
    if (clean.length > 60) throw new AccountError('view_name_too_long');
    const views = store().savedViews;
    const same = views.find((v) => v.name === clean);
    if (same) same.query = query;
    else if (views.length >= MAX_SAVED_VIEWS) throw new AccountError('too_many_views');
    else views.push({ id: newId('view'), name: clean, query });
    return {};
  } catch (e) {
    if (e instanceof AccountError) return { error: e.message };
    throw e;
  }
}

export async function deleteView(id: string, slug?: string): Promise<void> {
  const ctx = await ctxFor(slug);
  if (ctx) {
    await dbViews.deleteViewFor(ctx, id);
    return;
  }
  const views = store().savedViews;
  const i = views.findIndex((v) => v.id === id);
  if (i >= 0) views.splice(i, 1);
}
