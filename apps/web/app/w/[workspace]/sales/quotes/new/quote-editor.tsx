'use client';

import { Alert, buttonVariants, Input, InvoiceSummary, Select } from '@agency-os/ui';
import Link from 'next/link';
import { useActionState, useMemo, useState } from 'react';
import { FormMessage, Submit } from '@/components/workspace/form-bits';
import { PlanLimitDialog } from '@/components/workspace/plan-limit';
import { LineItems, linesFrom } from '@/components/workspace/line-items';
import type { WorkspaceSettings } from '@/lib/data/types';
import { quoteTotals } from '@/lib/data/views';
import { checkLines, CLIENT_COUNTRIES, parseAmount, type LineFields } from '@/lib/forms';
import { createQuoteAction, type QuoteFormState } from '../../actions';

type Recipients = {
  leads: { id: string; name: string }[];
  clients: { id: string; name: string; country: string; stateCode: string | null }[];
};

export function QuoteEditor({
  slug,
  recipients,
  settings,
  nextNumber,
  defaults,
}: {
  slug: string;
  recipients: Recipients;
  settings: Pick<WorkspaceSettings, 'stateCode' | 'lutArn'>;
  nextNumber: string;
  defaults: { for?: string; validUntil: string };
}) {
  const [state, action] = useActionState<QuoteFormState, FormData>(
    createQuoteAction.bind(null, slug),
    {},
  );
  const v = state.values ?? {};
  const e = state.errors ?? {};
  const [forValue, setFor] = useState(v.for ?? defaults.for ?? '');
  const initialClient = recipients.clients.find(
    (c) => `client:${c.id}` === (v.for ?? defaults.for),
  );
  const [country, setCountry] = useState(v.country ?? initialClient?.country ?? 'IN');
  const [stateCode, setStateCode] = useState(v.stateCode ?? initialClient?.stateCode ?? '');
  const [discount, setDiscount] = useState(v.discount ?? '');
  const [lines, setLines] = useState<LineFields[]>(() => linesFrom(v.lines));
  const currency = CLIENT_COUNTRIES.find((c) => c.value === country)?.currency ?? 'INR';

  const pick = (value: string) => {
    setFor(value);
    const client = recipients.clients.find((c) => `client:${c.id}` === value);
    if (client) {
      setCountry(client.country);
      setStateCode(client.stateCode ?? '');
    }
  };

  const totals = useMemo(() => {
    const { lines: valid } = checkLines(lines, currency);
    const subtotal = valid.length
      ? quoteTotals(
          { currency, lines: valid, discountMinor: 0n, country, stateCode: stateCode || null },
          settings,
        ).subtotal.amountMinor
      : 0n;
    const d = parseAmount(discount, currency);
    return quoteTotals(
      {
        currency,
        lines: valid,
        discountMinor: d !== null && d > 0n && d <= subtotal ? d : 0n,
        country,
        stateCode: /^\d{2}$/.test(stateCode) ? stateCode : null,
      },
      settings,
    );
  }, [lines, currency, country, stateCode, discount, settings]);

  const treatment =
    totals.treatment === 'intra'
      ? 'CGST and SGST apply: the client is in your state.'
      : totals.treatment === 'inter'
        ? country === 'IN'
          ? 'IGST applies: the client is in another state.'
          : 'IGST applies: add your LUT in Settings to bill exports without it.'
        : totals.treatment === 'export_lut'
          ? 'No GST: an export under your LUT.'
          : 'No GST: you’re not registered, so this is a bill of supply.';

  return (
    <form
      action={action}
      className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]"
      noValidate
    >
      <div className="grid content-start gap-4">
        <FormMessage state={state} title="The quote wasn’t saved" />
        <PlanLimitDialog limit={state.limit} slug={slug} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="For"
            name="for"
            required
            placeholder="Choose a lead or client"
            options={[
              ...recipients.leads.map((l) => ({
                value: `lead:${l.id}`,
                label: `Lead · ${l.name}`,
              })),
              ...recipients.clients.map((c) => ({
                value: `client:${c.id}`,
                label: `Client · ${c.name}`,
              })),
            ]}
            value={forValue}
            onChange={(ev) => pick(ev.target.value)}
            error={e.for}
          />
          <Input
            label="Valid until"
            name="validUntil"
            type="date"
            defaultValue={v.validUntil ?? defaults.validUntil}
            error={e.validUntil}
          />
          <Select
            label="Client’s country"
            name="country"
            options={CLIENT_COUNTRIES.map((c) => ({ value: c.value, label: c.label }))}
            value={country}
            onChange={(ev) => setCountry(ev.target.value)}
            hint={`Priced in ${currency}.`}
            error={e.country}
          />
          {country === 'IN' ? (
            <Input
              label="Client’s state code"
              name="stateCode"
              optional
              inputMode="numeric"
              placeholder="e.g. 29"
              value={stateCode}
              onChange={(ev) => setStateCode(ev.target.value)}
              hint="Sets CGST and SGST or IGST. Empty means your state."
              error={e.stateCode}
            />
          ) : null}
        </div>
        <Alert tone="info" title={treatment} />
        <LineItems
          lines={lines}
          onChange={setLines}
          currency={currency}
          error={e.lines}
          lineErrors={state.lineErrors}
        />
        <Input
          label="Discount on the whole quote"
          name="discount"
          optional
          inputMode="decimal"
          placeholder="e.g. 5,000"
          value={discount}
          onChange={(ev) => setDiscount(ev.target.value)}
          hint="Taken off before GST, spread across the lines."
          error={e.discount}
          containerClassName="max-w-64"
        />
        <p className="text-body-sm text-muted-foreground">
          GST is 18% on each line. This quote will be {nextNumber}.
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <Link href={`/w/${slug}/sales`} className={buttonVariants({ variant: 'ghost' })}>
            Cancel
          </Link>
          <Submit variant="secondary" name="intent" value="quote">
            Save quote
          </Submit>
          <Submit name="intent" value="proposal">
            Save and make proposal
          </Submit>
        </div>
      </div>
      <InvoiceSummary type="Quote" totals={totals} className="self-start" />
    </form>
  );
}
