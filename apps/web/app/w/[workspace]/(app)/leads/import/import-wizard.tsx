'use client';

import { UploadSimple } from '@phosphor-icons/react';
import {
  guessLeadMapping,
  LEAD_IMPORT_FIELDS,
  parseCsv,
  toLeadImport,
  type LeadImportField,
  type LeadImportMapping,
} from '@agency-os/core';
import { Alert, Button, buttonVariants, Card, Select } from '@agency-os/ui';
import Link from 'next/link';
import { useActionState, useMemo, useRef, useState } from 'react';
import { Submit } from '@/components/workspace/form-bits';
import { importLeadsAction, type ImportState } from './actions';

const FIELD_LABELS: Record<LeadImportField, string> = {
  name: 'Name',
  company: 'Company',
  email: 'Email',
  phone: 'Phone',
  source: 'Source',
  value: 'Value',
  service: 'Service',
  stage: 'Stage',
  notes: 'Notes',
};

const MAX_ROWS = 5000;

export function ImportWizard({ slug }: { slug: string }) {
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState('');
  const [mapping, setMapping] = useState<LeadImportMapping>({});
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const [state, action] = useActionState<ImportState, FormData>(
    importLeadsAction.bind(null, slug),
    {},
  );

  const parsed = useMemo(
    () => (csv ? parseCsv(csv).filter((r) => r.some((c) => c.trim())) : []),
    [csv],
  );
  const headers = parsed[0] ?? [];
  const rows = parsed.slice(1);
  const checked = useMemo(() => rows.map((r) => toLeadImport(r, mapping, 'INR')), [rows, mapping]);
  const ready = checked.filter((c) => c.ok).length;

  async function read(file: File | undefined) {
    if (!file) return;
    setFileError('');
    if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv')
      return setFileError('That isn’t a CSV file. Save your sheet as CSV and try again.');
    if (file.size > 5 * 1024 * 1024)
      return setFileError('This file is over 5 MB. Split it into smaller files.');
    const text = await file.text();
    const all = parseCsv(text).filter((r) => r.some((c) => c.trim()));
    if (all.length < 2) return setFileError('This file has no rows under the column names.');
    if (all.length - 1 > MAX_ROWS)
      return setFileError(
        `This file has ${(all.length - 1).toLocaleString('en-IN')} rows. Import up to 5,000 at a time.`,
      );
    setCsv(text);
    setFileName(file.name);
    setMapping(guessLeadMapping(all[0]!));
  }

  if (state.result) {
    const { imported, skipped } = state.result;
    return (
      <div className="grid gap-4">
        <Alert
          tone={skipped.length ? 'warning' : 'success'}
          title={`${imported} ${imported === 1 ? 'lead' : 'leads'} imported${skipped.length ? `, ${skipped.length} skipped` : ''}`}
        >
          {skipped.length
            ? 'Fix these rows in your file and import them again.'
            : 'They’re on your board in New, with a follow-up for the next working day.'}
        </Alert>
        {skipped.length ? (
          <Card title="Skipped rows" flush>
            <ul className="grid p-0">
              {skipped.map((s) => (
                <li
                  key={s.row}
                  className="grid gap-0.5 border-t border-border px-5 py-2 first:border-t-0"
                >
                  <span className="text-body font-medium">
                    Row {s.row} · {s.name}
                  </span>
                  <span className="text-caption font-normal text-muted-foreground">
                    {s.reasons.join(' ')}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
        <div className="flex justify-end">
          <Link
            href={`/w/${slug}/leads?view=table`}
            className={buttonVariants({ variant: 'primary' })}
          >
            Open leads
          </Link>
        </div>
      </div>
    );
  }

  if (!csv) {
    return (
      <div className="grid gap-4">
        <p className="text-overline-caps text-muted-foreground">Step 1 of 2 · Choose a file</p>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void read(e.dataTransfer.files[0]);
          }}
          className={`grid justify-items-center gap-3 rounded-lg border-2 border-dashed bg-card px-6 py-12 text-center ${dragging ? 'border-primary' : 'border-border-strong'}`}
        >
          <UploadSimple size={32} weight="duotone" aria-hidden="true" className="text-primary" />
          <p className="text-title-sm">Drop your CSV here</p>
          <p className="text-body text-muted-foreground">
            Up to 5,000 rows. The first row should have column names.
          </p>
          <input
            ref={input}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            aria-label="CSV file"
            onChange={(e) => void read(e.target.files?.[0])}
          />
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="primary" onClick={() => input.current?.click()}>
              Choose a file
            </Button>
            <a href={`/w/${slug}/leads/template`} className={buttonVariants({ variant: 'link' })}>
              Download the template
            </a>
          </div>
        </div>
        {fileError ? <Alert tone="danger" title={fileError} /> : null}
      </div>
    );
  }

  const fieldFor = (column: number) =>
    (Object.entries(mapping).find(([, i]) => i === column)?.[0] as LeadImportField | undefined) ??
    '';
  const setField = (column: number, field: string) =>
    setMapping((m) => {
      const next: LeadImportMapping = {};
      for (const [k, i] of Object.entries(m))
        if (i !== column && k !== field) next[k as LeadImportField] = i;
      if (field) next[field as LeadImportField] = column;
      return next;
    });
  const previewFields = LEAD_IMPORT_FIELDS.filter((f) => mapping[f] !== undefined);

  return (
    <form action={action} className="grid gap-4">
      <p className="text-overline-caps text-muted-foreground">
        Step 2 of 2 · Match the columns in {fileName}
      </p>
      {state.message ? <Alert tone="danger" title={state.message} /> : null}
      <Card title="Column in your file → field in Agency OS" flush>
        <ul className="grid p-0">
          {headers.map((h, i) => (
            <li
              key={`${h}-${i}`}
              className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-2 first:border-t-0"
            >
              <span className="text-body font-medium">{h || `Column ${i + 1}`}</span>
              <Select
                aria-label={`Field for ${h || `column ${i + 1}`}`}
                options={[
                  { value: '', label: 'Skip this column' },
                  ...LEAD_IMPORT_FIELDS.map((f) => ({ value: f, label: FIELD_LABELS[f] })),
                ]}
                value={fieldFor(i)}
                onChange={(e) => setField(i, e.target.value)}
                containerClassName="w-48"
              />
            </li>
          ))}
        </ul>
      </Card>
      <Card
        title="Preview"
        description={`The first ${Math.min(3, rows.length)} of ${rows.length} rows, as they will be imported`}
        flush
      >
        <div
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be reachable by keyboard (WCAG 2.1.1)
          tabIndex={0}
          role="region"
          aria-label="Import preview"
          className="overflow-x-auto"
        >
          <table className="w-full border-collapse text-body-sm">
            <caption className="sr-only">Import preview</caption>
            <thead>
              <tr className="bg-muted text-caption text-muted-foreground">
                {previewFields.map((f) => (
                  <th key={f} scope="col" className="px-3 py-2 text-left font-medium">
                    {FIELD_LABELS[f]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 3).map((r, k) => (
                <tr key={k} className="border-t border-border">
                  {previewFields.map((f) => (
                    <td key={f} className="px-3 py-2">
                      {r[mapping[f]!] ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {rows.length - ready > 0 ? (
        <Alert tone="warning" title={`${rows.length - ready} of ${rows.length} rows have problems`}>
          They’ll be skipped, and you’ll see why after the import.
        </Alert>
      ) : null}
      <input type="hidden" name="csv" value={csv} />
      <input type="hidden" name="mapping" value={JSON.stringify(mapping)} />
      <div className="flex justify-end gap-2">
        <Button
          onClick={() => {
            setCsv('');
            setFileName('');
          }}
        >
          Choose another file
        </Button>
        <Submit disabled={ready === 0}>
          Import {ready} {ready === 1 ? 'lead' : 'leads'}
        </Submit>
      </div>
    </form>
  );
}
