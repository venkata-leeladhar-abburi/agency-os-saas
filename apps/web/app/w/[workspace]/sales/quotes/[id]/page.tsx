import { formatDate } from '@agency-os/core';
import { DownloadSimple } from '@phosphor-icons/react/dist/ssr';
import { buttonVariants, InvoiceSummary } from '@agency-os/ui';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LimitedActionButton } from '@/components/workspace/limited-action';
import { getQuote } from '@/lib/data/sales';
import { createProposalAction } from '../../actions';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const found = await getQuote((await params).id);
  return { title: `${found?.quote.number ?? 'Quote'} · Agency OS` };
}

export default async function QuotePage({
  params,
}: {
  params: Promise<{ workspace: string; id: string }>;
}) {
  const { workspace, id } = await params;
  const found = await getQuote(id);
  if (!found) notFound();
  const { quote, totals, proposal } = found;
  const ws = (p: string) => `/w/${workspace}${p}`;
  return (
    <div className="grid gap-6">
      <Link href={ws('/sales')} className="text-body-sm text-muted-foreground">
        ← All sales docs
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-title-lg">Quote for {quote.recipient}</h1>
          <p className="text-body text-muted-foreground">
            <span className="font-mono">{quote.number}</span> · valid until{' '}
            {formatDate(quote.validUntil)}
            {quote.leadId ? (
              <>
                {' '}
                · <Link href={ws(`/leads/${quote.leadId}`)}>Open the lead</Link>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={ws(`/sales/quotes/${quote.id}/pdf`)} download className={buttonVariants({})}>
            <DownloadSimple size={16} aria-hidden="true" />
            Download PDF
          </a>
          {proposal ? (
            <Link
              href={ws(`/sales/proposals/${proposal.id}`)}
              className={buttonVariants({ variant: 'primary' })}
            >
              Open proposal
            </Link>
          ) : (
            <LimitedActionButton
              action={createProposalAction.bind(null, workspace, quote.id)}
              slug={workspace}
            >
              Make a proposal
            </LimitedActionButton>
          )}
        </div>
      </div>
      <InvoiceSummary type="Quote" number={quote.number} totals={totals} className="max-w-3xl" />
    </div>
  );
}
