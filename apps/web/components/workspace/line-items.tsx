'use client';

import { Plus, Trash } from '@phosphor-icons/react';
import { Button, IconButton, Input } from '@agency-os/ui';
import { useState } from 'react';
import type { Errors, LineFields } from '@/lib/forms';

export const BLANK_LINE: LineFields = { description: '', sac: '998314', quantity: '1', rate: '' };

const SYMBOL: Record<string, string> = {
  INR: '₹',
  USD: '$',
  GBP: '£',
  AED: 'AED',
  SGD: 'S$',
  AUD: 'A$',
  CAD: 'C$',
};

export function linesFrom(json: string | undefined): LineFields[] {
  try {
    return json ? (JSON.parse(json) as LineFields[]) : [BLANK_LINE];
  } catch {
    return [BLANK_LINE];
  }
}

/** Line items for quotes and invoices; sends them as JSON in a hidden "lines" field. */
export function LineItems({
  lines,
  onChange,
  currency,
  error,
  lineErrors,
}: {
  lines: LineFields[];
  onChange: (lines: LineFields[]) => void;
  currency: string;
  error?: string;
  /** Errors per line from the last save; one stays until its field is edited. */
  lineErrors?: Record<number, Errors>;
}) {
  // Edits are kept against the errors they follow, so a new save starts with none.
  const [edits, setEdits] = useState({ after: lineErrors, keys: new Set<string>() });
  const edited = edits.after === lineErrors ? edits.keys : new Set<string>();
  const update = (i: number, patch: Partial<LineFields>) => {
    onChange(lines.map((l, k) => (k === i ? { ...l, ...patch } : l)));
    setEdits({
      after: lineErrors,
      keys: new Set([...edited, ...Object.keys(patch).map((k) => `${i}.${k}`)]),
    });
  };
  return (
    <fieldset className="grid gap-3 rounded-lg border border-border bg-card p-3">
      <legend className="px-1 text-body-sm font-medium">Lines</legend>
      {error ? <p className="text-body-sm text-danger">{error}</p> : null}
      {lines.map((line, i) => {
        const all = lineErrors?.[i] ?? {};
        const le = Object.fromEntries(
          Object.entries(all).filter(([k]) => !edited.has(`${i}.${k}`)),
        ) as Errors;
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
              onClick={() => onChange(lines.filter((_, k) => k !== i))}
            />
          </div>
        );
      })}
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />
      <div>
        <Button size="sm" icon={Plus} onClick={() => onChange([...lines, BLANK_LINE])}>
          Add line
        </Button>
      </div>
    </fieldset>
  );
}
