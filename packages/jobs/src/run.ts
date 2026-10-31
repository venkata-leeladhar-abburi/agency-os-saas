// The jobs themselves, as plain functions (the Inngest functions in ./inngest.ts call these).
// Each works through workspaces one at a time, as the service role for that workspace.
import {
  activeWorkspaceIds,
  digestRecipients,
  notifyOverdue,
  queueEmails,
  queueRemindersDue,
  sendDueEmails,
  withService,
  workspacesWithEmailDue,
  type Db,
  type DigestRecipient,
  type EmailOutcome,
} from '@agency-os/db';
import { renderQueued, type JobEnv, type Outgoing } from './render';

/** Hands an email to the provider and says what happened. */
export type Send = (email: Outgoing) => Promise<EmailOutcome>;

/** Sends what's due, in every workspace with emails waiting (or one, after an action). */
export async function runEmails(
  db: Db,
  {
    send,
    env,
    now = new Date(),
    workspaceId,
  }: {
    send: Send;
    env: JobEnv;
    now?: Date;
    workspaceId?: string;
  },
) {
  const total = { sent: 0, skipped: 0, failed: 0, retrying: 0 };
  const ids = workspaceId ? [workspaceId] : await workspacesWithEmailDue(db, now);
  for (const ws of ids) {
    const r = await sendDueEmails(
      db,
      ws,
      async (row, tx) => {
        const rendered = await renderQueued(tx, row, env);
        if ('skip' in rendered) return { status: 'skipped', reason: rendered.skip };
        return send(rendered.email);
      },
      { now },
    );
    for (const k of Object.keys(total) as (keyof typeof total)[]) total[k] += r[k];
  }
  return total;
}

/**
 * The morning's work, for every workspace: today's invoice reminders into the outbox, and
 * owners and finance told about invoices that went overdue.
 */
export async function runReminders(db: Db, now = new Date()) {
  let queued = 0;
  let overdue = 0;
  for (const ws of await activeWorkspaceIds(db)) {
    queued += await queueRemindersDue(db, ws, now);
    overdue += await notifyOverdue(db, ws, now);
  }
  return { queued, overdue };
}

/** One line of someone's Today, as the app lists it (href is the app path). */
export type DigestItem = {
  group: string;
  title: string;
  meta: string;
  href: string;
  overdue: boolean;
};

/** Builds a member's Today as that member (the app supplies it, so it shows only what they may see). */
export type DigestItemsFor = (who: {
  db: Db;
  workspaceId: string;
  slug: string;
  plan: string;
  recipient: DigestRecipient;
  now: Date;
}) => Promise<DigestItem[]>;

/**
 * The daily digest, for workspaces where it's now 08:30: each recipient's Today into the outbox,
 * once a day. Lead owners who get only their follow-ups see just those; an empty day sends nothing.
 */
export async function runDigests(
  db: Db,
  { itemsFor, now = new Date() }: { itemsFor: DigestItemsFor; now?: Date },
) {
  let queued = 0;
  let failed = 0;
  for (const ws of await activeWorkspaceIds(db)) {
    const due = await digestRecipients(db, ws, now);
    if (!due) continue;
    for (const recipient of due.recipients) {
      let all: DigestItem[];
      try {
        all = await itemsFor({
          db,
          workspaceId: ws,
          slug: due.slug,
          plan: due.plan,
          recipient,
          now,
        });
      } catch (error) {
        // One person's Today failing (a missing secret, a bad row) never stops everyone else's.
        console.error('Daily digest skipped for a member', { workspaceId: ws, error });
        failed++;
        continue;
      }
      const items =
        recipient.reason === 'follow_ups' ? all.filter((i) => i.group === 'Follow-ups') : all;
      if (!items.length) continue;
      queued += await withService(db, ws, (tx) =>
        queueEmails(tx, ws, [
          {
            kind: 'digest.daily',
            toEmail: recipient.email,
            toUserId: recipient.userId,
            audience: 'member',
            payload: { date: due.date, items },
            dedupeKey: `digest.daily:${due.date}:${recipient.userId}`,
          },
        ]),
      );
    }
  }
  return { queued, failed };
}
