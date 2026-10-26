import { CheckCircle } from '@phosphor-icons/react/dist/ssr';
import { formatDate, formatMoney } from '@agency-os/core';
import { Badge, EmptyState } from '@agency-os/ui';
import Link from 'next/link';
import { portalInvoices } from '@/lib/data/portal';
import { currentPortal } from '@/lib/portal-session';

export const metadata = { title: 'Payments' };

export default async function PortalPayments({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  const session = (await currentPortal(workspace))!;
  const list = (await portalInvoices(session.clientId))!;
  return (
    <>
      <h1 className="text-title-lg">Payments</h1>
      {list.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState compact icon={CheckCircle} title="Nothing to pay" as="h2">
            Invoices from {session.agency} show up here.
          </EmptyState>
        </div>
      ) : (
        <ul className="grid divide-y divide-border overflow-hidden rounded-xl border border-border bg-card p-0">
          {list.map(({ invoice, totals, state }) => (
            <li key={invoice.id}>
              <Link
                href={`/p/${workspace}/payments/${invoice.id}`}
                className="flex min-h-control-xl items-center justify-between gap-3 px-4 py-3 text-foreground no-underline hover:bg-accent"
              >
                <span className="grid">
                  <span className="font-mono text-body font-medium">{invoice.number}</span>
                  <span className="text-body-sm text-muted-foreground">
                    {formatMoney(totals.total.amountMinor, invoice.currency)} ·{' '}
                    {state.status === 'paid'
                      ? 'paid'
                      : `due ${formatDate(invoice.dueOn, { year: false })}`}
                  </span>
                </span>
                {state.status === 'paid' ? (
                  <Badge size="sm" tone="success" dot>
                    Paid
                  </Badge>
                ) : (
                  <Badge size="sm" tone={state.status === 'overdue' ? 'danger' : 'warning'} dot>
                    Pay {formatMoney(state.dueMinor, invoice.currency)}
                  </Badge>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
