// Server only. The audit log: important actions, who did them, when and from where.
import { EXAMPLE_USER, newId, store } from './shared';
import type { AuditEntry } from './types';

export const AUDIT_ACTIONS: Record<string, string> = {
  'member.invited': 'Invited a member',
  'member.invite_resent': 'Sent an invite again',
  'member.invite_revoked': 'Cancelled an invite',
  'member.joined': 'Joined the workspace',
  'member.role_changed': 'Changed a role',
  'member.removed': 'Removed a member',
  'plan.changed': 'Changed the plan',
  'settings.saved': 'Changed workspace settings',
  'invoice.issued': 'Issued an invoice',
  'payment.recorded': 'Recorded a payment',
  'proposal.sent': 'Sent a proposal',
  'client.portal_invited': 'Invited a client to the portal',
  'data.exported': 'Exported data',
  'example.removed': 'Removed example data',
};

export function audit(
  action: keyof typeof AUDIT_ACTIONS,
  subject: string,
  detail = '',
  ip: string | null = null,
  actor = EXAMPLE_USER.name,
) {
  store().audit.unshift({
    id: newId('au'),
    at: new Date().toISOString(),
    actor,
    action,
    subject,
    detail,
    ip,
  });
}

/** Newest first, optionally one kind of action; at most 200 rows a page. */
export async function auditEntries(filter: { action?: string; page?: number } = {}): Promise<{
  rows: AuditEntry[];
  total: number;
  pages: number;
}> {
  const size = 200;
  const all = store().audit.filter((e) => !filter.action || e.action === filter.action);
  const page = Math.max(1, filter.page ?? 1);
  return {
    rows: all.slice((page - 1) * size, page * size),
    total: all.length,
    pages: Math.max(1, Math.ceil(all.length / size)),
  };
}
