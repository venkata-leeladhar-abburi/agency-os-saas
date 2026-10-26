import { formatDate, formatMoney } from '@agency-os/core';
import { Alert, Card, InvoiceSummary, Progress } from '@agency-os/ui';
import { notFound } from 'next/navigation';
import { exampleMode } from '@/lib/data';
import { portalInvoice } from '@/lib/data/portal';
import { DOCUMENT_TYPE_LABELS } from '@/lib/data/views';
import { currentPortal } from '@/lib/portal-session';
import { PayButton } from './pay-button';

export const metadata = { title: 'Invoice' };

export default async function PortalInvoice({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string; id: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const [{ workspace, id }, { paid }] = await Promise.all([params, searchParams]);
  const session = (await currentPortal(workspace))!;
  const found = await portalInvoice(session.clientId, id);
  if (!found) notFound();
  const { invoice, totals, state, settings } = found;
  const due = formatMoney(state.dueMinor, invoice.currency);
  return (
    <>
      <h1 className="text-title-lg">Invoice {invoice.number}</h1>
      {paid === '1' && state.status === 'paid' ? (
        <Alert
          tone="success"
          title={`Payment received: ${formatMoney(totals.total.amountMinor, invoice.currency)}`}
        >
          Thank you. {session.agency} has been told.
        </Alert>
      ) : null}
      {state.status === 'overdue' ? (
        <Alert tone="warning" title={`This invoice was due on ${formatDate(invoice.dueOn)}`}>
          You can still pay it below.
        </Alert>
      ) : null}
      <InvoiceSummary
        type={DOCUMENT_TYPE_LABELS[totals.documentType]}
        number={invoice.number ?? undefined}
        status={state.status}
        statusText={state.statusText}
        totals={totals}
        exchangeRate={invoice.exchangeRate ?? undefined}
        lutArn={totals.treatment === 'export_lut' ? (settings.lutArn ?? undefined) : undefined}
      />
      {state.dueMinor > 0n ? (
        <Card title={state.paidMinor > 0n ? 'Pay the rest' : 'Pay now'} as="h2">
          <div className="grid gap-4">
            {state.paidMinor > 0n ? (
              <Progress
                value={Number((state.paidMinor * 100n) / totals.total.amountMinor)}
                label={`${formatMoney(state.paidMinor, invoice.currency)} of ${formatMoney(totals.total.amountMinor, invoice.currency)} paid`}
                showValue
              />
            ) : null}
            {exampleMode() ? (
              <>
                <Alert tone="info" title="Example mode: no money moves">
                  Paying here records an example UPI payment. Real payments by UPI, card and net
                  banking start once Razorpay is connected.
                </Alert>
                <PayButton slug={workspace} id={invoice.id} label={`Pay ${due}`} />
              </>
            ) : (
              <p className="text-body text-muted-foreground">
                Online payment isn’t set up yet. Ask {session.agency} for their bank details.
              </p>
            )}
          </div>
        </Card>
      ) : null}
    </>
  );
}
