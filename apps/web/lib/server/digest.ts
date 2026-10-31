// Server only. Each member's Today for the daily digest, built as that member (withUser, so RLS
// shows them exactly what the Today page would), by the same code as the page.
import type { Plan, Role } from '@agency-os/core';
import type { DigestItemsFor } from '@agency-os/jobs';
import { overviewOf, todayFrom } from '../data';
import { snapshot } from '../data/db/snapshot';
import type { WorkspaceCtx } from './workspace';

export const digestItems: DigestItemsFor = async ({
  db,
  workspaceId,
  slug,
  plan,
  recipient,
  now,
}) => {
  const ctx: WorkspaceCtx = {
    db,
    session: { userId: recipient.userId, email: recipient.email },
    workspaceId,
    slug,
    role: recipient.role as Role,
    plan: plan as Plan,
  };
  return todayFrom(overviewOf(await snapshot(ctx, now)), slug, now).map((i) => ({
    group: i.group,
    title: i.title,
    meta: i.meta,
    href: i.href,
    overdue: i.overdue,
  }));
};
