import { formatDate } from '@agency-os/core';
import { Button, Card, EmptyState, PageHeader, Select } from '@agency-os/ui';
import { ClockCounterClockwise } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { AUDIT_ACTIONS, auditEntries } from '@/lib/data/audit';
import { istTime } from '@/lib/data/views';

export const metadata = { title: 'Audit log · Settings · Agency OS' };

export default async function AuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ action?: string; page?: string }>;
}) {
  const [{ workspace }, { action, page }] = await Promise.all([params, searchParams]);
  const known = action && action in AUDIT_ACTIONS ? action : undefined;
  const { rows, total, pages } = await auditEntries(
    { action: known, page: Number(page) || 1 },
    workspace,
  );
  const current = Math.min(pages, Math.max(1, Number(page) || 1));
  const href = (p: number) =>
    `/w/${workspace}/settings/audit?${new URLSearchParams({ ...(known ? { action: known } : {}), page: String(p) })}`;
  return (
    <>
      <PageHeader
        title="Audit log"
        subtitle="Important actions: who, what, when and from where"
        className="mb-0"
      />
      <form className="flex flex-wrap items-end gap-2">
        <Select
          label="Show"
          name="action"
          options={[
            { value: '', label: 'Everything' },
            ...Object.entries(AUDIT_ACTIONS).map(([value, label]) => ({ value, label })),
          ]}
          defaultValue={known ?? ''}
          containerClassName="w-64"
        />
        <Button type="submit">Filter</Button>
      </form>
      {rows.length === 0 ? (
        <Card title="Nothing here yet">
          <EmptyState compact icon={ClockCounterClockwise} title="No matching actions" as="h3">
            Invites, role changes, invoices issued, payments and exports show up here.
          </EmptyState>
        </Card>
      ) : (
        <Card title={`${total} ${total === 1 ? 'action' : 'actions'}`} flush>
          <div
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be reachable by keyboard (WCAG 2.1.1)
            tabIndex={0}
            role="region"
            aria-label="Audit log"
            className="overflow-x-auto"
          >
            <table className="w-full border-collapse text-body-sm">
              <caption className="sr-only">Audit log</caption>
              <thead>
                <tr className="bg-muted text-caption text-muted-foreground">
                  {['When', 'Who', 'What', 'From'].map((h) => (
                    <th key={h} scope="col" className="px-3 py-2 text-left font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id} className="border-t border-border align-top">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatDate(e.at)}
                      <span className="block text-caption font-normal text-muted-foreground">
                        {istTime(e.at)} IST
                      </span>
                    </td>
                    <td className="px-3 py-2">{e.actor}</td>
                    <td className="px-3 py-2">
                      <span className="block">
                        {AUDIT_ACTIONS[e.action] ?? e.action}: {e.subject}
                      </span>
                      {e.detail ? (
                        <span className="text-caption font-normal text-muted-foreground">
                          {e.detail}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 font-mono text-mono-sm text-muted-foreground">
                      {e.ip ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {pages > 1 ? (
        <nav aria-label="Audit log pages" className="flex gap-3 text-body-medium">
          {current > 1 ? <Link href={href(current - 1)}>Newer</Link> : null}
          <span className="text-muted-foreground">
            Page {current} of {pages}
          </span>
          {current < pages ? <Link href={href(current + 1)}>Older</Link> : null}
        </nav>
      ) : null}
    </>
  );
}
