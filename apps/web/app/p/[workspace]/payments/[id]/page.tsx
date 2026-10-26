import { formatMoney } from '@agency-os/core';
import { Alert } from '@agency-os/ui';
import { notFound } from 'next/navigation';
import { InvoicePayView } from '@/components/invoice/invoice-pay-view';
import { PayForm } from '@/components/invoice/pay-form';
import { exampleMode } from '@/lib/data';
import { portalInvoice } from '@/lib/data/portal';
import { currentPortal } from '@/lib/portal-session';
import { payAction } from '../../actions';

export const metadata = { title: 'Invoice' };

export default async function PortalInvoice({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string; id: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const [{ workspace, id }, { payment }] = await Promise.all([params, searchParams]);
  const session = (await currentPortal(workspace))!;
  const found = await portalInvoice(session.clientId, id);
  if (!found) notFound();
  const { invoice, state } = found;
  const example = exampleMode();
  return (
    <>
      <h1 className="text-title-lg">Invoice {invoice.number}</h1>
      <InvoicePayView
        {...found}
        pdfHref={`/p/${workspace}/payments/${invoice.id}/pdf`}
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
              action={payAction.bind(null, workspace, invoice.id)}
              label={`Pay ${formatMoney(state.dueMinor, invoice.currency)}`}
            />
          ) : null
        }
      />
    </>
  );
}
