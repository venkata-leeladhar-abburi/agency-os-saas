import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { v7 as uuidv7 } from 'uuid';
import { authUsers, workspaces } from './accounts';
import { clientContacts } from './clients';
import { phases, projects } from './projects';

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

export const taskStatusEnum = pgEnum('task_status', ['todo', 'in_progress', 'in_review', 'done']);
export const taskPriorityEnum = pgEnum('task_priority', ['low', 'normal', 'high']);

export const tasks = pgTable(
  'tasks',
  {
    id: id(),
    workspaceId: workspaceId(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    phaseId: uuid('phase_id').references(() => phases.id, { onDelete: 'set null' }),
    parentTaskId: uuid('parent_task_id'),
    title: text('title').notNull(),
    description: text('description'),
    assigneeId: uuid('assignee_id').references(() => authUsers.id, { onDelete: 'set null' }),
    dueOn: date('due_on'),
    priority: taskPriorityEnum('priority').notNull().default('normal'),
    status: taskStatusEnum('status').notNull().default('todo'),
    /** Fractional-index key within a status column; COLLATE "C" is set in the migration. */
    position: text('position').notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    isExample: boolean('is_example').notNull().default(false),
    createdBy: uuid('created_by').references(() => authUsers.id, { onDelete: 'set null' }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index('tasks_project_idx').on(t.projectId, t.status, t.position),
    index('tasks_assignee_idx').on(t.workspaceId, t.assigneeId, t.dueOn),
    index('tasks_parent_idx').on(t.parentTaskId),
  ],
);

/** Comments on tasks (and later other records), by a member or a portal contact. */
export const comments = pgTable(
  'comments',
  {
    id: id(),
    workspaceId: workspaceId(),
    subjectType: text('subject_type').notNull(),
    subjectId: uuid('subject_id').notNull(),
    authorId: uuid('author_id').references(() => authUsers.id, { onDelete: 'set null' }),
    authorContactId: uuid('author_contact_id').references(() => clientContacts.id, {
      onDelete: 'set null',
    }),
    body: text('body').notNull(),
    mentions: uuid('mentions')
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    editedAt: timestamp('edited_at', { withTimezone: true }),
  },
  (t) => [index('comments_subject_idx').on(t.workspaceId, t.subjectType, t.subjectId, t.createdAt)],
);

/** A member's short daily update (done, next, blockers), seen by the project lead. */
export const dailyUpdates = pgTable(
  'daily_updates',
  {
    id: id(),
    workspaceId: workspaceId(),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
    forDate: date('for_date').notNull(),
    done: text('done'),
    next: text('next'),
    blockers: text('blockers'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('daily_updates_key').on(
      t.userId,
      t.forDate,
      sql`coalesce(${t.projectId}, '00000000-0000-0000-0000-000000000000'::uuid)`,
    ),
    index('daily_updates_project_idx').on(t.projectId, t.forDate),
  ],
);
