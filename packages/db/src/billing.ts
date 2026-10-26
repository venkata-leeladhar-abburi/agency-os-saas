import { PLANS, type Plan } from '@agency-os/core';
import { and, eq, sql } from 'drizzle-orm';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { withService, type Db, type Tx } from './client';
import { auditLog, subscriptions, webhookEvents, workspaces } from './schema';

/**
 * Checks a Razorpay webhook's X-Razorpay-Signature: HMAC-SHA256 of the raw body with the
 * webhook secret, compared in constant time.
 */
export function verifyRazorpaySignature(
  rawBody: string,
  signature: string | null | undefined,
  secret = process.env.RAZORPAY_WEBHOOK_SECRET,
): boolean {
  if (!secret)
    throw new Error(
      'RAZORPAY_WEBHOOK_SECRET is not set. Add it to the environment (see docs/04-engineering/environments-and-deploy.md).',
    );
  if (!signature) return false;
  const expected = Buffer.from(createHmac('sha256', secret).update(rawBody).digest('hex'));
  const given = Buffer.from(signature);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

type SubscriptionStatus = (typeof subscriptions.$inferSelect)['status'];

export type RazorpaySubscriptionEvent = {
  event: string;
  payload: {
    subscription?: {
      entity: {
        id: string;
        status: SubscriptionStatus;
        current_end?: number | null;
        notes?: { workspace_id?: string; plan?: string };
      };
    };
  };
};

/** The workspace a subscription event belongs to (set in the notes when we create it). */
export function workspaceOfEvent(event: RazorpaySubscriptionEvent): string | undefined {
  return event.payload.subscription?.entity.notes?.workspace_id;
}

/** Statuses where the paid plan applies: active, or pending while Razorpay retries a charge. */
const PAID = new Set<SubscriptionStatus>(['active', 'pending']);
/** Statuses where the workspace goes back to Free. Created and authenticated change nothing yet. */
const ENDED = new Set<SubscriptionStatus>([
  'halted',
  'cancelled',
  'completed',
  'expired',
  'paused',
]);

export type WebhookOutcome = 'applied' | 'duplicate' | 'ignored';

/**
 * Applies a subscription webhook once (keyed on Razorpay's event id). Run inside
 * withService(workspaceOfEvent(event)) after verifyRazorpaySignature.
 */
export async function applyRazorpaySubscriptionEvent(
  tx: Tx,
  workspaceId: string,
  eventId: string,
  event: RazorpaySubscriptionEvent,
): Promise<WebhookOutcome> {
  const inserted = await tx
    .insert(webhookEvents)
    .values({ provider: 'razorpay', eventId, type: event.event, payload: event })
    .onConflictDoNothing()
    .returning({ id: webhookEvents.id });
  if (inserted.length === 0) return 'duplicate';
  const done = (error?: string) =>
    tx
      .update(webhookEvents)
      .set({ processedAt: new Date(), error: error ?? null })
      .where(and(eq(webhookEvents.provider, 'razorpay'), eq(webhookEvents.eventId, eventId)));

  const entity = event.payload.subscription?.entity;
  if (!event.event.startsWith('subscription.') || !entity) {
    await done();
    return 'ignored';
  }
  if (entity.notes?.workspace_id !== workspaceId)
    throw new Error('Subscription event is for a different workspace');
  const plan = entity.notes?.plan as Plan | undefined;
  if (!plan || !PLANS.includes(plan) || plan === 'free')
    throw new Error(`Subscription event has no paid plan in its notes: ${String(plan)}`);

  const values = {
    plan,
    status: entity.status,
    providerSubscriptionId: entity.id,
    currentPeriodEnd: entity.current_end ? new Date(entity.current_end * 1000) : null,
  };
  await tx
    .insert(subscriptions)
    .values({ workspaceId, ...values })
    .onConflictDoUpdate({ target: subscriptions.workspaceId, set: values });

  const effective: Plan | undefined = PAID.has(entity.status)
    ? plan
    : ENDED.has(entity.status)
      ? 'free'
      : undefined;
  if (effective) {
    await tx.update(workspaces).set({ plan: effective }).where(eq(workspaces.id, workspaceId));
  }
  await tx.insert(auditLog).values({
    workspaceId,
    actorId: null,
    action: 'subscription.updated',
    subjectType: 'subscription',
    changes: { event: event.event, status: entity.status, plan: effective ?? null },
  });
  await done();
  return 'applied';
}

/** For the health check and tests: events that failed or were never processed. */
export async function unprocessedWebhooks(tx: Tx) {
  return tx
    .select()
    .from(webhookEvents)
    .where(sql`${webhookEvents.processedAt} is null or ${webhookEvents.error} is not null`);
}

export type WebhookResponse = { status: number; body: Record<string, unknown> };

/**
 * The whole Razorpay webhook, independent of the web framework: verify, then apply once.
 * Answers 2xx only when Razorpay should stop retrying.
 */
export async function handleRazorpayWebhook(
  db: Db,
  rawBody: string,
  headers: { signature: string | null; eventId: string | null },
  secret = process.env.RAZORPAY_WEBHOOK_SECRET,
): Promise<WebhookResponse> {
  if (!secret) return { status: 503, body: { error: 'RAZORPAY_WEBHOOK_SECRET is not set' } };
  if (!verifyRazorpaySignature(rawBody, headers.signature, secret))
    return { status: 401, body: { error: 'Invalid signature' } };
  if (!headers.eventId) return { status: 400, body: { error: 'Missing x-razorpay-event-id' } };
  let event: RazorpaySubscriptionEvent;
  try {
    event = JSON.parse(rawBody) as RazorpaySubscriptionEvent;
  } catch {
    return { status: 400, body: { error: 'Body is not JSON' } };
  }
  const workspaceId = event.event?.startsWith('subscription.')
    ? workspaceOfEvent(event)
    : undefined;
  if (!workspaceId) return { status: 200, body: { outcome: 'ignored' } };
  const eventId = headers.eventId;
  const outcome = await withService(db, workspaceId, (tx, id) =>
    applyRazorpaySubscriptionEvent(tx, id, eventId, event),
  );
  return { status: 200, body: { outcome } };
}
