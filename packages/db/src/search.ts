import { sql } from 'drizzle-orm';
import type { Tx } from './client';

export type SearchKind = 'lead' | 'client' | 'project' | 'invoice' | 'proposal' | 'task';

/** One match, with what each kind's line needs. Amounts are in minor units. */
export type SearchRow = {
  kind: SearchKind;
  id: string;
  label: string;
  /** Lead: stage. Client: main contact. Project, invoice: client. Proposal: status. Task: project. */
  detail: string | null;
  /** Lead: email or phone. Invoice: status. Proposal: quote number. Task: assignee. */
  extra: string | null;
  amountMinor: bigint | null;
  currency: string | null;
};

/** At most this many matches of each kind. */
export const SEARCH_PER_KIND = 8;

/**
 * The command palette's search: names, emails, phone numbers, GSTINs and invoice numbers across
 * the workspace's records, in one query. Runs as the member, so RLS decides what's found; names
 * that start with the words come first, then the newest.
 */
export async function searchRecords(
  tx: Tx,
  workspaceId: string,
  query: string,
  perKind = SEARCH_PER_KIND,
): Promise<SearchRow[]> {
  const term = query.trim().replace(/\s+/g, ' ').slice(0, 100);
  if (!term) return [];
  const escaped = term.replace(/[\\%_]/g, (c) => `\\${c}`);
  const any = `%${escaped}%`;
  const start = `${escaped}%`;
  const digits = term.replace(/\D/g, '');
  // Phone numbers match on their digits, so "98480 22338" finds "+919848022338".
  const phone = digits.length >= 4 ? `%${digits}%` : null;
  const rows = await tx.execute<{
    kind: SearchKind;
    id: string;
    label: string;
    detail: string | null;
    extra: string | null;
    amount_minor: string | null;
    currency: string | null;
  }>(sql`
    (select 'lead' as kind, l.id, coalesce(l.company, l.name) as label, s.name as detail,
        coalesce(l.email, l.phone) as extra, l.value_minor::text as amount_minor, l.currency
      from leads l join pipeline_stages s on s.id = l.stage_id
      where l.workspace_id = ${workspaceId} and l.deleted_at is null
        and (l.name ilike ${any} or l.company ilike ${any} or l.email ilike ${any}
          or (${phone}::text is not null and regexp_replace(coalesce(l.phone, ''), '\\D', '', 'g') like ${phone}))
      order by (coalesce(l.company, l.name) ilike ${start}) desc, l.created_at desc
      limit ${perKind})
    union all
    (select 'client', c.id, c.name, pc.name, coalesce(pc.email, c.gstin), null, c.currency
      from clients c
      left join lateral (select name, email from client_contacts cc
        where cc.client_id = c.id order by cc.is_primary desc, cc.created_at limit 1) pc on true
      where c.workspace_id = ${workspaceId} and c.deleted_at is null
        and (c.name ilike ${any} or c.legal_name ilike ${any} or c.gstin ilike ${any}
          or exists (select 1 from client_contacts cc where cc.client_id = c.id
            and (cc.name ilike ${any} or cc.email ilike ${any}
              or (${phone}::text is not null and regexp_replace(coalesce(cc.phone, ''), '\\D', '', 'g') like ${phone}))))
      order by (c.name ilike ${start}) desc, c.created_at desc
      limit ${perKind})
    union all
    (select 'project', p.id, p.name, c.name, null, null, null
      from projects p join clients c on c.id = p.client_id
      where p.workspace_id = ${workspaceId} and p.deleted_at is null
        and (p.name ilike ${any} or c.name ilike ${any})
      order by (p.name ilike ${start}) desc, p.created_at desc
      limit ${perKind})
    union all
    (select 'invoice', i.id, i.number, c.name, i.status::text, i.total_minor::text, i.currency
      from invoices i join clients c on c.id = i.client_id
      where i.workspace_id = ${workspaceId} and i.deleted_at is null
        and (i.number ilike ${any} or c.name ilike ${any})
      order by (i.number ilike ${start}) desc, i.created_at desc
      limit ${perKind})
    union all
    (select 'proposal', pr.id, pr.title, pr.status::text, q.number, q.total_minor::text, q.currency
      from proposals pr left join quotes q on q.id = pr.quote_id
      where pr.workspace_id = ${workspaceId} and pr.deleted_at is null
        and (pr.title ilike ${any} or q.number ilike ${any})
      order by (pr.title ilike ${start}) desc, pr.created_at desc
      limit ${perKind})
    union all
    (select 'task', t.id, t.title, p.name, pf.full_name, null, null
      from tasks t join projects p on p.id = t.project_id
      left join profiles pf on pf.id = t.assignee_id
      where t.workspace_id = ${workspaceId} and t.deleted_at is null
        and t.title ilike ${any}
      order by (t.title ilike ${start}) desc, t.created_at desc
      limit ${perKind})
  `);
  return rows.map((r) => ({
    kind: r.kind,
    id: r.id,
    label: r.label,
    detail: r.detail,
    extra: r.extra,
    amountMinor: r.amount_minor === null ? null : BigInt(r.amount_minor),
    currency: r.currency?.trim() ?? null,
  }));
}
