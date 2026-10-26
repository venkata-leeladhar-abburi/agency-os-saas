import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
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
import { projects } from './projects';

const id = () =>
  uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv7());
const workspaceId = () =>
  uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' });

export const fileVisibilityEnum = pgEnum('file_visibility', ['internal', 'client']);

/** A file in Storage (private bucket, path starting with the workspace id). */
export const files = pgTable(
  'files',
  {
    id: id(),
    workspaceId: workspaceId(),
    /** Files belong to a project when they're project work; access follows the project. */
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
    subjectType: text('subject_type').notNull(),
    subjectId: uuid('subject_id').notNull(),
    storagePath: text('storage_path').notNull(),
    name: text('name').notNull(),
    mime: text('mime').notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    visibility: fileVisibilityEnum('visibility').notNull().default('internal'),
    uploadedBy: uuid('uploaded_by').references(() => authUsers.id, { onDelete: 'set null' }),
    uploadedByContactId: uuid('uploaded_by_contact_id').references(() => clientContacts.id, {
      onDelete: 'set null',
    }),
    isExample: boolean('is_example').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('files_storage_path_key').on(t.storagePath),
    index('files_subject_idx').on(t.workspaceId, t.subjectType, t.subjectId),
    index('files_project_idx').on(t.projectId),
  ],
);

/** The project thread between the agency and the client (portal Messages). */
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
