import { formatMoney, PLAN_DETAILS } from '@agency-os/core';
import { Alert, ExampleBadge } from '@agency-os/ui';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AgencyMark, BrandScope } from '@/components/brand/brand';
import { InvoicePayView } from '@/components/invoice/invoice-pay-view';
import { PayForm } from '@/components/invoice/pay-form';
import { TooManyTries } from '@/components/too-many-tries';
import { exampleMode } from '@/lib/data';
import { invoiceByPayToken } from '@/lib/data/pay';
import { findByLink } from '@/lib/link-guard';
import { payByLinkAction } from './actions';

// Pay links are private: keep them out of search engines and other sites' referrers.
export const metadata: Metadata = {
  title: 'Invoice',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function PayPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const [{ token }, { payment }] = await Promise.all([params, searchParams]);
  const lookup = await findByLink(() => invoiceByPayToken(token));
  if (!lookup) notFound();
  if ('blocked' in lookup) return <TooManyTries />;
  const found = lookup.found;
  const { invoice, state, brand } = found;
  const example = exampleMode();
  return (
    <BrandScope colour={brand.colour}>
      <main className="mx-auto grid w-full max-w-xl gap-4 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <AgencyMark name={brand.name} logoUrl={brand.logoUrl} />
          {example ? <ExampleBadge /> : null}
        </div>
        <h1 className="text-title-lg">Invoice {invoice.number}</h1>
        <InvoicePayView
          {...found}
          pdfHref={`/pay/${token}/pdf`}
          outcome={payment === 'paid' ? 'paid' : payment === 'failed' ? 'failed' : undefined}
          payNote={
            example ? (
              <Alert tone="info" title="Example mode: no money moves">
                Paying here records an example payment. Real payments by UPI, card and net banking
                start once Razorpay is connected.
              </Alert>
            ) : null
          }
          payForm={
            example ? (
              <PayForm
                action={payByLinkAction.bind(null, token)}
                label={`Pay ${formatMoney(state.dueMinor, invoice.currency)}`}
              />
            ) : null
          }
        />
        {!PLAN_DETAILS[brand.plan].ownBranding ? (
          <p className="text-center text-body-sm text-muted-foreground">Powered by Agency OS</p>
        ) : null}
      </main>
    </BrandScope>
  );
}
