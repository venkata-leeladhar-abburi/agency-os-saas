// Server only. The setup checklist from the database: the same five steps as example mode,
// done from the workspace's own records (example records don't count).
import { can } from '@agency-os/core';
import {
  hasExampleData,
  loadExampleData,
  removeExampleData,
  setOnboardingDismissed,
  workspaceSettings,
} from '@agency-os/db';
import { asMember, type WorkspaceCtx } from '../../server/workspace';
import type { OnboardingStep } from '../onboarding';
import { salesItems } from './sales';
import { snapshot } from './snapshot';

export async function onboardingFor(ctx: WorkspaceCtx) {
  const [snap, sales, settings, hasExample] = await Promise.all([
    snapshot(ctx),
    salesItems(ctx),
    asMember(ctx, (tx) => workspaceSettings(tx, ctx.workspaceId)),
    asMember(ctx, (tx) => hasExampleData(tx, ctx.workspaceId)),
  ]);
  const own = <T extends { example?: boolean }>(list: T[]) => list.filter((r) => !r.example);
  const steps: OnboardingStep[] = [
    // Logos wait for Storage, so on the database the services alone finish this step.
    { id: 'services', done: settings.services.length > 0 },
    { id: 'lead', done: own(snap.leads).length > 0 },
    { id: 'quote', done: sales.some((i) => i.kind === 'Proposal' && i.status !== 'draft') },
    { id: 'portal', done: own(snap.clients).some((c) => c.portal !== 'not_invited') },
    { id: 'invoice', done: snap.invoices.some((i) => !i.invoice.example) },
  ];
  const dismissed = Boolean(settings.onboarding?.dismissed);
  return {
    steps,
    done: steps.filter((x) => x.done).length,
    // Examples load as one set: once there, there's nothing more to load (D-063).
    allExamples: hasExample,
    show: !dismissed && steps.some((x) => !x.done),
    dismissed,
    hasExample,
    canManageExamples: can(ctx.role, 'workspace.manage'),
  };
}

export async function loadExamplesFor(ctx: WorkspaceCtx) {
  return asMember(ctx, (tx) => loadExampleData(tx, ctx.workspaceId, ctx.session.userId));
}

export async function removeExamplesFor(ctx: WorkspaceCtx) {
  return asMember(ctx, (tx) => removeExampleData(tx, ctx.workspaceId));
}

export async function setDismissed(ctx: WorkspaceCtx, dismissed: boolean) {
  await asMember(ctx, (tx) => setOnboardingDismissed(tx, ctx.workspaceId, dismissed));
}
