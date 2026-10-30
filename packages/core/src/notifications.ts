/** Notification kinds and their default channels (defaults-and-content.md §7). */
export type InAppDefault = 'on' | 'off' | 'portal' | 'none';
export type EmailDefault = 'on' | 'off' | 'digest';

export type NotificationKind = {
  label: string;
  area: 'sales' | 'delivery' | 'money' | 'team';
  recipients: string;
  inApp: InAppDefault;
  email: EmailDefault;
  /** Email subject with [placeholders]; null when no email is sent. */
  subject: string | null;
};

export const NOTIFICATION_KINDS = {
  'lead.enquiry': {
    label: 'New lead from the enquiry form',
    area: 'sales',
    recipients: 'Lead owner, else owners',
    inApp: 'on',
    email: 'on',
    subject: 'New enquiry from [name]',
  },
  'lead.follow_up_due': {
    label: 'Follow-up due',
    area: 'sales',
    recipients: 'Lead owner',
    inApp: 'on',
    email: 'digest',
    subject: 'Follow-ups due today',
  },
  'proposal.viewed': {
    label: 'Proposal viewed',
    area: 'sales',
    recipients: 'Sender',
    inApp: 'on',
    email: 'off',
    subject: '[client] viewed your proposal',
  },
  'proposal.decided': {
    label: 'Proposal signed or declined',
    area: 'sales',
    recipients: 'Sender, owners',
    inApp: 'on',
    email: 'on',
    subject: '[client] signed the proposal',
  },
  // Proposed (open question 22): not in the defaults table yet.
  'proposal.question': {
    label: 'Question about a proposal',
    area: 'sales',
    recipients: 'Sender, owners',
    inApp: 'on',
    email: 'on',
    subject: '[client] asked about your proposal',
  },
  'gate.requested': {
    label: 'Gate approval requested',
    area: 'delivery',
    recipients: 'Approver (client)',
    inApp: 'portal',
    email: 'on',
    subject: 'Approve [gate]',
  },
  'gate.decided': {
    label: 'Gate approved or changes requested',
    area: 'delivery',
    recipients: 'Project lead',
    inApp: 'on',
    email: 'on',
    subject: '[client] approved [gate]',
  },
  'task.assigned': {
    label: 'Task assigned or mentioned',
    area: 'delivery',
    recipients: 'Member',
    inApp: 'on',
    email: 'off',
    subject: null,
  },
  'message.posted': {
    label: 'New message in a project',
    area: 'delivery',
    recipients: 'The other side: project team or client contacts',
    inApp: 'on',
    email: 'on',
    subject: 'New message from [name] about [project]',
  },
  'invoice.sent': {
    label: 'Invoice sent',
    area: 'money',
    recipients: 'Client contact',
    inApp: 'portal',
    email: 'on',
    subject: 'Invoice [number] from [workspace]',
  },
  'invoice.reminder': {
    label: 'Invoice reminder',
    area: 'money',
    recipients: 'Client contact',
    inApp: 'none',
    email: 'on',
    subject: 'Invoice [number] is due on [date]',
  },
  'payment.received': {
    label: 'Payment received',
    area: 'money',
    recipients: 'Owners, finance, project lead',
    inApp: 'on',
    email: 'on',
    subject: 'Payment received: [amount] for [number]',
  },
  'invoice.overdue': {
    label: 'Invoice overdue',
    area: 'money',
    recipients: 'Owners, finance',
    inApp: 'on',
    email: 'on',
    subject: 'Invoice [number] is overdue',
  },
  'member.invited': {
    label: 'Member invited',
    area: 'team',
    recipients: 'Invitee',
    inApp: 'none',
    email: 'on',
    subject: '[name] invited you to [workspace] on Agency OS',
  },
  'digest.daily': {
    label: 'Daily digest',
    area: 'team',
    recipients: 'Owners',
    inApp: 'none',
    email: 'on',
    subject: 'Today at [workspace]',
  },
} as const satisfies Record<string, NotificationKind>;

export type NotificationKey = keyof typeof NOTIFICATION_KINDS;
export const NOTIFICATION_KEYS = Object.keys(NOTIFICATION_KINDS) as NotificationKey[];

/** The daily digest goes out at 08:30 in the workspace's time zone. */
export const DIGEST_LOCAL_TIME = '08:30';

export type ChannelPreference = { inApp?: boolean; email?: EmailDefault };
export type Channels = { inApp: boolean; email: EmailDefault };

export function isNotificationKey(key: string): key is NotificationKey {
  return Object.hasOwn(NOTIFICATION_KINDS, key);
}

/**
 * The channels a member gets for a kind: their saved preference over the default.
 * In-app only applies to kinds with an in-app list for team members; portal and email-only kinds
 * keep their default there. A kind without an email never gets one.
 */
export function channelsFor(key: NotificationKey, pref: ChannelPreference = {}): Channels {
  const kind: NotificationKind = NOTIFICATION_KINDS[key];
  const teamInApp = kind.inApp === 'on' || kind.inApp === 'off';
  const inApp = teamInApp ? (pref.inApp ?? kind.inApp === 'on') : false;
  const email = kind.subject === null ? 'off' : (pref.email ?? kind.email);
  return { inApp, email };
}

/** Fills [placeholders] in a subject; missing values are left visible so tests catch them. */
export function notificationSubject(
  key: NotificationKey,
  values: Record<string, string>,
): string | null {
  const subject: string | null = NOTIFICATION_KINDS[key].subject;
  return subject?.replace(/\[(\w+)\]/g, (match, name: string) => values[name] ?? match) ?? null;
}
