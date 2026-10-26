'use client';

import { Plus, Trash } from '@phosphor-icons/react';
import {
  Alert,
  Button,
  buttonVariants,
  IconButton,
  Input,
  InvoiceSummary,
  Select,
} from '@agency-os/ui';
import Link from 'next/link';
import { useActionState, useMemo, useState } from 'react';
import { FormMessage, Submit } from '@/components/workspace/form-bits';
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

const BLANK: LineFields = { description: '', sac: '998314', quantity: '1', rate: '' };
const SYMBOL: Record<string, string> = {
  INR: '₹',
  USD: '$',
  GBP: '£',
  AED: 'AED',
  SGD: 'S$',
  AUD: 'A$',
  CAD: 'C$',
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
  const [lines, setLines] = useState<LineFields[]>(() => {
    try {
      return v.lines ? (JSON.parse(v.lines) as LineFields[]) : [BLANK];
    } catch {
      return [BLANK];
    }
  });
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

  // A field's error from the last save stays until that field is edited.
  // Edits are kept against the result they follow, so a new save starts with none.
  const [edits, setEdits] = useState({ after: state, keys: new Set<string>() });
  const edited = edits.after === state ? edits.keys : new Set<string>();
  const update = (i: number, patch: Partial<LineFields>) => {
    setLines((all) => all.map((l, k) => (k === i ? { ...l, ...patch } : l)));
    setEdits({
      after: state,
      keys: new Set([...edited, ...Object.keys(patch).map((k) => `${i}.${k}`)]),
    });
  };

  return (
    <form
      action={action}
      className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]"
      noValidate
    >
      <div className="grid content-start gap-4">
        <FormMessage state={state} title="The invoice wasn’t saved" />
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
        <fieldset className="grid gap-3 rounded-lg border border-border bg-card p-3">
          <legend className="px-1 text-body-sm font-medium">Lines</legend>
          {e.lines ? <p className="text-body-sm text-danger">{e.lines}</p> : null}
          {lines.map((line, i) => {
            const all = state.lineErrors?.[i] ?? {};
            const le = Object.fromEntries(
              Object.entries(all).filter(([k]) => !edited.has(`${i}.${k}`)),
            ) as typeof all;
            return (
              <div
                key={i}
                className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_72px_minmax(0,1fr)_auto] items-start gap-2 max-sm:grid-cols-2"
              >
                <Input
                  label="Item"
                  value={line.description}
                  onChange={(ev) => update(i, { description: ev.target.value })}
                  placeholder="e.g. Website, 5 pages"
                  error={le.description}
                  containerClassName="max-sm:col-span-2"
                />
                <Input
                  label="SAC"
                  value={line.sac}
                  onChange={(ev) => update(i, { sac: ev.target.value })}
                  className="font-mono"
                  error={le.sac}
                />
                <Input
                  label="Qty"
                  value={line.quantity}
                  inputMode="decimal"
                  onChange={(ev) => update(i, { quantity: ev.target.value })}
                  error={le.quantity}
                />
                <Input
                  label="Rate"
                  prefix={SYMBOL[currency] ?? currency}
                  value={line.rate}
                  inputMode="decimal"
                  placeholder="e.g. 30,000"
                  onChange={(ev) => update(i, { rate: ev.target.value })}
                  error={le.rate}
                />
                <IconButton
                  icon={Trash}
                  label={`Remove line ${i + 1}`}
                  className="mt-6.5"
                  disabled={lines.length === 1}
                  onClick={() => setLines((all) => all.filter((_, k) => k !== i))}
                />
              </div>
            );
          })}
          <input type="hidden" name="lines" value={JSON.stringify(lines)} />
          <div>
            <Button size="sm" icon={Plus} onClick={() => setLines((all) => [...all, BLANK])}>
              Add line
            </Button>
          </div>
        </fieldset>
        <p className="text-body-sm text-muted-foreground">
          GST is 18% on each line. The number {nextNumber} is given when you issue it.
        </p>
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
