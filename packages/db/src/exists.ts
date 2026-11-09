import { sql } from 'drizzle-orm';
import type { Tx } from './client';

export type RecordKind =
  | 'lead'
  | 'client'
  | 'project'
  | 'task'
  | 'invoice'
  | 'quote'
  | 'proposal'
  | 'knowledge'
  | 'knowledge-folder';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Whether the member can see a record, for a real 404 on a missing record's page (D-073). Run as
 * the member, so RLS decides. Each check matches what the record's page finds, never stricter:
 * the invoice page shows any invoice it can read, so invoices aren't checked for deleted_at.
 */
export async function recordVisible(
  tx: Tx,
  workspaceId: string,
  kind: RecordKind,
  id: string,
): Promise<boolean> {
  if (!UUID.test(id)) return false;
  const ws = workspaceId;
  const query = {
    lead: sql`select 1 from leads where id = ${id} and workspace_id = ${ws} and deleted_at is null`,
    client: sql`select 1 from clients
      where id = ${id} and workspace_id = ${ws} and deleted_at is null`,
    project: sql`select 1 from projects
      where id = ${id} and workspace_id = ${ws} and deleted_at is null`,
    task: sql`select 1 from tasks where id = ${id} and workspace_id = ${ws} and deleted_at is null`,
    invoice: sql`select 1 from invoices where id = ${id} and workspace_id = ${ws}`,
    quote: sql`select 1 from quotes where id = ${id} and workspace_id = ${ws} and deleted_at is null`,
    proposal: sql`select 1 from proposals where id = ${id} and workspace_id = ${ws}
      and deleted_at is null and quote_id is not null`,
    knowledge: sql`select 1 from knowledge_items
      where id = ${id} and workspace_id = ${ws} and deleted_at is null`,
    'knowledge-folder': sql`select 1 from knowledge_folders
      where id = ${id} and workspace_id = ${ws}`,
  }[kind];
  const rows = await tx.execute(sql`${query} limit 1`);
  return rows.length > 0;
}
