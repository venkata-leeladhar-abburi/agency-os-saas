// Server only. Your own profile on the database (RLS: only your own row is written).
import { myProfile, updateMyProfile } from '@agency-os/db';
import { asMember, type WorkspaceCtx } from '../../server/workspace';

export async function profileFor(ctx: WorkspaceCtx) {
  const p = await asMember(ctx, (tx) => myProfile(tx, ctx.session.userId));
  return { name: p.fullName ?? '', phone: p.phone, email: ctx.session.email ?? '' };
}

export function saveProfileFor(ctx: WorkspaceCtx, input: { name: string; phone: string | null }) {
  return asMember(ctx, (tx) =>
    updateMyProfile(tx, ctx.session.userId, { fullName: input.name, phone: input.phone }),
  );
}
