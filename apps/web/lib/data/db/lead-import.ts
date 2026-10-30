// Server only. Leads from a CSV on the database: the same checks as example mode, then each lead
// added as the member (RLS), in one transaction, with the workspace's own stages.
import type { LeadImportMapping } from '@agency-os/core';
import { createLead, listStages } from '@agency-os/db';
import { asMember, type WorkspaceCtx } from '../../server/workspace';
import { checkImportRows, type ImportResult } from '../lead-import';
import { leadList } from './people';

export async function importLeadsFor(
  ctx: WorkspaceCtx,
  rows: string[][],
  mapping: LeadImportMapping,
  room: number,
): Promise<ImportResult> {
  const existing = await leadList(ctx);
  return asMember(ctx, async (tx) => {
    const stages = await listStages(tx, ctx.workspaceId);
    const byName = (name: string | null) =>
      name ? stages.find((s) => s.name.toLowerCase() === name.toLowerCase()) : undefined;
    const { accepted, skipped } = checkImportRows(
      rows,
      mapping,
      room,
      existing,
      (name) => (byName(name)?.kind ?? 'open') !== 'open',
      // A lost lead needs its reason, which a CSV doesn't carry.
      (name) =>
        byName(name)?.kind === 'lost' ? 'Add lost leads by hand, so they keep their reason.' : null,
    );
    for (const { lead: l } of accepted)
      await createLead(
        tx,
        ctx.workspaceId,
        {
          name: l.name,
          company: l.company,
          email: l.email,
          phone: l.phone,
          stageId: byName(l.stage)?.id,
          valueMinor: l.valueMinor,
          source: l.source,
          service: l.service || null,
          notes: l.notes || null,
          ownerId: ctx.session.userId,
          ...(l.open ? {} : { nextFollowUpAt: null }),
        },
        ctx.session.userId,
        { enforceLimit: false },
      );
    return { imported: accepted.length, skipped };
  });
}
