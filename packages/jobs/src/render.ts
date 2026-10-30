// What a queued email says, worked out when it's sent: names and links from what was queued,
// amounts from the invoice as it is now. Links go to the portal for clients, the app for members.
import { checkBrandColour, formatDate, formatMoney, ROLE_LABELS } from '@agency-os/core';
import {
  hashToken,
  invitationEmailFacts,
  inviteLinkToken,
  invoiceEmailFacts,
  localDate,
  payLinkToken,
  workspaceReplyTo,
  type QueuedEmail,
  type Tx,
} from '@agency-os/db';
import {
  notificationCopy as copy,
  renderInvoiceReminder,
  renderNotificationEmail,
  type EmailCopy,
} from '@agency-os/emails';
import { tokenColour } from '@agency-os/tokens';

export type JobEnv = {
  /** NEXT_PUBLIC_APP_URL, without a trailing slash. */
  appUrl: string;
  /** LINK_SIGNING_SECRET: pay links are worked out again from it. */
  linkSecret: string | null;
};

export type Outgoing = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

export type Rendered = { email: Outgoing } | { skip: string };

type Payload = Record<string, unknown> & {
  audience?: 'member' | 'client';
  workspace?: { name: string; slug: string };
};

const str = (v: unknown, fallback = '') => (typeof v === 'string' && v ? v : fallback);

/** The brand colour for buttons, only when white text on it is readable. */
function buttonColour(colour: string | null) {
  return colour && checkBrandColour(colour, tokenColour('primary-foreground')).usable
    ? colour
    : null;
}

export async function renderQueued(tx: Tx, row: QueuedEmail, env: JobEnv): Promise<Rendered> {
  const p = row.payload as Payload;
  const ws = p.workspace;
  if (!ws) return { skip: 'The workspace is gone.' };
  const audience = p.audience ?? 'member';
  const agency = { name: ws.name };
  const projectUrl = (id: unknown) =>
    audience === 'client'
      ? `${env.appUrl}/p/${ws.slug}/projects/${str(id)}`
      : `${env.appUrl}/w/${ws.slug}/projects/${str(id)}`;
  const replyTo = audience === 'client' ? await workspaceReplyTo(tx, row.workspaceId) : null;
  const done = async (c: EmailCopy) => {
    const r = await renderNotificationEmail({ ...c, props: { ...c.props, audience } });
    return { email: { to: row.toEmail, ...r, ...(replyTo ? { replyTo } : {}) } };
  };

  switch (row.kind) {
    case 'gate.requested':
      return done(
        copy.gateRequested({
          agency,
          url: projectUrl(p.projectId),
          gate: str(p.gate, 'the next step'),
          project: str(p.project, 'your project'),
          by: str(p.lead) || null,
          message: str(p.message) || null,
        }),
      );
    case 'gate.decided':
      return done(
        copy.gateDecided({
          agency,
          url: projectUrl(p.projectId),
          client: str(p.client, 'The client'),
          gate: str(p.gate, 'the sign-off'),
          project: str(p.project, 'the project'),
          approved: p.outcome === 'approved',
          comment: str(p.comment) || null,
        }),
      );
    case 'message.posted':
      return done(
        copy.messagePosted({
          agency,
          url: `${projectUrl(p.projectId)}#messages`,
          name: str(p.name, audience === 'client' ? ws.name : 'Your client'),
          project: str(p.project, 'your project'),
          audience,
        }),
      );
    case 'lead.enquiry':
      return done(
        copy.newEnquiry({
          agency,
          url: `${env.appUrl}/w/${ws.slug}/leads/${str(p.leadId)}`,
          name: str(p.name, 'Someone'),
          company: str(p.company) || null,
        }),
      );
    case 'invoice.overdue':
    case 'payment.received': {
      const url = `${env.appUrl}/w/${ws.slug}/invoices/${str(p.invoiceId)}`;
      const amount =
        typeof p.amountMinor === 'string'
          ? formatMoney(BigInt(p.amountMinor), str(p.currency, 'INR'))
          : '';
      if (row.kind === 'payment.received')
        return done(copy.paymentReceived({ agency, url, number: str(p.number), amount }));
      const facts = await invoiceEmailFacts(tx, str(p.invoiceId));
      if (!facts || facts.dueMinor <= 0n || facts.status === 'paid')
        return { skip: 'The invoice is paid or cancelled.' };
      return done(
        copy.invoiceOverdue({
          agency,
          url,
          number: facts.number,
          client: str(p.client, 'The client'),
          amount: formatMoney(facts.dueMinor, facts.currency),
          dueDate: formatDate(facts.dueOn),
        }),
      );
    }
    case 'digest.daily': {
      const items =
        (p.items as
          | { group: string; title: string; meta: string; href: string; overdue: boolean }[]
          | undefined) ?? [];
      if (!items.length) return { skip: 'Nothing for today.' };
      return done(
        copy.dailyDigest({
          agency,
          url: `${env.appUrl}/w/${ws.slug}`,
          date: formatDate(str(p.date)),
          items: items.map((i) => ({ ...i, url: `${env.appUrl}${i.href}` })),
        }),
      );
    }
    case 'member.invited': {
      const invite = await invitationEmailFacts(tx, str(p.invitationId));
      if (!invite) return { skip: 'The invite was used, cancelled or expired.' };
      if (!env.linkSecret) throw new Error('LINK_SIGNING_SECRET is not set');
      const token = inviteLinkToken(env.linkSecret, invite.id);
      // A link made before the secret changed can't be rebuilt; the members page can send again.
      if (hashToken(token) !== invite.tokenHash)
        return { skip: 'The invite link can’t be rebuilt with the current secret.' };
      return done(
        copy.memberInvited({
          agency: { name: invite.workspace || ws.name },
          url: `${env.appUrl}/invite/${token}`,
          by: invite.invitedBy,
          role: ROLE_LABELS[invite.role],
          expires: formatDate(localDate(invite.expiresAt, 'Asia/Kolkata')),
        }),
      );
    }
    case 'portal.invited':
      return done(
        copy.portalInvited({
          agency,
          url: `${env.appUrl}/sign-in?next=${encodeURIComponent(`/p/${ws.slug}`)}`,
          contactName: str(p.contactName) || null,
        }),
      );
    case 'invoice.sent':
    case 'invoice.reminder': {
      const facts = await invoiceEmailFacts(tx, str(p.invoiceId));
      if (!facts) return { skip: 'The invoice was cancelled.' };
      if (row.kind === 'invoice.reminder' && (facts.dueMinor <= 0n || facts.status === 'paid'))
        return { skip: 'The invoice is paid.' };
      // Without the secret there's no pay link: fail, so it's tried again once it's set.
      if (!env.linkSecret) throw new Error('LINK_SIGNING_SECRET is not set');
      const payUrl = `${env.appUrl}/pay/${payLinkToken(env.linkSecret, facts)}`;
      const colour = buttonColour(facts.agency.brandColor);
      if (row.kind === 'invoice.sent') {
        const c = copy.invoiceSent({
          agency,
          buttonColour: colour,
          url: payUrl,
          number: facts.number,
          amount: formatMoney(facts.dueMinor, facts.currency),
          dueDate: formatDate(facts.dueOn),
          contactName: facts.contactName,
        });
        return done(c);
      }
      const reminder = p.reminder as { kind: 'before_due' | 'on_due' | 'after_due' };
      const r = await renderInvoiceReminder({
        agency,
        buttonColour: colour,
        contactName: facts.contactName ?? '',
        number: facts.number,
        amountDue: formatMoney(facts.dueMinor, facts.currency),
        dueDate: formatDate(facts.dueOn),
        kind: reminder.kind,
        payUrl,
      });
      return { email: { to: row.toEmail, ...r, ...(replyTo ? { replyTo } : {}) } };
    }
    default:
      return { skip: `No email is sent for ${row.kind}.` };
  }
}
