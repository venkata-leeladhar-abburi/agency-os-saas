// The email outbox (jobs only, as the service role): emails are queued when an event is
// delivered, then sent by the email job through Resend, with retries. Nothing here pretends an
// email went out: a row is `sent` only once the provider has accepted it.
import { and, asc, eq, lte, sql } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';
import type { Db, Tx } from './client';
import { withService } from './client';
import type { NotificationEvent } from './projects';
import { emailOutbox, memberships, reminders, workspaces } from './schema';

export type QueuedEmail = typeof emailOutbox.$inferSelect;

/** Who an email is for: links go to the app for members and to the portal for clients. */
export type EmailAudience = 'member' | 'client';

export type EmailToQueue = {
  kind: string;
  toEmail: string;
  toUserId?: string | null;
  audience: EmailAudience;
  payload: Record<string, unknown>;
  /** The same key and address never get a second email. */
  dedupeKey: string;
};

/** Gives up after this many tries; the row stays as `failed` with the last error. */
export const MAX_EMAIL_ATTEMPTS = 5;

async function workspaceOf(tx: Tx, workspaceId: string) {
  const [w] = await tx
    .select({ name: workspaces.name, slug: workspaces.slug })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));
  return w ?? null;
}

/** Queues emails for one workspace. Service role only (inside withService). */
export async function queueEmails(tx: Tx, workspaceId: string, emails: EmailToQueue[]) {
  if (!emails.length) return 0;
  const ws = await workspaceOf(tx, workspaceId);
  if (!ws) return 0;
  const rows = await tx
    .insert(emailOutbox)
    .values(
      emails.map((e) => ({
        workspaceId,
        kind: e.kind,
        toEmail: e.toEmail.trim().toLowerCase(),
        toUserId: e.toUserId ?? null,
        payload: { ...e.payload, audience: e.audience, workspace: ws },
        dedupeKey: e.dedupeKey,
      })),
    )
    .onConflictDoNothing()
    .returning({ id: emailOutbox.id });
  return rows.length;
}

/** Members' sign-in emails (service role only). */
export async function userEmails(tx: Tx, userIds: string[]): Promise<Map<string, string>> {
  if (!userIds.length) return new Map();
  const rows = await tx.execute<{ user_id: string; email: string }>(
    sql`select * from user_emails(${`{${userIds.join(',')}}`}::uuid[])`,
  );
  return new Map(rows.map((r) => [r.user_id, r.email]));
}

/**
 * The emails an event sends: to members who get this kind by email (their settings, from
 * notify()), and to the client's contacts the event names.
 */
export async function queueEventEmails(tx: Tx, event: NotificationEvent, memberIds: string[]) {
  const key = `${event.kind}:${event.key ?? uuidv7()}`;
  const emails = await userEmails(tx, memberIds);
  return queueEmails(tx, event.workspaceId, [
    ...memberIds.flatMap((userId) => {
      const toEmail = emails.get(userId);
      return toEmail
        ? [
            {
              kind: event.kind,
              toEmail,
              toUserId: userId,
              audience: 'member' as const,
              payload: event.payload,
              dedupeKey: key,
            },
          ]
        : [];
    }),
    ...event.contactEmails.map((toEmail) => ({
      kind: event.kind,
      toEmail,
      audience: 'client' as const,
      payload: event.payload,
      dedupeKey: key,
    })),
  ]);
}

/**
 * Where a client's reply goes: the workspace's first owner (replies reach the agency, never
 * Agency OS). Service role only.
 */
export async function workspaceReplyTo(tx: Tx, workspaceId: string): Promise<string | null> {
  const owners = await tx
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(
      and(
        eq(memberships.workspaceId, workspaceId),
        eq(memberships.role, 'owner'),
        eq(memberships.status, 'active'),
      ),
    )
    .orderBy(asc(memberships.createdAt));
  const emails = await userEmails(
    tx,
    owners.map((o) => o.userId),
  );
  return owners.map((o) => emails.get(o.userId)).find(Boolean) ?? null;
}

/** Runs one id-only lookup across workspaces as the service role (the jobs' starting point). */
async function idsAsService(db: Db, query: ReturnType<typeof sql>) {
  const rows = await db.transaction(async (tx) => {
    await tx.execute(sql`set local role service_role`);
    return tx.execute<{ workspace_id: string }>(query);
  });
  return rows.map((r) => r.workspace_id);
}

/** Every live workspace, for the daily jobs to work through one at a time. */
export function activeWorkspaceIds(db: Db): Promise<string[]> {
  return idsAsService(db, sql`select * from active_workspace_ids()`);
}

/** Workspaces with emails due now, for the email job to work through one at a time. */
export function workspacesWithEmailDue(db: Db, now = new Date()): Promise<string[]> {
  return idsAsService(
    db,
    sql`select * from workspaces_with_email_due(${now.toISOString()}::timestamptz)`,
  );
}

/** What happened to one email: accepted by the provider, nothing to send any more, or an error. */
export type EmailOutcome =
  | { status: 'sent'; providerId: string | null }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; error: string };

/**
 * Sends a workspace's due emails, oldest first, with `send` (the email job's renderer and
 * provider; it reads what it needs with `tx`, as the service role). Each row is locked while
 * it's sent, so two runs never send the same email. A reminder is recorded once it's sent.
 */
export async function sendDueEmails(
  db: Db,
  workspaceId: string,
  send: (email: QueuedEmail, tx: Tx) => Promise<EmailOutcome>,
  { now = new Date(), limit = 50 }: { now?: Date; limit?: number } = {},
) {
  const result = { sent: 0, skipped: 0, failed: 0, retrying: 0 };
  for (let i = 0; i < limit; i++) {
    const done = await withService(db, workspaceId, async (tx, ws) => {
      const [row] = await tx
        .select()
        .from(emailOutbox)
        .where(
          and(
            eq(emailOutbox.workspaceId, ws),
            eq(emailOutbox.status, 'queued'),
            lte(emailOutbox.nextAttemptAt, now),
          ),
        )
        .orderBy(asc(emailOutbox.createdAt), asc(emailOutbox.id))
        .limit(1)
        .for('update', { skipLocked: true });
      if (!row) return null;
      const outcome = await send(row, tx).catch((error: unknown): EmailOutcome => ({
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      }));
      const attempts = row.attempts + 1;
      if (outcome.status === 'sent' || outcome.status === 'skipped') {
        await tx
          .update(emailOutbox)
          .set({
            status: outcome.status,
            sentAt: outcome.status === 'sent' ? now : null,
            providerId: outcome.status === 'sent' ? outcome.providerId : null,
            lastError: outcome.status === 'skipped' ? outcome.reason : null,
            attempts,
          })
          .where(eq(emailOutbox.id, row.id));
        if (outcome.status === 'sent' && row.kind === 'invoice.reminder') {
          const p = row.payload as { invoiceId: string; reminder: { kind: string; on: string } };
          await tx
            .insert(reminders)
            .values({
              workspaceId: ws,
              invoiceId: p.invoiceId,
              kind: p.reminder.kind as typeof reminders.$inferInsert.kind,
              scheduledFor: p.reminder.on,
              sentAt: now,
              providerMessageId: outcome.providerId,
            })
            .onConflictDoNothing();
        }
        return outcome.status;
      }
      const failed = attempts >= MAX_EMAIL_ATTEMPTS;
      // Waits 1, 4, 9, 16 minutes between tries.
      const next = new Date(now.getTime() + attempts * attempts * 60_000);
      await tx
        .update(emailOutbox)
        .set({
          status: failed ? 'failed' : 'queued',
          attempts,
          nextAttemptAt: next,
          lastError: outcome.error.slice(0, 500),
        })
        .where(eq(emailOutbox.id, row.id));
      return failed ? ('failed' as const) : ('retrying' as const);
    });
    if (!done) break;
    result[done]++;
  }
  return result;
}
