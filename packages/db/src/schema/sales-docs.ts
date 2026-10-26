import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  char,
  date,
  index,
  inet,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { v7 as uuidv7 } from 'uuid';
import { authUsers, workspaces } from './accounts';
import { clients } from './clients';
import { leads } from './sell';

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
const minor = (name: string) =>
  bigint(name, { mode: 'bigint' })
    .notNull()
    .default(sql`0`);

export const documentKindEnum = pgEnum('document_kind', ['quote', 'invoice']);
export const quoteStatusEnum = pgEnum('quote_status', [
  'draft',
  'sent',
  'accepted',
  'declined',
  'expired',
]);
export const proposalStatusEnum = pgEnum('proposal_status', [
  'draft',
  'sent',
  'viewed',
  'signed',
  'declined',
  'expired',
]);
export const verifiedViaEnum = pgEnum('verified_via', ['email_otp', 'phone_otp']);

/** Consecutive numbers per workspace, kind and financial year; row-locked when a number is taken. */
export const documentSequences = pgTable(
  'document_sequences',
  {
    workspaceId: workspaceId(),
    kind: documentKindEnum('kind').notNull(),
    financialYear: text('financial_year').notNull(),
    nextNumber: integer('next_number').notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.kind, t.financialYear] })],
);

export const quotes = pgTable(
  'quotes',
  {
    id: id(),
    workspaceId: workspaceId(),
    leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
    number: text('number').notNull(),
    financialYear: text('financial_year').notNull(),
    title: text('title'),
    currency: char('currency', { length: 3 }).notNull(),
    /** The workspace's GST state when the quote was made; null when not registered. */
    supplierStateCode: char('supplier_state_code', { length: 2 }),
    /** Place of supply: an Indian state code, or null for a client abroad (export). */
    placeOfSupplyCode: char('place_of_supply_code', { length: 2 }),
    exportCountry: char('export_country', { length: 2 }),
    hasLut: boolean('has_lut').notNull().default(false),
    roundOff: boolean('round_off').notNull().default(false),
    discountMinor: minor('discount_minor'),
    subtotalMinor: minor('subtotal_minor'),
    cgstMinor: minor('cgst_minor'),
    sgstMinor: minor('sgst_minor'),
    igstMinor: minor('igst_minor'),
    roundOffMinor: minor('round_off_minor'),
    totalMinor: minor('total_minor'),
    validUntil: date('valid_until'),
    status: quoteStatusEnum('status').notNull().default('draft'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    notes: text('notes'),
    isExample: boolean('is_example').notNull().default(false),
    createdBy: uuid('created_by').references(() => authUsers.id, { onDelete: 'set null' }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('quotes_number_key').on(t.workspaceId, t.number),
    index('quotes_lead_idx').on(t.leadId),
    index('quotes_client_idx').on(t.clientId),
  ],
);

export const quoteItems = pgTable(
  'quote_items',
  {
    id: id(),
    workspaceId: workspaceId(),
    quoteId: uuid('quote_id')
      .notNull()
      .references(() => quotes.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    description: text('description').notNull(),
    sacCode: text('sac_code'),
    quantity: numeric('quantity', { precision: 12, scale: 3 }).notNull(),
    rateMinor: bigint('rate_minor', { mode: 'bigint' }).notNull(),
    discountMinor: minor('discount_minor'),
    taxRateBp: integer('tax_rate_bp').notNull(),
    taxableMinor: minor('taxable_minor'),
    cgstMinor: minor('cgst_minor'),
    sgstMinor: minor('sgst_minor'),
    igstMinor: minor('igst_minor'),
    amountMinor: minor('amount_minor'),
  },
  (t) => [index('quote_items_quote_idx').on(t.quoteId, t.position)],
);

export const proposals = pgTable(
  'proposals',
  {
    id: id(),
    workspaceId: workspaceId(),
    leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
    quoteId: uuid('quote_id').references(() => quotes.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    blocks: jsonb('blocks').notNull(),
    status: proposalStatusEnum('status').notNull().default('draft'),
    publicTokenHash: text('public_token_hash'),
    /** SHA-256 of what was sent (blocks and quote), so the signature covers exactly that. */
    documentSha256: text('document_sha256'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    sentBy: uuid('sent_by').references(() => authUsers.id, { onDelete: 'set null' }),
    firstViewedAt: timestamp('first_viewed_at', { withTimezone: true }),
    lastViewedAt: timestamp('last_viewed_at', { withTimezone: true }),
    viewCount: integer('view_count').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    declineReason: text('decline_reason'),
    isExample: boolean('is_example').notNull().default(false),
    createdBy: uuid('created_by').references(() => authUsers.id, { onDelete: 'set null' }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('proposals_token_key').on(t.publicTokenHash),
    index('proposals_lead_idx').on(t.leadId),
  ],
);

/** One-time codes that prove the signer's email before they sign. */
export const signingCodes = pgTable(
  'signing_codes',
  {
    id: id(),
    workspaceId: workspaceId(),
    proposalId: uuid('proposal_id')
      .notNull()
      .references(() => proposals.id, { onDelete: 'cascade' }),
    channel: verifiedViaEnum('channel').notNull(),
    destination: text('destination').notNull(),
    codeHash: text('code_hash').notNull(),
    attempts: integer('attempts').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('signing_codes_proposal_idx').on(t.proposalId, t.createdAt)],
);

/** The evidence for a signed proposal (the audit trail). Never changed once written. */
export const signatures = pgTable(
  'signatures',
  {
    id: id(),
    workspaceId: workspaceId(),
    proposalId: uuid('proposal_id')
      .notNull()
      .references(() => proposals.id, { onDelete: 'restrict' }),
    signerName: text('signer_name').notNull(),
    signerEmail: text('signer_email'),
    signerPhone: text('signer_phone'),
    verifiedVia: verifiedViaEnum('verified_via').notNull(),
    signatureImagePath: text('signature_image_path'),
    ip: inet('ip'),
    userAgent: text('user_agent'),
    signedAt: timestamp('signed_at', { withTimezone: true }).notNull().defaultNow(),
    documentSha256: text('document_sha256').notNull(),
    auditPdfPath: text('audit_pdf_path'),
  },
  (t) => [uniqueIndex('signatures_proposal_key').on(t.proposalId)],
);
