import { DownloadSimple } from '@phosphor-icons/react/dist/ssr';
import { formatDate, formatMoney, stateLabel, type InvoiceTotals } from '@agency-os/core';
import { Alert, buttonVariants, Card, InvoiceSummary, Progress } from '@agency-os/ui';
import type { ReactNode } from 'react';
import type { Client, Invoice, WorkspaceSettings } from '@/lib/data/types';
import { DOCUMENT_TYPE_LABELS, type InvoiceState } from '@/lib/data/views';

export type InvoicePayViewProps = {
  invoice: Invoice;
  client: Client;
  totals: InvoiceTotals;
  state: InvoiceState;
  settings: WorkspaceSettings;
  pdfHref: string;
  /** The pay form, or null when online payment isn't available. */
  payForm: ReactNode;
  /** Shown above the pay form: the example-mode note. */
  payNote?: ReactNode;
  /** Back from the payment page: it went through, or it failed. */
  outcome?: 'paid' | 'failed';
};

/** Who, when and where: the invoice's head, as on the PDF. */
function InvoiceHead({
  invoice,
  client,
  settings,
}: Pick<InvoicePayViewProps, 'invoice' | 'client' | 'settings'>) {
  const india = client.country === 'IN';
  const facts: [string, ReactNode][] = [
    ['Invoice date', invoice.issuedOn ? formatDate(invoice.issuedOn) : '—'],
    ['Due date', formatDate(invoice.dueOn)],
    [
      'Place of supply',
      india ? stateLabel(client.stateCode ?? settings.stateCode ?? '') : 'Outside India',
    ],
  ];
  return (
    <section
      aria-label="Invoice details"
      className="grid gap-4 rounded-lg border border-border bg-card p-5 text-body max-sm:p-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid content-start gap-0.5">
          <p className="text-caption text-muted-foreground">From</p>
          <p className="font-semibold">{settings.name}</p>
          {settings.address ? <p className="text-muted-foreground">{settings.address}</p> : null}
          {settings.gstin ? (
            <p className="text-muted-foreground">
              GSTIN <span className="font-mono">{settings.gstin}</span>
            </p>
          ) : null}
        </div>
        <div className="grid content-start gap-0.5">
          <p className="text-caption text-muted-foreground">Bill to</p>
          <p className="font-semibold">{client.name}</p>
          <p className="text-muted-foreground">{client.contactName}</p>
          {client.gstin ? (
            <p className="text-muted-foreground">
              GSTIN <span className="font-mono">{client.gstin}</span>
            </p>
          ) : null}
        </div>
      </div>
      <dl className="flex flex-wrap gap-x-8 gap-y-2 border-t border-border pt-3">
        {facts.map(([k, v]) => (
          <div key={k} className="grid gap-0.5">
            <dt className="text-caption text-muted-foreground">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Bank details from settings: always a way to pay, even before online payment is set up. */
function BankTransfer({ settings, client }: Pick<InvoicePayViewProps, 'settings' | 'client'>) {
  const bank = settings.bank;
  if (!bank.accountNumber) return null;
  const rows: [string, string][] = [
    ['Name', bank.accountName ?? settings.name],
    ['Account', bank.accountNumber],
    ...(bank.ifsc ? ([['IFSC', bank.ifsc]] as [string, string][]) : []),
    ...(client.country !== 'IN' && bank.swift
      ? ([['SWIFT', bank.swift]] as [string, string][])
      : []),
  ];
  return (
    <dl className="grid gap-1.5 text-body">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className={k === 'Name' ? undefined : 'font-mono'}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The client's invoice page (S34): see it, pay it, download it. */
export function InvoicePayView({
  invoice,
  client,
  totals,
  state,
  settings,
  pdfHref,
  payForm,
  payNote,
  outcome,
}: InvoicePayViewProps) {
  const fmt = (m: bigint) => formatMoney(m, invoice.currency);
  const paid = state.dueMinor <= 0n;
  const lastPayment = invoice.payments.at(-1);
  const download = (
    <a
      href={pdfHref}
      download
      // min-h keeps the link a 44px target on phones (the link style drops the height).
      className={`${buttonVariants({ variant: paid ? 'secondary' : 'link', size: 'xl', block: paid })} min-h-control-xl`}
    >
      <DownloadSimple size={paid ? 20 : 16} aria-hidden="true" />
      Download PDF
    </a>
  );
  return (
    <div className="grid gap-4">
      {paid ? (
        <Alert
          tone="success"
          title={
            outcome === 'paid'
              ? `Payment received: ${fmt(totals.total.amountMinor)}`
              : `Paid${lastPayment ? ` on ${formatDate(lastPayment.receivedOn)}` : ''}`
          }
        >
          Thank you. {settings.name} has been told.
        </Alert>
      ) : null}
      {!paid && outcome === 'failed' ? (
        <Alert tone="danger" title="The payment didn’t go through">
          No money was taken. Try again or choose another method.
        </Alert>
      ) : null}
      {!paid && state.status === 'overdue' ? (
        <Alert tone="warning" title={`This invoice was due on ${formatDate(invoice.dueOn)}`}>
          You can still pay it below.
        </Alert>
      ) : null}
      <InvoiceHead invoice={invoice} client={client} settings={settings} />
      <InvoiceSummary
        type={DOCUMENT_TYPE_LABELS[totals.documentType]}
        number={invoice.number ?? undefined}
        status={state.status}
        statusText={state.statusText}
        totals={totals}
        exchangeRate={invoice.exchangeRate ?? undefined}
        lutArn={totals.treatment === 'export_lut' ? (settings.lutArn ?? undefined) : undefined}
      />
      {paid ? (
        download
      ) : (
        <>
          <Card title={state.paidMinor > 0n ? 'Pay the rest' : 'Pay now'} as="h2">
            <div className="grid gap-4">
              {state.paidMinor > 0n ? (
                <Progress
                  value={Number((state.paidMinor * 100n) / totals.total.amountMinor)}
                  label={`${fmt(state.paidMinor)} of ${fmt(totals.total.amountMinor)} paid`}
                  showValue
                />
              ) : null}
              {payNote}
              {payForm ?? (
                <p className="text-body text-muted-foreground">
                  Online payment isn’t set up yet. Pay {fmt(state.dueMinor)} by bank transfer using
                  the details below.
                </p>
              )}
              <div className="flex justify-center">{download}</div>
            </div>
          </Card>
          {settings.bank.accountNumber ? (
            <Card
              title={payForm ? 'Or pay by bank transfer' : 'Bank details'}
              description={`Put ${invoice.number} as the reference so ${settings.name} can match it.`}
              as="h2"
            >
              <BankTransfer settings={settings} client={client} />
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
