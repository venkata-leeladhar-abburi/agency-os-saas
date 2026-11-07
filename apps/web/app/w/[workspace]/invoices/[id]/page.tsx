import { formatDate, formatMoney, minorDigits } from '@agency-os/core';
import { DownloadSimple } from '@phosphor-icons/react/dist/ssr';
import { Alert, Badge, buttonVariants, Card, InvoiceSummary, type BadgeProps } from '@agency-os/ui';
import type { ReminderState } from '@agency-os/core';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Submit } from '@/components/workspace/form-bits';
import { getInvoice } from '@/lib/data';
import { PAYMENT_METHODS } from '@/lib/forms';
import {
  DOCUMENT_TYPE_LABELS,
  istDate,
  REMINDER_STATE_LABELS,
  reminderMessage,
  whatsappLink,
} from '@/lib/data/views';
import { emailReady } from '@/lib/email';
import { siteOrigin } from '@/lib/origin';
import { issueInvoiceAction, newPayLinkAction } from '../actions';
import { PaymentDialog } from './payment-dialog';
import { RemindersSwitch, ShareLink } from './reminders';

const REMINDER_TONE: Record<ReminderState, BadgeProps['tone']> = {
  sent: 'success',
  due: 'warning',
  scheduled: 'neutral',
  skipped: 'neutral',
  cancelled: 'neutral',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ workspace: string; id: string }>;
}) {
  const { workspace, id } = await params;
  const found = await getInvoice(id, workspace);
  return { title: `${found?.invoice.number ?? 'Draft invoice'} · Agency OS` };
}

function plain(minor: bigint, currency: string) {
  const digits = minorDigits(currency);
  const s = minor.toString().padStart(digits + 1, '0');
  return `${s.slice(0, -digits)}.${s.slice(-digits)}`;
}

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ workspace: string; id: string }>;
}) {
  const { workspace, id } = await params;
  const found = await getInvoice(id, workspace);
  if (!found) notFound();
  const { invoice, client, totals, state, settings, reminders } = found;
  const payUrl = `${await siteOrigin()}/pay/${invoice.payToken}`;
  const nextReminder = reminders?.find((r) => r.state === 'due' || r.state === 'scheduled');
  const isExport = totals.treatment === 'export_lut' || client.country !== 'IN';

  return (
    <div className="grid gap-6">
      <Link href={`/w/${workspace}/invoices`} className="text-body-sm text-muted-foreground">
        ← All invoices
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-title-lg">{invoice.number ?? 'Draft invoice'}</h1>
          <p className="text-body text-muted-foreground">
            <Link href={`/w/${workspace}/clients/${client.id}`}>{client.name}</Link>
            {invoice.issuedOn ? ` · issued ${formatDate(invoice.issuedOn)}` : ''} · due{' '}
            {formatDate(invoice.dueOn)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/w/${workspace}/invoices/${invoice.id}/pdf`}
            download
            className={buttonVariants({})}
          >
            <DownloadSimple size={16} aria-hidden="true" />
            {invoice.number ? 'Download PDF' : 'Download draft PDF'}
          </a>
          {!invoice.number ? (
            <form action={issueInvoiceAction.bind(null, workspace, invoice.id)}>
              <Submit>Issue invoice</Submit>
            </form>
          ) : state.dueMinor > 0n ? (
            <PaymentDialog
              slug={workspace}
              id={invoice.id}
              number={invoice.number}
              due={plain(state.dueMinor, invoice.currency)}
              dueText={formatMoney(state.dueMinor, invoice.currency)}
              today={istDate(new Date())}
              isExport={isExport}
            />
          ) : null}
        </div>
      </div>
      {state.status === 'overdue' ? (
        <Alert tone="warning" title={`${state.statusText}`}>
          {nextReminder
            ? `The next reminder is due ${formatDate(nextReminder.on)}. You can also send the pay link on WhatsApp below.`
            : 'No more reminders are scheduled. Send the pay link on WhatsApp below.'}
        </Alert>
      ) : null}
      {!invoice.number ? (
        <Alert tone="info" title="This is a draft">
          The client can’t see it yet. Issuing gives it the next number in the series.
        </Alert>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <InvoiceSummary
          type={DOCUMENT_TYPE_LABELS[totals.documentType]}
          number={invoice.number ?? undefined}
          status={state.status}
          statusText={state.statusText}
          totals={totals}
          exchangeRate={invoice.exchangeRate ?? undefined}
          lutArn={totals.treatment === 'export_lut' ? (settings.lutArn ?? undefined) : undefined}
        />
        <Card
          title="Payments"
          description={
            invoice.payments.length
              ? `${formatMoney(state.paidMinor, invoice.currency)} received`
              : 'Nothing received yet.'
          }
          className="self-start"
        >
          <ul className="grid gap-2 p-0">
            {invoice.payments.map((p) => (
              <li key={p.id} className="flex justify-between gap-3 text-body">
                <span>
                  {formatDate(p.receivedOn)} ·{' '}
                  {PAYMENT_METHODS.find((m) => m.value === p.method)?.label}
                  {p.reference ? (
                    <span className="text-muted-foreground"> · {p.reference}</span>
                  ) : null}
                </span>
                <span className="tabular-nums">{formatMoney(p.amountMinor, invoice.currency)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      {invoice.number && reminders ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card
            title="Reminders"
            description={`By email to ${client.contactName}${client.email ? ` (${client.email})` : ''}.`}
          >
            <div className="grid gap-4">
              <RemindersSwitch slug={workspace} id={invoice.id} on={invoice.reminders} />
              <ul className="grid gap-2 p-0" aria-label="Reminder schedule">
                {reminders.map((r) => (
                  <li key={r.on} className="flex items-center justify-between gap-3 text-body">
                    <span>
                      {r.label} <span className="text-muted-foreground">· {formatDate(r.on)}</span>
                    </span>
                    <Badge tone={REMINDER_TONE[r.state]}>
                      {r.state === 'sent' && r.sentAt
                        ? `Sent ${formatDate(r.sentAt, { year: false })}`
                        : r.state === 'due' && !emailReady()
                          ? 'Waiting for email setup'
                          : REMINDER_STATE_LABELS[r.state]}
                    </Badge>
                  </li>
                ))}
              </ul>
              {!emailReady() ? (
                <p className="text-body-sm text-muted-foreground">
                  Reminder emails start once email sending is set up. Until then, send the pay link
                  yourself.
                </p>
              ) : null}
            </div>
          </Card>
          {state.dueMinor > 0n ? (
            <Card
              title="Send to the client"
              description="The pay link opens this invoice to pay or download."
            >
              <ShareLink
                link={payUrl}
                whatsapp={whatsappLink(
                  client.phone,
                  reminderMessage({
                    contactName: client.contactName,
                    number: invoice.number,
                    amountDue: formatMoney(state.dueMinor, invoice.currency),
                    dueOn: invoice.dueOn,
                    payUrl,
                  }),
                )}
                previewHref={`/w/${workspace}/invoices/${invoice.id}/reminder`}
                replace={newPayLinkAction.bind(null, workspace, invoice.id)}
              />
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
