// Server only. A member's own saved views on the database (only they see theirs).
import { deleteSavedView, listSavedViews, saveView, type ViewArea } from '@agency-os/db';
import { asMember, type WorkspaceCtx } from '../../server/workspace';

export function savedViewsFor(ctx: WorkspaceCtx, area: ViewArea) {
  return asMember(ctx, (tx) => listSavedViews(tx, ctx.workspaceId, ctx.session.userId, area));
}

export function saveViewFor(ctx: WorkspaceCtx, area: ViewArea, name: string, query: string) {
  return asMember(ctx, (tx) =>
    saveView(tx, ctx.workspaceId, ctx.session.userId, { area, name, query }),
  );
}

export function deleteViewFor(ctx: WorkspaceCtx, id: string) {
  return asMember(ctx, (tx) => deleteSavedView(tx, ctx.workspaceId, id));
}
