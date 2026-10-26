import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  inet,
  jsonb,
  pgEnum,
  pgSchema,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  date,
} from 'drizzle-orm/pg-core';
import { v7 as uuidv7 } from 'uuid';

/** Supabase's auth.users, referenced only for foreign keys (Supabase owns the table). */
const auth = pgSchema('auth');
export const authUsers = auth.table('users', { id: uuid('id').primaryKey() });

export const roleEnum = pgEnum('role', [
  'owner',
  'admin',
  'project_lead',
  'member',
  'finance',
  'hr',
]);
export const scopeEnum = pgEnum('permission_scope', ['all', 'own']);
export const membershipStatusEnum = pgEnum('membership_status', ['active', 'suspended']);
export const planEnum = pgEnum('plan', ['free', 'solo', 'starter', 'growth', 'enterprise']);

const id = () =>
  uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv7());
const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const profiles = pgTable('profiles', {
  id: uuid('id')
    .primaryKey()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  fullName: text('full_name'),
  phone: text('phone'),
  avatarPath: text('avatar_path'),
  locale: text('locale').notNull().default('en-IN'),
  timeZone: text('time_zone').notNull().default('Asia/Kolkata'),
  ...timestamps,
});

export const workspaces = pgTable(
  'workspaces',
  {
    id: id(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    country: text('country').notNull().default('IN'),
    baseCurrency: text('base_currency').notNull().default('INR'),
    locale: text('locale').notNull().default('en-IN'),
    timeZone: text('time_zone').notNull().default('Asia/Kolkata'),
    logoPath: text('logo_path'),
    brandColor: text('brand_color'),
    gstin: text('gstin'),
    legalName: text('legal_name'),
    stateCode: text('state_code'),
    address: jsonb('address'),
    lutArn: text('lut_arn'),
    lutValidFrom: date('lut_valid_from'),
    lutValidTo: date('lut_valid_to'),
    invoicePrefix: text('invoice_prefix').notNull().default('INV'),
    plan: planEnum('plan').notNull().default('free'),
    services: text('services')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    onboarding: jsonb('onboarding')
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdBy: uuid('created_by').references(() => authUsers.id, { onDelete: 'set null' }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex('workspaces_slug_key').on(t.slug)],
);

export const memberships = pgTable(
  'memberships',
  {
    id: id(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    role: roleEnum('role').notNull(),
    status: membershipStatusEnum('status').notNull().default('active'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('memberships_workspace_user_key').on(t.workspaceId, t.userId),
    index('memberships_user_idx').on(t.userId),
  ],
);

export const rolePermissions = pgTable(
  'role_permissions',
  {
    role: roleEnum('role').notNull(),
    permission: text('permission').notNull(),
    scope: scopeEnum('scope').notNull(),
  },
  (t) => [primaryKey({ columns: [t.role, t.permission] })],
);

export const invitations = pgTable(
  'invitations',
  {
    id: id(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    email: text('email'),
    phone: text('phone'),
    role: roleEnum('role').notNull(),
    tokenHash: text('token_hash').notNull(),
    invitedBy: uuid('invited_by').references(() => authUsers.id, { onDelete: 'set null' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    acceptedBy: uuid('accepted_by').references(() => authUsers.id, { onDelete: 'set null' }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('invitations_token_hash_key').on(t.tokenHash),
    index('invitations_workspace_idx').on(t.workspaceId),
  ],
);

export const auditLog = pgTable(
  'audit_log',
  {
    id: id(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    actorId: uuid('actor_id'),
    action: text('action').notNull(),
    subjectType: text('subject_type'),
    subjectId: uuid('subject_id'),
    ip: inet('ip'),
    userAgent: text('user_agent'),
    changes: jsonb('changes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('audit_log_workspace_created_idx').on(t.workspaceId, t.createdAt)],
);

export const isExampleColumn = () => boolean('is_example').notNull().default(false);
