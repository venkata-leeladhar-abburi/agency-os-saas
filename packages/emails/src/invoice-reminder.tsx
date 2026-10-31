// The invoice reminder (defaults-and-content.md §4 and §7): to the client contact, before
// and after the due date, with a button to the pay link.
import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import { render, toPlainText } from '@react-email/render';
import { emailColours as c, emailFont } from './theme';

export type InvoiceReminderProps = {
  /** The agency, as on its invoices. */
  agency: { name: string; logoUrl?: string | null };
  /** Their brand colour for the button, only when white text on it is readable. */
  buttonColour?: string | null;
  contactName: string;
  number: string;
  /** Formatted: "₹47,200.00". */
  amountDue: string;
  /** Formatted: "2 Nov 2026". */
  dueDate: string;
  kind: 'before_due' | 'on_due' | 'after_due';
  payUrl: string;
};

export function invoiceReminderSubject(
  p: Pick<InvoiceReminderProps, 'number' | 'dueDate' | 'kind'>,
) {
  return p.kind === 'after_due'
    ? `Invoice ${p.number} was due on ${p.dueDate}`
    : `Invoice ${p.number} is due on ${p.dueDate}`;
}

function lead(p: InvoiceReminderProps) {
  const what = `invoice ${p.number} for ${p.amountDue}`;
  if (p.kind === 'before_due') return `A reminder that ${what} is due on ${p.dueDate}.`;
  if (p.kind === 'on_due') return `A reminder that ${what} is due today, ${p.dueDate}.`;
  return `${what[0]!.toUpperCase()}${what.slice(1)} was due on ${p.dueDate} and is still open.`;
}

const text = { fontSize: '15px', lineHeight: '24px', color: c.text, margin: '0 0 16px' };

export function InvoiceReminder(p: InvoiceReminderProps) {
  const firstName = p.contactName.trim().split(/\s+/)[0] ?? p.contactName;
  return (
    <Html lang="en">
      <Head />
      <Preview>{invoiceReminderSubject(p)}</Preview>
      <Body
        style={{ backgroundColor: c.page, fontFamily: emailFont, margin: 0, padding: '24px 0' }}
      >
        <Container
          style={{
            backgroundColor: c.card,
            border: `1px solid ${c.border}`,
            borderRadius: '12px',
            maxWidth: '520px',
            padding: '32px',
          }}
        >
          <Section style={{ marginBottom: '24px' }}>
            {p.agency.logoUrl ? (
              <Img src={p.agency.logoUrl} alt={p.agency.name} height="36" />
            ) : (
              <Text style={{ ...text, fontSize: '17px', fontWeight: 600, margin: 0 }}>
                {p.agency.name}
              </Text>
            )}
          </Section>
          <Text style={text}>Hi {firstName},</Text>
          <Text style={text}>{lead(p)}</Text>
          {p.kind === 'after_due' ? (
            <Text style={text}>If you’ve already paid, thank you. You can ignore this email.</Text>
          ) : null}
          <Section style={{ margin: '8px 0 24px' }}>
            <Button
              href={p.payUrl}
              style={{
                backgroundColor: p.buttonColour ?? c.primary,
                borderRadius: '8px',
                color: c.primaryText,
                fontSize: '15px',
                fontWeight: 600,
                padding: '12px 20px',
              }}
            >
              Pay {p.amountDue}
            </Button>
          </Section>
          <Text style={{ ...text, color: c.muted, fontSize: '14px' }}>
            Pay by UPI, card or net banking, or see the bank details and download the PDF on{' '}
            <Link href={p.payUrl} style={{ color: c.text }}>
              the invoice page
            </Link>
            .
          </Text>
          <Hr style={{ borderColor: c.border, margin: '24px 0 16px' }} />
          <Text style={{ ...text, color: c.muted, fontSize: '13px', margin: 0 }}>
            Sent by Agency OS for {p.agency.name}. Reply to this email to reach them.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

/** Subject, HTML and plain text, ready for the email provider. */
export async function renderInvoiceReminder(p: InvoiceReminderProps) {
  const html = await render(<InvoiceReminder {...p} />);
  return { subject: invoiceReminderSubject(p), html, text: toPlainText(html) };
}
