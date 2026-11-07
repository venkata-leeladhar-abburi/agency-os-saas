import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { v7 as uuidv7 } from 'uuid';
import { authUsers, workspaces } from './accounts';
import { clients } from './clients';

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

/** The Playbook's nine kinds of item (roadmap R2, docs/02-product/knowledge-base.md). */
export const knowledgeKindEnum = pgEnum('knowledge_kind', [
  'process',
  'prompt',
  'tool',
  'website',
  'component',
  'template',
  'checklist',
  'board',
  'learning',
]);

/** Who sees an item: only its author, the team (optionally some roles), or the team and clients. */
export const knowledgeVisibilityEnum = pgEnum('knowledge_visibility', [
  'private',
  'team',
  'clients',
]);

export const knowledgeStatusEnum = pgEnum('knowledge_status', ['draft', 'published']);

/** Folders for the knowledge base; they nest. Everyone in the workspace sees the folders. */
export const knowledgeFolders = pgTable(
  'knowledge_folders',
  {
    id: id(),
    workspaceId: workspaceId(),
    parentId: uuid('parent_id'),
    name: text('name').notNull(),
    description: text('description'),
    position: integer('position').notNull().default(0),
    isExample: boolean('is_example').notNull().default(false),
    createdBy: uuid('created_by').references(() => authUsers.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [index('knowledge_folders_parent_idx').on(t.workspaceId, t.parentId)],
);

/** One piece of knowledge: an SOP, a prompt, a tool, a template, a learning… */
export const knowledgeItems = pgTable(
  'knowledge_items',
  {
    id: id(),
    workspaceId: workspaceId(),
    folderId: uuid('folder_id').references(() => knowledgeFolders.id, { onDelete: 'set null' }),
    kind: knowledgeKindEnum('kind').notNull(),
    title: text('title').notNull(),
    summary: text('summary'),
    /** Markdown: headings, lists, bold, links, code. Rendered without HTML. */
    body: text('body').notNull().default(''),
    /** A tool, website, board or file kept elsewhere. */
    url: text('url'),
    tags: text('tags')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    visibility: knowledgeVisibilityEnum('visibility').notNull().default('team'),
    /** For team items: only these roles (owners and admins always). Empty means everyone. */
    roles: text('roles')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** For client items: every client, or only those in knowledge_item_clients. */
    allClients: boolean('all_clients').notNull().default(false),
    status: knowledgeStatusEnum('status').notNull().default('published'),
    isExample: boolean('is_example').notNull().default(false),
    createdBy: uuid('created_by').references(() => authUsers.id, { onDelete: 'set null' }),
    updatedBy: uuid('updated_by').references(() => authUsers.id, { onDelete: 'set null' }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index('knowledge_items_folder_idx').on(t.workspaceId, t.folderId),
    index('knowledge_items_updated_idx').on(t.workspaceId, t.updatedAt),
  ],
);

/** The clients a client item is shared with (when it isn't shared with all of them). */
export const knowledgeItemClients = pgTable(
  'knowledge_item_clients',
  {
    id: id(),
    workspaceId: workspaceId(),
    itemId: uuid('item_id')
      .notNull()
      .references(() => knowledgeItems.id, { onDelete: 'cascade' }),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
  },
  (t) => [index('knowledge_item_clients_item_idx').on(t.itemId)],
);
