// The signing code (prd-mvp.md E2: sign with name and an emailed code): to the person signing
// a proposal, valid for 10 minutes. Wording proposed in D-054 for the founder to review.
import { Body, Container, Head, Hr, Html, Preview, Section, Text } from '@react-email/components';
import { render, toPlainText } from '@react-email/render';
import { emailColours as c, emailFont } from './theme';

export type SigningCodeProps = {
  agency: { name: string };
  /** The proposal's title: "Proposal for Kite & Co". */
  title: string;
  /** Six digits. */
  code: string;
  minutes: number;
};

export function signingCodeSubject(p: Pick<SigningCodeProps, 'code' | 'agency'>) {
  return `${p.code} is your code to sign with ${p.agency.name}`;
}

const text = { fontSize: '15px', lineHeight: '24px', color: c.text, margin: '0 0 16px' };

export function SigningCode(p: SigningCodeProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{signingCodeSubject(p)}</Preview>
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
          <Text style={{ ...text, fontSize: '17px', fontWeight: 600 }}>{p.agency.name}</Text>
          <Text style={text}>Use this code to sign “{p.title}”:</Text>
          <Section style={{ margin: '0 0 16px' }}>
            <Text
              style={{
                ...text,
                fontSize: '28px',
                fontWeight: 600,
                letterSpacing: '6px',
                margin: 0,
              }}
            >
              {p.code}
            </Text>
          </Section>
          <Text style={text}>
            It works for {p.minutes} minutes. If you didn’t ask to sign, you can ignore this email.
          </Text>
          <Hr style={{ borderColor: c.border, margin: '24px 0 16px' }} />
          <Text style={{ ...text, color: c.muted, fontSize: '13px', margin: 0 }}>
            Sent by Agency OS for {p.agency.name}.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

/** Subject, HTML and plain text, ready for the email provider. */
export async function renderSigningCode(p: SigningCodeProps) {
  const html = await render(<SigningCode {...p} />);
  return { subject: signingCodeSubject(p), html, text: toPlainText(html) };
}
