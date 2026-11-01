'use client';

import { Alert, buttonVariants, Checkbox, Input, InvoiceSummary, Select } from '@agency-os/ui';
import Link from 'next/link';
import { useActionState, useMemo, useState } from 'react';
import { FormMessage, Submit } from '@/components/workspace/form-bits';
import { PlanLimitDialog } from '@/components/workspace/plan-limit';
import { LineItems, linesFrom } from '@/components/workspace/line-items';
import type { WorkspaceSettings } from '@/lib/data/types';
import { DOCUMENT_TYPE_LABELS, invoiceTotals } from '@/lib/data/views';
import { checkLines, type LineFields } from '@/lib/forms';
import { createInvoiceAction, type InvoiceFormState } from '../actions';

type ClientOption = {
  id: string;
  name: string;
  currency: string;
  country: string;
  stateCode: string | null;
};

export function InvoiceEditor({
  slug,
  clients,
  settings,
  nextNumber,
  defaults,
}: {
  slug: string;
  clients: ClientOption[];
  settings: Pick<WorkspaceSettings, 'stateCode' | 'lutArn'>;
  nextNumber: string;
  defaults: { clientId?: string; dueOn: string };
}) {
  const [state, action] = useActionState<InvoiceFormState, FormData>(
    createInvoiceAction.bind(null, slug),
    {},
  );
  const v = state.values ?? {};
  const e = state.errors ?? {};
  const [clientId, setClientId] = useState(v.clientId ?? defaults.clientId ?? '');
  const [lines, setLines] = useState<LineFields[]>(() => linesFrom(v.lines));
  const [rate, setRate] = useState(v.exchangeRate ?? '');
  const client = clients.find((c) => c.id === clientId);
  const currency = client?.currency ?? 'INR';

  const totals = useMemo(() => {
    const { lines: valid } = checkLines(lines, currency);
    return invoiceTotals(
      { currency, lines: valid, exchangeRate: /^\d+(\.\d+)?$/.test(rate) ? rate : null },
      client ?? { country: 'IN', stateCode: settings.stateCode },
      settings,
    );
  }, [lines, currency, rate, client, settings]);

  return (
    <form
      action={action}
      className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]"
      noValidate
    >
      <div className="grid content-start gap-4">
        <FormMessage state={state} title="The invoice wasn’t saved" />
        <PlanLimitDialog limit={state.limit} slug={slug} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Client"
            name="clientId"
            required
            placeholder="Choose a client"
            options={clients.map((c) => ({ value: c.id, label: c.name }))}
            value={clientId}
            onChange={(ev) => setClientId(ev.target.value)}
            error={e.clientId}
            hint={client ? `Billed in ${currency}.` : undefined}
          />
          <Input
            label="Due"
            name="dueOn"
            type="date"
            defaultValue={v.dueOn ?? defaults.dueOn}
            error={e.dueOn}
          />
          {currency !== 'INR' ? (
            <Input
              label="Exchange rate on invoice date"
              name="exchangeRate"
              prefix={`1 ${currency} = ₹`}
              inputMode="decimal"
              placeholder="e.g. 84.20"
              value={rate}
              onChange={(ev) => setRate(ev.target.value)}
              error={e.exchangeRate}
            />
          ) : null}
        </div>
        {totals.warnings.map((w) => (
          <Alert key={w} tone="warning" title={w} />
        ))}
        <LineItems
          lines={lines}
          onChange={setLines}
          currency={currency}
          error={e.lines}
          lineErrors={state.lineErrors}
        />
        <p className="text-body-sm text-muted-foreground">
          GST is 18% on each line. The number {nextNumber} is given when you issue it.
        </p>
        <Checkbox
          name="reminders"
          label="Send reminders: 3 days before, on the due date, 3 and 7 days after"
          description="By email to the client. They stop once the invoice is paid."
          // After a failed save, keep what was chosen; a new invoice starts with them on.
          defaultChecked={state.values ? v.reminders === 'on' : true}
        />
        <div className="flex flex-wrap justify-end gap-2">
          <Link href={`/w/${slug}/invoices`} className={buttonVariants({ variant: 'ghost' })}>
            Cancel
          </Link>
          <Submit variant="secondary" name="intent" value="draft">
            Save draft
          </Submit>
          <Submit name="intent" value="issue">
            Issue invoice
          </Submit>
        </div>
      </div>
      <InvoiceSummary
        type={DOCUMENT_TYPE_LABELS[totals.documentType]}
        totals={totals}
        exchangeRate={currency !== 'INR' && rate ? rate : undefined}
        lutArn={totals.treatment === 'export_lut' ? (settings.lutArn ?? undefined) : undefined}
        className="self-start"
      />
    </form>
  );
}
