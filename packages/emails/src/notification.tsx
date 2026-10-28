// The emails for notifications (defaults-and-content.md §7): one layout, with the subject from
// the defaults and a short body that says what happened and links to it. Bodies and the portal
// invite are proposed wording for the founder to review (D-059, open question 21).
import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import { render, toPlainText } from '@react-email/render';
import { emailColours as c, emailFont } from './theme';

export type NotificationEmailProps = {
  agency: { name: string; logoUrl?: string | null };
  /** Their brand colour for the button, only when white text on it is readable. */
  buttonColour?: string | null;
  /** First name, when known: "Hi Srinivas,". */
  greeting?: string | null;
  preview: string;
  lines: string[];
  /** Someone's own words (a comment, a request), shown as a quote. */
  quote?: string | null;
  button: { label: string; url: string };
  /** Whether replies reach the agency (client emails) or nobody (member emails). */
  audience: 'member' | 'client';
};

const text = { fontSize: '15px', lineHeight: '24px', color: c.text, margin: '0 0 16px' };

export function NotificationEmail(p: NotificationEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{p.preview}</Preview>
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
          {p.greeting ? <Text style={text}>Hi {p.greeting},</Text> : null}
          {p.lines.map((line) => (
            <Text key={line} style={text}>
              {line}
            </Text>
          ))}
          {p.quote ? (
            <Text
              style={{
                ...text,
                backgroundColor: c.surface,
                borderRadius: '8px',
                padding: '12px 16px',
              }}
            >
              “{p.quote}”
            </Text>
          ) : null}
          <Section style={{ margin: '8px 0 24px' }}>
            <Button
              href={p.button.url}
              style={{
                backgroundColor: p.buttonColour ?? c.primary,
                borderRadius: '8px',
                color: c.primaryText,
                fontSize: '15px',
                fontWeight: 600,
                padding: '12px 20px',
              }}
            >
              {p.button.label}
            </Button>
          </Section>
          <Hr style={{ borderColor: c.border, margin: '24px 0 16px' }} />
          <Text style={{ ...text, color: c.muted, fontSize: '13px', margin: 0 }}>
            {p.audience === 'client'
              ? `Sent by Agency OS for ${p.agency.name}. Reply to this email to reach them.`
              : `Sent by Agency OS for ${p.agency.name}. Choose which emails you get in Settings, Notifications.`}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const firstName = (name: string | null | undefined) =>
  name ? (name.trim().split(/\s+/)[0] ?? null) : null;

type Base = {
  agency: { name: string; logoUrl?: string | null };
  buttonColour?: string | null;
  /** Where the button goes: the portal page for clients, the app page for members. */
  url: string;
};

/** What each email says. Subjects follow the defaults table word for word. */
export const notificationCopy = {
  gateRequested(
    p: Base & { gate: string; project: string; by: string | null; message: string | null },
  ) {
    const by = p.by ?? p.agency.name;
    return {
      subject: `Approve ${p.gate}`,
      props: {
        ...p,
        audience: 'client' as const,
        preview: `${by} asked you to approve ${p.gate}`,
        lines: [`${by} asked you to approve “${p.gate}” for ${p.project}.`],
        quote: p.message,
        button: { label: 'Review and approve', url: p.url },
      },
    };
  },

  gateDecided(
    p: Base & {
      client: string;
      gate: string;
      project: string;
      approved: boolean;
      comment: string | null;
    },
  ) {
    const subject = p.approved
      ? `${p.client} approved ${p.gate}`
      : `${p.client} asked for changes to ${p.gate}`;
    return {
      subject,
      props: {
        ...p,
        audience: 'member' as const,
        preview: subject,
        lines: [
          p.approved
            ? `${p.client} approved “${p.gate}” for ${p.project}. The next phase can start.`
            : `${p.client} asked for changes to “${p.gate}” for ${p.project}.`,
        ],
        quote: p.comment,
        button: { label: 'Open the project', url: p.url },
      },
    };
  },

  messagePosted(p: Base & { name: string; project: string; audience: 'member' | 'client' }) {
    const subject = `New message from ${p.name} about ${p.project}`;
    return {
      subject,
      props: {
        ...p,
        preview: subject,
        lines: [`${p.name} sent a message about ${p.project}.`],
        button: { label: 'Read and reply', url: p.url },
      },
    };
  },

  invoiceSent(
    p: Base & { number: string; amount: string; dueDate: string; contactName: string | null },
  ) {
    return {
      subject: `Invoice ${p.number} from ${p.agency.name}`,
      props: {
        ...p,
        audience: 'client' as const,
        greeting: firstName(p.contactName),
        preview: `Invoice ${p.number} for ${p.amount}, due on ${p.dueDate}`,
        lines: [
          `${p.agency.name} sent you invoice ${p.number} for ${p.amount}, due on ${p.dueDate}.`,
          'Pay by UPI, card or net banking, or see the bank details and download the PDF on the invoice page.',
        ],
        button: { label: `Pay ${p.amount}`, url: p.url },
      },
    };
  },

  portalInvited(p: Base & { contactName: string | null }) {
    return {
      subject: `${p.agency.name} invited you to see your projects`,
      props: {
        ...p,
        audience: 'client' as const,
        greeting: firstName(p.contactName),
        preview: `Approve work, pay invoices and message ${p.agency.name} in one place`,
        lines: [
          `${p.agency.name} invited you to see your projects with them. Approve work, pay invoices and message the team in one place.`,
          'Sign in with this email address. No password needed.',
        ],
        button: { label: 'Open your projects', url: p.url },
      },
    };
  },
};

export type EmailCopy = { subject: string; props: NotificationEmailProps };

/** Subject, HTML and plain text, ready for the email provider. */
export async function renderNotificationEmail({ subject, props }: EmailCopy) {
  const html = await render(<NotificationEmail {...props} />);
  return { subject, html, text: toPlainText(html) };
}
