// Server only. The plan page on the database: the workspace's plan and what it has used, from the
// same counts the database checks before each "add" (example records don't count).
import { LIMITED_RESOURCES, limitOf, PLAN_DETAILS, PLANS } from '@agency-os/core';
import type { WorkspaceCtx } from '../../server/workspace';
import { planRoom } from './invoices';

export async function planOverviewFor(ctx: WorkspaceCtx) {
  const checks = await Promise.all(LIMITED_RESOURCES.map((r) => planRoom(ctx, r)));
  return {
    plan: ctx.plan,
    details: PLAN_DETAILS[ctx.plan],
    rows: LIMITED_RESOURCES.map((r, i) => ({
      resource: r,
      used: checks[i]!.used,
      limit: limitOf(ctx.plan, r),
    })),
    offered: PLANS.filter((p) => PLAN_DETAILS[p].offered).map((p) => ({
      id: p,
      ...PLAN_DETAILS[p],
    })),
  };
}
