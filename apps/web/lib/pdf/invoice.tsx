// Server only. The invoice PDF: a GST tax invoice, export invoice or bill of supply.
import { formatDate, formatMoney, stateLabel } from '@agency-os/core';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import type { Client, Invoice, WorkspaceSettings } from '../data/types';
import { DOCUMENT_TYPE_LABELS, type InvoiceState } from '../data/views';
import { PAYMENT_METHODS } from '../forms';
import type { InvoiceTotals } from '@agency-os/core';
import { PdfFacts, PdfFooter, PdfHeader, PdfLines, PdfParty, type PdfBrand } from './parts';
import { pdfColours, pdfStyles } from './theme';

export type InvoicePdfProps = {
  invoice: Invoice;
  client: Client;
  totals: InvoiceTotals;
  state: InvoiceState;
  settings: WorkspaceSettings;
  brand: PdfBrand;
};

export function InvoicePdf({ invoice, client, totals, state, settings, brand }: InvoicePdfProps) {
  const c = pdfColours(settings.brandColour);
  const s = pdfStyles(c);
  const type = invoice.number ? DOCUMENT_TYPE_LABELS[totals.documentType] : 'Draft invoice';
  const india = client.country === 'IN';
  const fmt = (m: bigint) => formatMoney(m, invoice.currency);
  const tags = [invoice.example ? 'Example' : null, state.status === 'paid' ? 'Paid' : null].filter(
    (t): t is string => Boolean(t),
  );
  const placeOfSupply = india
    ? stateLabel(client.stateCode ?? settings.stateCode ?? '')
    : `Outside India (${client.country})`;
  const bank = settings.bank;
  const title = `${type}${invoice.number ? ` ${invoice.number}` : ''}`;

  return (
    <Document title={title} author={settings.name} creator="Agency OS" producer="Agency OS">
      <Page size="A4" style={s.page}>
        <PdfHeader s={s} brand={brand} type={type} number={invoice.number} tags={tags} />
        <View style={s.between}>
          <PdfParty
            s={s}
            label="From"
            lines={[
              settings.name,
              settings.address,
              settings.gstin ? `GSTIN ${settings.gstin}` : null,
              settings.stateCode ? `State ${stateLabel(settings.stateCode)}` : null,
            ]}
          />
          <PdfParty
            s={s}
            label="Bill to"
            lines={[
              client.name,
              client.contactName,
              [client.city, india ? null : client.country].filter(Boolean).join(', ') || null,
              client.gstin ? `GSTIN ${client.gstin}` : null,
              client.email,
            ]}
          />
        </View>
        <PdfFacts
          s={s}
          facts={[
            ['Invoice date', invoice.issuedOn ? formatDate(invoice.issuedOn) : 'Not issued'],
            ['Due date', formatDate(invoice.dueOn)],
            ['Place of supply', placeOfSupply],
            ...(settings.gstin ? ([['Reverse charge', 'No']] as [string, string][]) : []),
          ]}
        />
        <PdfLines s={s} c={c} totals={totals} />
        {totals.currency !== 'INR' && invoice.exchangeRate ? (
          <Text style={[s.box, { marginTop: 10 }]}>
            Exchange rate on the invoice date: 1 {totals.currency} = ₹{invoice.exchangeRate}
            {totals.totalInr ? ` · ${formatMoney(totals.totalInr.amountMinor, 'INR')}` : ''}
          </Text>
        ) : null}
        {totals.treatment === 'export_lut' && settings.lutArn ? (
          <Text style={{ marginTop: 8, color: c.info }}>
            Supply meant for export under LUT ARN {settings.lutArn}, without payment of IGST.
          </Text>
        ) : null}
        {totals.documentType === 'bill_of_supply' ? (
          <Text style={[s.small, { marginTop: 8 }]}>
            Bill of supply: the supplier is not registered for GST, so no GST is charged.
          </Text>
        ) : null}
        {!invoice.number ? (
          <Text style={{ marginTop: 8, color: c.warning }}>
            This is a draft. It isn’t a tax invoice until it’s issued with a number.
          </Text>
        ) : null}

        {invoice.payments.length ? (
          <View style={{ marginTop: 16 }} wrap={false}>
            <Text style={s.heading}>Payments received</Text>
            {invoice.payments.map((p) => (
              <View key={p.id} style={[s.between, s.rule, { paddingVertical: 3 }]}>
                <Text>
                  {formatDate(p.receivedOn)} ·{' '}
                  {PAYMENT_METHODS.find((m) => m.value === p.method)?.label}
                  {p.reference ? ` · ${p.reference}` : ''}
                </Text>
                <Text>{fmt(p.amountMinor)}</Text>
              </View>
            ))}
            <View style={[s.between, { paddingTop: 4 }]}>
              <Text style={s.strong}>Balance due</Text>
              <Text style={s.strong}>{fmt(state.dueMinor)}</Text>
            </View>
          </View>
        ) : null}

        <View style={[s.between, { marginTop: 22, alignItems: 'flex-end' }]} wrap={false}>
          <View style={{ width: '55%', gap: 1 }}>
            {bank.accountNumber ? (
              <>
                <Text style={s.heading}>Pay by bank transfer</Text>
                <Text>{bank.accountName}</Text>
                <Text>
                  Account <Text style={s.mono}>{bank.accountNumber}</Text>
                </Text>
                {bank.ifsc ? (
                  <Text>
                    IFSC <Text style={s.mono}>{bank.ifsc}</Text>
                  </Text>
                ) : null}
                {!india && bank.swift ? (
                  <Text>
                    SWIFT <Text style={s.mono}>{bank.swift}</Text>
                  </Text>
                ) : null}
              </>
            ) : null}
            <Text style={[s.muted, { marginTop: 8 }]}>{settings.invoiceFooter}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 1 }}>
            <Text style={s.medium}>For {settings.name}</Text>
            <Text style={[s.small, { marginTop: 22 }]}>Authorised signatory</Text>
          </View>
        </View>
        <PdfFooter s={s} brand={brand} left={title} />
      </Page>
    </Document>
  );
}
