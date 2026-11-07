// Server only. Pieces shared by the invoice, quote and proposal PDFs.
import { amountInWords, formatMoney, type InvoiceTotals } from '@agency-os/core';
import { Image, Text, View } from '@react-pdf/renderer';
import type { ReactNode } from 'react';
import type { PdfColours, PdfStyles } from './theme';

export type PdfBrand = { name: string; logoUrl: string | null; poweredBy: boolean };

/** Logo or name on the left; document type, number and tags on the right. */
export function PdfHeader({
  s,
  brand,
  type,
  number,
  tags,
}: {
  s: PdfStyles;
  brand: PdfBrand;
  type: string;
  number?: string | null;
  tags?: string[];
}) {
  return (
    <View style={[s.between, { alignItems: 'flex-start', marginBottom: 22 }]}>
      {brand.logoUrl ? (
        <Image src={brand.logoUrl} style={{ height: 34, maxWidth: 170, objectFit: 'contain' }} />
      ) : (
        <Text style={{ fontSize: 13, fontWeight: 600 }}>{brand.name}</Text>
      )}
      <View style={{ alignItems: 'flex-end', gap: 3 }}>
        <Text style={s.overline}>{type}</Text>
        {number ? <Text style={[s.mono, s.medium, { fontSize: 11 }]}>{number}</Text> : null}
        {tags?.length ? (
          <View style={[s.row, { gap: 4, marginTop: 2 }]}>
            {tags.map((t) => (
              <Text key={t} style={s.tag}>
                {t}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** A labelled block of lines: "From", "Bill to". Empty lines are left out. */
export function PdfParty({
  s,
  label,
  lines,
  width = '48%',
}: {
  s: PdfStyles;
  label: string;
  lines: (ReactNode | null | undefined | false)[];
  width?: string;
}) {
  return (
    <View style={{ width, gap: 1 }}>
      <Text style={[s.small, s.medium, { marginBottom: 2 }]}>{label}</Text>
      {lines.filter(Boolean).map((line, i) => (
        <Text key={i} style={i === 0 ? s.strong : undefined}>
          {line}
        </Text>
      ))}
    </View>
  );
}

/** Label and value pairs in a row: dates, place of supply. */
export function PdfFacts({ s, facts }: { s: PdfStyles; facts: [string, string][] }) {
  return (
    <View style={[s.row, s.rule, { gap: 24, paddingVertical: 8, marginVertical: 14 }]}>
      {facts.map(([k, v]) => (
        <View key={k} style={{ gap: 1 }}>
          <Text style={s.small}>{k}</Text>
          <Text style={s.medium}>{v}</Text>
        </View>
      ))}
    </View>
  );
}

const COLS = { n: 18, qty: 40, rate: 80, amount: 86 };

/** The lines, the GST rows and the total, as on the invoice screen. */
export function PdfLines({ s, c, totals }: { s: PdfStyles; c: PdfColours; totals: InvoiceTotals }) {
  const fmt = (m: bigint) => formatMoney(m, totals.currency);
  const discount = totals.lines.reduce((sum, l) => sum + (l.discountMinor ?? 0n), 0n);
  const rates = [...new Set(totals.lines.map((l) => l.taxRateBp))];
  const single = rates.length === 1 ? rates[0]! : undefined;
  const pct = (bp: number) => `${bp / 100}%`;
  // The line's GST rate only means something when GST is charged.
  const charged = totals.treatment === 'intra' || totals.treatment === 'inter';
  const rows: [string, bigint][] = [];
  if (discount > 0n) {
    rows.push(['Amount', totals.subtotal.amountMinor + discount]);
    rows.push(['Discount', -discount]);
  }
  rows.push(['Taxable value', totals.subtotal.amountMinor]);
  if (totals.treatment === 'intra') {
    const half = single !== undefined ? ` ${pct(single / 2)}` : '';
    rows.push([`CGST${half}`, totals.cgst.amountMinor]);
    rows.push([`SGST${half}`, totals.sgst.amountMinor]);
  } else if (totals.treatment === 'inter') {
    rows.push([`IGST${single !== undefined ? ` ${pct(single)}` : ''}`, totals.igst.amountMinor]);
  } else if (totals.treatment === 'export_lut') {
    rows.push(['IGST 0% (export under LUT)', 0n]);
  }
  if (totals.roundOff.amountMinor !== 0n) rows.push(['Round-off', totals.roundOff.amountMinor]);

  const head = [s.small, s.medium, { textAlign: 'right' as const }];
  const cell = { textAlign: 'right' as const };
  return (
    <View>
      <View
        style={[s.row, { borderBottomWidth: 0.75, borderBottomColor: c.strong, paddingBottom: 5 }]}
        fixed
      >
        <Text style={[s.small, s.medium, { width: COLS.n }]}>#</Text>
        <Text style={[s.small, s.medium, { flex: 1 }]}>Item</Text>
        <Text style={[...head, { width: COLS.qty }]}>Qty</Text>
        <Text style={[...head, { width: COLS.rate }]}>Rate</Text>
        <Text style={[...head, { width: COLS.amount }]}>Amount</Text>
      </View>
      {totals.lines.map((l, i) => (
        <View key={i} style={[s.row, s.rule, { paddingVertical: 6 }]} wrap={false}>
          <Text style={[s.muted, { width: COLS.n }]}>{i + 1}</Text>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={s.medium}>{l.description}</Text>
            {l.sac || charged ? (
              <Text style={[s.small, s.mono]}>
                {[l.sac ? `SAC ${l.sac}` : null, charged ? `GST ${pct(l.taxRateBp)}` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            ) : null}
          </View>
          <Text style={[cell, { width: COLS.qty }]}>{String(l.quantity)}</Text>
          <Text style={[cell, { width: COLS.rate }]}>{fmt(l.rateMinor)}</Text>
          <Text style={[cell, { width: COLS.amount }]}>
            {fmt(l.taxableMinor + (l.discountMinor ?? 0n))}
          </Text>
        </View>
      ))}
      <View style={{ marginLeft: 'auto', width: 230, marginTop: 8, gap: 3 }} wrap={false}>
        {rows.map(([label, value]) => (
          <View key={label} style={s.between}>
            <Text style={s.muted}>{label}</Text>
            <Text>{value < 0n ? `−${fmt(-value)}` : fmt(value)}</Text>
          </View>
        ))}
        <View
          style={[
            s.between,
            { borderTopWidth: 1.25, borderTopColor: c.accent, paddingTop: 5, marginTop: 3 },
          ]}
        >
          <Text style={[s.strong, { fontSize: 11 }]}>Total</Text>
          <Text style={[s.strong, { fontSize: 11 }]}>{fmt(totals.total.amountMinor)}</Text>
        </View>
      </View>
      {totals.currency === 'INR' ? (
        <Text style={[s.box, { marginTop: 10 }]}>
          {amountInWords(totals.total.amountMinor, 'INR')}
        </Text>
      ) : null}
    </View>
  );
}

/** Page numbers and the plan's "Powered by" line on every page. */
export function PdfFooter({ s, brand, left }: { s: PdfStyles; brand: PdfBrand; left: string }) {
  return (
    <View style={s.footer} fixed>
      <Text>
        {left}
        {brand.poweredBy ? ' · Powered by Agency OS' : ''}
      </Text>
      <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  );
}
