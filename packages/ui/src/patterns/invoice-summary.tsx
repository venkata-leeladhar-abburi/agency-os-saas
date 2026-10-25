'use client';

import { amountInWords, formatMoney, type InvoiceTotals } from '@agency-os/core';
import { Globe } from '@phosphor-icons/react';
import { Badge, type BadgeProps } from '../components/badge';
import { cn } from '../lib/cn';

export type InvoiceStatus = 'draft' | 'due' | 'overdue' | 'paid' | 'partially_paid';

export type InvoiceSummaryLabels = {
  item?: string;
  qty?: string;
  rate?: string;
  amount?: string;
  subtotal?: string;
  roundOff?: string;
  total?: string;
  sac?: string;
  lut?: (arn: string) => string;
  exchangeRate?: (currency: string, rate: string) => string;
};

export type InvoiceSummaryProps = {
  /** "OSS/26-27/015"; drafts have none. */
  number?: string;
  /** "Tax invoice", "Export invoice", "Bill of supply". */
  type: string;
  status?: InvoiceStatus;
  /** Badge text: "Due 02 Nov", "Paid", "3 days overdue". */
  statusText?: string;
  /** From calculateInvoice() in @agency-os/core. */
  totals: InvoiceTotals;
  /** The LUT ARN printed on exports under LUT. */
  lutArn?: string;
  /** Exchange rate to INR on the invoice date, as entered ("84.20"). */
  exchangeRate?: string;
  labels?: InvoiceSummaryLabels;
  className?: string;
};

const STATUS_TONE: Record<InvoiceStatus, BadgeProps['tone']> = {
  draft: 'neutral',
  due: 'warning',
  overdue: 'danger',
  paid: 'success',
  partially_paid: 'info',
};

function percent(bp: number) {
  return `${bp / 100}%`;
}

/** The money part of an invoice: lines with SAC codes, GST, total, words and export notes. */
export function InvoiceSummary({
  number,
  type,
  status,
  statusText,
  totals,
  lutArn,
  exchangeRate,
  labels,
  className,
}: InvoiceSummaryProps) {
  const fmt = (m: bigint) => formatMoney(m, totals.currency);
  const rates = [...new Set(totals.lines.map((l) => l.taxRateBp))];
  const singleRate = rates.length === 1 ? rates[0] : undefined;
  const rows: { label: string; value: bigint }[] = [];
  if (totals.treatment === 'intra') {
    const half = singleRate !== undefined ? ` ${percent(singleRate / 2)}` : '';
    rows.push({ label: `CGST${half}`, value: totals.cgst.amountMinor });
    rows.push({ label: `SGST${half}`, value: totals.sgst.amountMinor });
  } else if (totals.treatment === 'inter') {
    rows.push({
      label: `IGST${singleRate !== undefined ? ` ${percent(singleRate)}` : ''}`,
      value: totals.igst.amountMinor,
    });
  } else if (totals.treatment === 'export_lut') {
    rows.push({ label: 'IGST 0% (export under LUT)', value: 0n });
  }
  if (totals.roundOff.amountMinor !== 0n) {
    rows.push({ label: labels?.roundOff ?? 'Round-off', value: totals.roundOff.amountMinor });
  }

  return (
    <section
      className={cn(
        'grid gap-4 rounded-lg border border-border bg-card p-5 text-card-foreground max-sm:p-4',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-overline-caps text-muted-foreground">{type}</p>
          {number ? <p className="font-mono text-body font-semibold">{number}</p> : null}
        </div>
        {status ? (
          <Badge tone={STATUS_TONE[status]} dot>
            {statusText ?? status}
          </Badge>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-body">
          <thead>
            <tr className="border-b border-border text-caption text-muted-foreground">
              <th scope="col" className="pb-2 text-left font-medium">
                {labels?.item ?? 'Item'}
              </th>
              <th scope="col" className="pb-2 pl-3 text-right font-medium">
                {labels?.qty ?? 'Qty'}
              </th>
              <th scope="col" className="pb-2 pl-3 text-right font-medium">
                {labels?.rate ?? 'Rate'}
              </th>
              <th scope="col" className="pb-2 pl-3 text-right font-medium">
                {labels?.amount ?? 'Amount'}
              </th>
            </tr>
          </thead>
          <tbody>
            {totals.lines.map((line, i) => (
              <tr key={i} className="border-b border-border align-top">
                <td className="py-2.5">
                  <span className="block font-medium">{line.description}</span>
                  {line.sac ? (
                    <span className="font-mono text-mono-sm text-muted-foreground">
                      {labels?.sac ?? 'SAC'} {line.sac}
                    </span>
                  ) : null}
                </td>
                <td className="py-2.5 pl-3 text-right tabular-nums">{String(line.quantity)}</td>
                <td className="py-2.5 pl-3 text-right whitespace-nowrap tabular-nums">
                  {fmt(line.rateMinor)}
                </td>
                <td className="py-2.5 pl-3 text-right whitespace-nowrap tabular-nums">
                  {fmt(line.taxableMinor)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="ml-auto grid w-[min(320px,100%)] gap-1.5 text-body">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{labels?.subtotal ?? 'Subtotal'}</dt>
          <dd className="tabular-nums">{fmt(totals.subtotal.amountMinor)}</dd>
        </div>
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="tabular-nums">{fmt(row.value)}</dd>
          </div>
        ))}
        <div className="mt-1 flex justify-between gap-4 border-t border-border-strong pt-2.5 text-title-sm">
          <dt>{labels?.total ?? 'Total'}</dt>
          <dd className="tabular-nums">{fmt(totals.total.amountMinor)}</dd>
        </div>
      </dl>
      {totals.currency === 'INR' ? (
        <p className="rounded-md bg-muted px-3 py-2.5 text-body-sm text-muted-foreground">
          {amountInWords(totals.total.amountMinor, 'INR')}
        </p>
      ) : exchangeRate ? (
        <p className="rounded-md bg-muted px-3 py-2.5 text-body-sm text-muted-foreground">
          {labels?.exchangeRate?.(totals.currency, exchangeRate) ??
            `Exchange rate on invoice date: 1 ${totals.currency} = ₹${exchangeRate}`}
          {totals.totalInr ? ` · ${formatMoney(totals.totalInr.amountMinor, 'INR')}` : null}
        </p>
      ) : null}
      {totals.treatment === 'export_lut' && lutArn ? (
        <p className="flex items-start gap-1.5 text-caption font-normal text-info">
          <Globe size={14} aria-hidden="true" className="mt-px shrink-0" />
          {labels?.lut?.(lutArn) ??
            `Supply meant for export under LUT ARN ${lutArn}, without payment of IGST.`}
        </p>
      ) : null}
      {totals.warnings.map((warning) => (
        <p key={warning} className="text-caption text-warning">
          {warning}
        </p>
      ))}
    </section>
  );
}
