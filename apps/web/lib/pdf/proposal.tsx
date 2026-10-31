// Server only. The proposal PDF; once signed, with an audit page that records who signed,
// when, from where, and the hash of the exact version they accepted.
import { formatDate, type InvoiceTotals } from '@agency-os/core';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import type { Proposal, Quote, WorkspaceSettings } from '../data/types';
import { istTime, PROPOSAL_STATUS_LABELS, type ProposalView } from '../data/views';
import { PdfFooter, PdfHeader, PdfLines, type PdfBrand } from './parts';
import { pdfColours, pdfStyles, type PdfStyles } from './theme';

function Section({
  s,
  title,
  children,
}: {
  s: PdfStyles;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={s.heading} minPresenceAhead={40}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function Bullets({ s, items }: { s: PdfStyles; items: string[] }) {
  return (
    <View style={{ gap: 2 }}>
      {items.map((item, i) => (
        <View key={i} style={s.row}>
          <Text style={{ width: 10 }}>·</Text>
          <Text style={{ flex: 1 }}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function ProposalPdf({
  proposal: p,
  quote,
  totals,
  status,
  settings,
  brand,
  currentHash,
}: {
  proposal: Proposal;
  quote: Quote;
  totals: InvoiceTotals;
  status: ProposalView;
  settings: WorkspaceSettings;
  brand: PdfBrand;
  /** proposalHash() now, to show the signed version hasn't changed since. */
  currentHash: string;
}) {
  const c = pdfColours(settings.brandColour);
  const s = pdfStyles(c);
  const sig = p.signature;
  const tags = [p.example ? 'Example' : null, PROPOSAL_STATUS_LABELS[status]].filter(
    (t): t is string => Boolean(t),
  );
  const at = (iso: string) => `${formatDate(iso)}, ${istTime(iso)} IST`;

  return (
    <Document title={p.title} author={settings.name} creator="Agency OS" producer="Agency OS">
      <Page size="A4" style={s.page}>
        <PdfHeader s={s} brand={brand} type="Proposal" number={quote.number} tags={tags} />
        {p.blocks.map((b, i) => {
          // Template placeholders the agency didn't fill aren't printed.
          if ((b.type === 'text' || b.type === 'list') && b.placeholder) return null;
          switch (b.type) {
            case 'cover':
              return (
                <View key={i} style={[s.rule, { paddingBottom: 14, gap: 4 }]}>
                  <Text style={s.title}>{b.title}</Text>
                  <Text style={s.muted}>
                    {formatDate(b.date)} · Prepared by {b.preparedBy} · valid until{' '}
                    {formatDate(p.validUntil)}
                  </Text>
                </View>
              );
            case 'text':
              return (
                <Section key={i} s={s} title={b.heading}>
                  <Text style={s.para}>{b.body}</Text>
                </Section>
              );
            case 'list':
              return (
                <Section key={i} s={s} title={b.heading}>
                  <Bullets s={s} items={b.items} />
                </Section>
              );
            case 'scope':
              return b.included.length || b.excluded.length ? (
                <Section key={i} s={s} title={b.heading}>
                  {b.included.length ? (
                    <>
                      <Text style={[s.medium, { marginBottom: 2 }]}>Included</Text>
                      <Bullets s={s} items={b.included} />
                    </>
                  ) : null}
                  {b.excluded.length ? (
                    <>
                      <Text style={[s.medium, { marginTop: 6, marginBottom: 2 }]}>
                        Not included
                      </Text>
                      <Bullets s={s} items={b.excluded} />
                    </>
                  ) : null}
                </Section>
              ) : null;
            case 'timeline':
              return b.phases.length ? (
                <Section key={i} s={s} title={b.heading}>
                  {b.phases.map((ph, n) => (
                    <View key={ph.name} style={[s.between, s.rule, { paddingVertical: 3 }]}>
                      <Text>
                        {n + 1}. {ph.name}
                      </Text>
                      {ph.clientSignOff ? <Text style={s.small}>Your sign-off</Text> : null}
                    </View>
                  ))}
                </Section>
              ) : null;
            case 'price':
              return (
                <Section key={i} s={s} title={b.heading}>
                  <PdfLines s={s} c={c} totals={totals} />
                </Section>
              );
            case 'sign':
              return (
                <Section key={i} s={s} title={b.heading}>
                  {sig ? (
                    <Text>
                      Accepted by {sig.name} on {at(sig.at)}. The signing record is on the last
                      page.
                    </Text>
                  ) : (
                    <Text style={s.muted}>
                      Accept this proposal from the link {settings.name} sent you. Signing takes a
                      one-time code sent to your email.
                    </Text>
                  )}
                </Section>
              );
          }
        })}
        <PdfFooter s={s} brand={brand} left={p.title} />
      </Page>
      {sig ? (
        <Page size="A4" style={s.page}>
          <PdfHeader s={s} brand={brand} type="Signing record" number={quote.number} />
          <Text style={[s.title, { marginBottom: 12 }]}>{p.title}</Text>
          {(
            [
              ['Signed by', sig.name],
              ['Verified with', `One-time code sent to ${sig.email}`],
              ['Signed at', at(sig.at)],
              ['IP address', sig.ip],
              ['Browser', sig.userAgent ?? 'Not recorded'],
              ['Sent', p.sentAt ? at(p.sentAt) : 'Not recorded'],
              ['Valid until', formatDate(p.validUntil)],
            ] as [string, string][]
          ).map(([k, v]) => (
            <View key={k} style={[s.row, s.rule, { paddingVertical: 5 }]}>
              <Text style={[s.muted, { width: 110 }]}>{k}</Text>
              <Text style={{ flex: 1 }}>{v}</Text>
            </View>
          ))}
          <View style={[s.box, { marginTop: 16, gap: 3 }]}>
            <Text style={s.medium}>Document fingerprint (SHA-256)</Text>
            <Text style={[s.mono, { fontSize: 8 }]}>{sig.documentHash}</Text>
            <Text style={s.small}>
              {sig.documentHash === currentHash
                ? 'Matches this document: nothing has changed since it was signed.'
                : 'Doesn’t match this document: it changed after signing. Treat the signed version as the agreement.'}
            </Text>
          </View>
          <Text style={[s.small, { marginTop: 14 }]}>
            Recorded by Agency OS for {settings.name}. The fingerprint is worked out from the
            proposal text and the quote’s lines and prices at the moment of signing.
          </Text>
          <PdfFooter s={s} brand={brand} left={`${p.title} · signing record`} />
        </Page>
      ) : null}
    </Document>
  );
}
