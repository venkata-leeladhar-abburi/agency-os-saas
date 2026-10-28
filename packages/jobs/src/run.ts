// The jobs themselves, as plain functions (the Inngest functions in ./inngest.ts call these).
// Each works through workspaces one at a time, as the service role for that workspace.
import {
  activeWorkspaceIds,
  notifyOverdue,
  queueRemindersDue,
  sendDueEmails,
  workspacesWithEmailDue,
  type Db,
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
