// Server only. The quote PDF.
import { formatDate, stateLabel, type InvoiceTotals } from '@agency-os/core';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import type { Quote, WorkspaceSettings } from '../data/types';
import { PdfFacts, PdfFooter, PdfHeader, PdfLines, PdfParty, type PdfBrand } from './parts';
import { pdfColours, pdfStyles } from './theme';

export function QuotePdf({
  quote,
  totals,
  settings,
  brand,
}: {
  quote: Quote;
  totals: InvoiceTotals;
  settings: WorkspaceSettings;
  brand: PdfBrand;
}) {
  const c = pdfColours(settings.brandColour);
  const s = pdfStyles(c);
  const india = quote.country === 'IN';
  return (
    <Document
      title={`Quote ${quote.number}`}
      author={settings.name}
      creator="Agency OS"
      producer="Agency OS"
    >
      <Page size="A4" style={s.page}>
        <PdfHeader
          s={s}
          brand={brand}
          type="Quote"
          number={quote.number}
          tags={quote.example ? ['Example'] : []}
        />
        <View style={s.between}>
          <PdfParty
            s={s}
            label="From"
            lines={[
              settings.name,
              settings.address,
              settings.gstin ? `GSTIN ${settings.gstin}` : null,
            ]}
          />
          <PdfParty s={s} label="For" lines={[quote.recipient]} />
        </View>
        <PdfFacts
          s={s}
          facts={[
            ['Date', formatDate(quote.createdAt)],
            ['Valid until', formatDate(quote.validUntil)],
            [
              'Place of supply',
              india
                ? stateLabel(quote.stateCode ?? settings.stateCode ?? '')
                : `Outside India (${quote.country})`,
            ],
          ]}
        />
        <PdfLines s={s} c={c} totals={totals} />
        {totals.warnings.map((w) => (
          <Text key={w} style={{ marginTop: 8, color: c.warning }}>
            {w}
          </Text>
        ))}
        <Text style={[s.muted, { marginTop: 18 }]}>
          This is a quote, not a tax invoice. Prices hold until {formatDate(quote.validUntil)}.
        </Text>
        <PdfFooter s={s} brand={brand} left={`Quote ${quote.number}`} />
      </Page>
    </Document>
  );
}
