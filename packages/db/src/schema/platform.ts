import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { v7 as uuidv7 } from 'uuid';
import { authUsers, planEnum, workspaces } from './accounts';

const id = () =>
  uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv7());
const workspaceId = () =>
  uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' });

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'created',
  'authenticated',
  'active',
  'pending',
  'halted',
  'cancelled',
  'completed',
  'expired',
  'paused',
]);

/** Agency OS's own billing for a workspace (Razorpay subscriptions). Written only by webhooks. */
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: id(),
    workspaceId: workspaceId(),
    plan: planEnum('plan').notNull(),
    status: subscriptionStatusEnum('status').notNull(),
    provider: text('provider').notNull().default('razorpay'),
    providerSubscriptionId: text('provider_subscription_id').notNull(),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('subscriptions_workspace_key').on(t.workspaceId),
    uniqueIndex('subscriptions_provider_id_key').on(t.provider, t.providerSubscriptionId),
  ],
);

/** Every webhook received, keyed on the provider's event id so each is applied once. */
export const webhookEvents = pgTable(
  'webhook_events',
  {
    id: id(),
    provider: text('provider').notNull(),
    eventId: text('event_id').notNull(),
    type: text('type').notNull(),
    payload: jsonb('payload').notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    error: text('error'),
  },
  (t) => [uniqueIndex('webhook_events_provider_event_key').on(t.provider, t.eventId)],
);

/** The in-app notification list. Jobs create rows; each member reads and marks their own. */
export const notifications = pgTable(
  'notifications',
  {
    id: id(),
    workspaceId: workspaceId(),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    payload: jsonb('payload').notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('notifications_user_created_idx').on(t.userId, t.workspaceId, t.createdAt)],
);

/** A member's change from the default channels for one kind; null keeps the default. */
export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    workspaceId: workspaceId(),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    inApp: boolean('in_app'),
    email: text('email'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.userId, t.kind] })],
);

/**
 * Emails waiting to go out, and what happened to them. Written by jobs as the service role when
 * an event is delivered; sent by the email job through Resend. Members never read it.
 */
export const emailOutbox = pgTable(
  'email_outbox',
  {
    id: id(),
    workspaceId: workspaceId(),
    kind: text('kind').notNull(),
    toEmail: text('to_email').notNull(),
    toUserId: uuid('to_user_id').references(() => authUsers.id, { onDelete: 'set null' }),
    /** What the email says, filled in when it's sent (names, links, amounts). */
    payload: jsonb('payload').notNull(),
    /** One email per event and recipient, however often the event is delivered. */
    dedupeKey: text('dedupe_key').notNull(),
    status: text('status').notNull().default('queued'),
    attempts: integer('attempts').notNull().default(0),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull().defaultNow(),
    lastError: text('last_error'),
    providerId: text('provider_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('email_outbox_dedupe_key').on(t.dedupeKey, t.toEmail),
    index('email_outbox_due_idx').on(t.workspaceId, t.status, t.nextAttemptAt),
  ],
);

/**
 * A member's own named filters for a list (the leads page for now). Only the member sees theirs.
 * `query` is the list's link parameters, such as `source=referral&due=1`.
 */
export const savedViews = pgTable(
  'saved_views',
  {
    id: id(),
    workspaceId: workspaceId(),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    area: text('area').notNull(),
    name: text('name').notNull(),
    query: text('query').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('saved_views_name').on(t.workspaceId, t.userId, t.area, t.name)],
);
