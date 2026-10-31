import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  char,
  date,
  index,
  integer,
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
import { clientContacts, clients } from './clients';
import { proposals } from './sales-docs';

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

export const projectTypeEnum = pgEnum('project_type', ['one_off', 'retainer']);
export const projectStatusEnum = pgEnum('project_status', [
  'active',
  'on_hold',
  'completed',
  'cancelled',
]);
export const projectHealthEnum = pgEnum('project_health', ['on_track', 'at_risk', 'off_track']);
export const phaseStatusEnum = pgEnum('phase_status', [
  'not_started',
  'in_progress',
  'done',
  'skipped',
]);
export const approverTypeEnum = pgEnum('approver_type', ['client', 'internal']);
export const gateStatusEnum = pgEnum('gate_status', [
  'not_started',
  'waiting',
  'approved',
  'changes_requested',
  'skipped',
]);

/** A workspace's own templates, saved from a project (built-in ones live in packages/core). */
export const phaseTemplates = pgTable('phase_templates', {
  id: id(),
  workspaceId: workspaceId(),
  name: text('name').notNull(),
  /** The same shape as core's PhaseTemplate.phases. */
  phases: jsonb('phases').notNull(),
  createdBy: uuid('created_by').references(() => authUsers.id, { onDelete: 'set null' }),
  ...timestamps,
});

export const projects = pgTable(
  'projects',
  {
    id: id(),
    workspaceId: workspaceId(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'restrict' }),
    proposalId: uuid('proposal_id').references(() => proposals.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    type: projectTypeEnum('type').notNull().default('one_off'),
    budgetMinor: bigint('budget_minor', { mode: 'bigint' }),
    currency: char('currency', { length: 3 }).notNull(),
    startOn: date('start_on'),
    dueOn: date('due_on'),
    leadMemberId: uuid('lead_member_id').references(() => authUsers.id, { onDelete: 'set null' }),
    templateName: text('template_name').notNull(),
    status: projectStatusEnum('status').notNull().default('active'),
    health: projectHealthEnum('health').notNull().default('on_track'),
    isExample: boolean('is_example').notNull().default(false),
    createdBy: uuid('created_by').references(() => authUsers.id, { onDelete: 'set null' }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index('projects_workspace_idx').on(t.workspaceId, t.status),
    index('projects_client_idx').on(t.clientId),
  ],
);

export const projectMembers = pgTable(
  'project_members',
  {
    id: id(),
    workspaceId: workspaceId(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    roleOnProject: text('role_on_project'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('project_members_key').on(t.projectId, t.userId),
    index('project_members_user_idx').on(t.userId),
  ],
);

export const phases = pgTable(
  'phases',
  {
    id: id(),
    workspaceId: workspaceId(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    clientLine: text('client_line'),
    deliverables: text('deliverables')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    position: integer('position').notNull(),
    status: phaseStatusEnum('status').notNull().default('not_started'),
    startsOn: date('starts_on'),
    endsOn: date('ends_on'),
    isExample: boolean('is_example').notNull().default(false),
    ...timestamps,
  },
  (t) => [uniqueIndex('phases_position_key').on(t.projectId, t.position)],
);

/** A phase's internal checklist (never shown to clients); drives the project's progress. */
export const checklistItems = pgTable(
  'checklist_items',
  {
    id: id(),
    workspaceId: workspaceId(),
    phaseId: uuid('phase_id')
      .notNull()
      .references(() => phases.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    position: integer('position').notNull(),
    doneAt: timestamp('done_at', { withTimezone: true }),
    doneBy: uuid('done_by').references(() => authUsers.id, { onDelete: 'set null' }),
    isExample: boolean('is_example').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('checklist_items_phase_idx').on(t.phaseId, t.position)],
);

export const gates = pgTable(
  'gates',
  {
    id: id(),
    workspaceId: workspaceId(),
    phaseId: uuid('phase_id')
      .notNull()
      .references(() => phases.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    approverType: approverTypeEnum('approver_type').notNull(),
    approverContactId: uuid('approver_contact_id').references(() => clientContacts.id, {
      onDelete: 'set null',
    }),
    approverUserId: uuid('approver_user_id').references(() => authUsers.id, {
      onDelete: 'set null',
    }),
    status: gateStatusEnum('status').notNull().default('not_started'),
    requestedAt: timestamp('requested_at', { withTimezone: true }),
    requestedBy: uuid('requested_by').references(() => authUsers.id, { onDelete: 'set null' }),
    requestMessage: text('request_message'),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    decidedBy: uuid('decided_by').references(() => authUsers.id, { onDelete: 'set null' }),
    decidedByContactId: uuid('decided_by_contact_id').references(() => clientContacts.id, {
      onDelete: 'set null',
    }),
    decisionComment: text('decision_comment'),
    isExample: boolean('is_example').notNull().default(false),
    ...timestamps,
  },
  (t) => [uniqueIndex('gates_phase_key').on(t.phaseId)],
);

/** The portal thread per project: written by members or by the client's portal contacts. */
export const messages = pgTable(
  'messages',
  {
    id: id(),
    workspaceId: workspaceId(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id').references(() => authUsers.id, { onDelete: 'set null' }),
    authorContactId: uuid('author_contact_id').references(() => clientContacts.id, {
      onDelete: 'set null',
    }),
    body: text('body').notNull(),
    fileIds: uuid('file_ids')
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    isExample: boolean('is_example').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('messages_project_idx').on(t.projectId, t.createdAt)],
);
