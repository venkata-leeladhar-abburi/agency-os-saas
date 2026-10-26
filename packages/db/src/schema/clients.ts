import {
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
import { leads } from './sell';

const id = () =>
  uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv7());
const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const channelEnum = pgEnum('preferred_channel', ['email', 'whatsapp', 'phone']);

export const clients = pgTable(
  'clients',
  {
    id: id(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    legalName: text('legal_name'),
    gstin: text('gstin'),
    /** GST state code (place of supply); from the GSTIN when there is one. */
    stateCode: char('state_code', { length: 2 }),
    country: char('country', { length: 2 }).notNull(),
    currency: char('currency', { length: 3 }).notNull(),
    timeZone: text('time_zone').notNull(),
    billingAddress: jsonb('billing_address'),
    preferredChannel: channelEnum('preferred_channel').notNull().default('email'),
    notes: text('notes'),
    fromLeadId: uuid('from_lead_id').references(() => leads.id, { onDelete: 'set null' }),
    isExample: boolean('is_example').notNull().default(false),
    createdBy: uuid('created_by').references(() => authUsers.id, { onDelete: 'set null' }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index('clients_workspace_name_idx').on(t.workspaceId, t.name),
    uniqueIndex('clients_from_lead_key').on(t.fromLeadId),
  ],
);

export const clientContacts = pgTable(
  'client_contacts',
  {
    id: id(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    email: text('email'),
    phone: text('phone'),
    role: text('role'),
    isPrimary: boolean('is_primary').notNull().default(false),
    /** Set when the contact first signs in to the portal with the invited email. */
    userId: uuid('user_id').references(() => authUsers.id, { onDelete: 'set null' }),
    portalInvitedAt: timestamp('portal_invited_at', { withTimezone: true }),
    portalRevokedAt: timestamp('portal_revoked_at', { withTimezone: true }),
    isExample: boolean('is_example').notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index('client_contacts_client_idx').on(t.clientId),
    index('client_contacts_user_idx').on(t.userId),
  ],
);
