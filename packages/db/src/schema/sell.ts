import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  char,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { v7 as uuidv7 } from 'uuid';
import { authUsers, workspaces } from './accounts';

const id = () =>
  uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv7());
const workspaceId = () =>
  uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' });
const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const stageKindEnum = pgEnum('stage_kind', ['open', 'won', 'lost']);
export const leadSourceEnum = pgEnum('lead_source', [
  'referral',
  'instagram',
  'linkedin',
  'website',
  'marketplace',
  'ads',
  'indiamart',
  'whatsapp',
  'other',
]);
export const lostReasonEnum = pgEnum('lost_reason', [
  'price',
  'timing',
  'chose_another_provider',
  'no_reply',
  'not_a_fit',
  'budget_cut',
  'other',
]);

export const pipelineStages = pgTable(
  'pipeline_stages',
  {
    id: id(),
    workspaceId: workspaceId(),
    name: text('name').notNull(),
    /** Fractional-index key; COLLATE "C" is set in migrations/0005 so it sorts byte by byte. */
    position: text('position').notNull(),
    kind: stageKindEnum('kind').notNull().default('open'),
    ...timestamps,
  },
  (t) => [index('pipeline_stages_workspace_idx').on(t.workspaceId, t.position)],
);

export const leads = pgTable(
  'leads',
  {
    id: id(),
    workspaceId: workspaceId(),
    stageId: uuid('stage_id')
      .notNull()
      .references(() => pipelineStages.id, { onDelete: 'restrict' }),
    /** Fractional-index key; COLLATE "C" is set in migrations/0005 so it sorts byte by byte. */
    position: text('position').notNull(),
    name: text('name').notNull(),
    company: text('company'),
    email: text('email'),
    phone: text('phone'),
    source: leadSourceEnum('source').notNull().default('other'),
    valueMinor: bigint('value_minor', { mode: 'bigint' }),
    currency: char('currency', { length: 3 }).notNull(),
    service: text('service'),
    notes: text('notes'),
    ownerId: uuid('owner_id').references(() => authUsers.id, { onDelete: 'set null' }),
    nextFollowUpAt: timestamp('next_follow_up_at', { withTimezone: true }),
    lostReason: lostReasonEnum('lost_reason'),
    lostNote: text('lost_note'),
    convertedClientId: uuid('converted_client_id'),
    isExample: boolean('is_example').notNull().default(false),
    createdBy: uuid('created_by').references(() => authUsers.id, { onDelete: 'set null' }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index('leads_board_idx').on(t.workspaceId, t.stageId, t.position),
    index('leads_follow_up_idx').on(t.workspaceId, t.nextFollowUpAt),
    index('leads_owner_idx').on(t.workspaceId, t.ownerId),
  ],
);

/** The timeline behind every ActivityFeed: notes, calls, stage moves, emails, views. */
export const activities = pgTable(
  'activities',
  {
    id: id(),
    workspaceId: workspaceId(),
    subjectType: text('subject_type').notNull(),
    subjectId: uuid('subject_id').notNull(),
    kind: text('kind').notNull(),
    body: text('body'),
    actorId: uuid('actor_id').references(() => authUsers.id, { onDelete: 'set null' }),
    meta: jsonb('meta')
      .notNull()
      .default(sql`'{}'::jsonb`),
    isExample: boolean('is_example').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('activities_subject_idx').on(t.workspaceId, t.subjectType, t.subjectId, t.createdAt),
  ],
);

/** The hosted enquiry form; submissions create leads with the source Website. */
export const enquiryForms = pgTable(
  'enquiry_forms',
  {
    id: id(),
    workspaceId: workspaceId(),
    publicTokenHash: text('public_token_hash').notNull(),
    fields: jsonb('fields')
      .notNull()
      .default(sql`'{}'::jsonb`),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex('enquiry_forms_token_key').on(t.publicTokenHash)],
);
