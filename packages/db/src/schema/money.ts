import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  char,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { v7 as uuidv7 } from 'uuid';
import { authUsers, workspaces } from './accounts';
import { clients } from './clients';
import { projects } from './projects';
import { quotes } from './sales-docs';

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

export const invoiceTypeEnum = pgEnum('invoice_type', [
  'tax_invoice',
  'bill_of_supply',
  'export_lut',
  'proforma',
]);
export const invoiceStatusEnum = pgEnum('invoice_status', [
  'draft',
  'issued',
  'partially_paid',
  'paid',
  'cancelled',
]);
export const paymentMethodEnum = pgEnum('payment_method', [
  'upi',
  'card',
  'netbanking',
  'bank_transfer',
  'wise',
  'paypal',
  'cash',
  'other',
]);
export const reminderKindEnum = pgEnum('reminder_kind', [
  'before_due',
  'on_due',
  'after_due_3',
  'after_due_7',
]);

export const invoices = pgTable(
  'invoices',
  {
    id: id(),
    workspaceId: workspaceId(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'restrict' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    quoteId: uuid('quote_id').references(() => quotes.id, { onDelete: 'set null' }),
    /** Null while a draft; issuing takes the next number. */
    number: text('number'),
    financialYear: text('financial_year'),
    type: invoiceTypeEnum('type').notNull(),
    proforma: boolean('proforma').notNull().default(false),
    status: invoiceStatusEnum('status').notNull().default('draft'),
    currency: char('currency', { length: 3 }).notNull(),
    /** INR per unit of the invoice currency, for invoices not in INR. */
    exchangeRate: numeric('exchange_rate', { precision: 18, scale: 8 }),
    baseCurrency: char('base_currency', { length: 3 }).notNull(),
    supplierGstin: text('supplier_gstin'),
    supplierStateCode: char('supplier_state_code', { length: 2 }),
    placeOfSupplyCode: char('place_of_supply_code', { length: 2 }),
    exportCountry: char('export_country', { length: 2 }),
    hasLut: boolean('has_lut').notNull().default(false),
    lutArn: text('lut_arn'),
    /** The client's billing details as they were when issued. */
    billTo: jsonb('bill_to'),
    issueOn: date('issue_on'),
    termsDays: integer('terms_days').notNull().default(7),
    dueOn: date('due_on'),
    roundOff: boolean('round_off').notNull().default(false),
    discountMinor: minor('discount_minor'),
    subtotalMinor: minor('subtotal_minor'),
    cgstMinor: minor('cgst_minor'),
    sgstMinor: minor('sgst_minor'),
    igstMinor: minor('igst_minor'),
    roundOffMinor: minor('round_off_minor'),
    totalMinor: minor('total_minor'),
    totalBaseMinor: bigint('total_base_minor', { mode: 'bigint' }),
    amountPaidMinor: minor('amount_paid_minor'),
    acceptPartial: boolean('accept_partial').notNull().default(true),
    notes: text('notes'),
    terms: text('terms'),
    footer: text('footer'),
    pdfPath: text('pdf_path'),
    publicTokenHash: text('public_token_hash'),
    issuedAt: timestamp('issued_at', { withTimezone: true }),
    issuedBy: uuid('issued_by').references(() => authUsers.id, { onDelete: 'set null' }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancelReason: text('cancel_reason'),
    isExample: boolean('is_example').notNull().default(false),
    createdBy: uuid('created_by').references(() => authUsers.id, { onDelete: 'set null' }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('invoices_number_key').on(t.workspaceId, t.number),
    uniqueIndex('invoices_token_key').on(t.publicTokenHash),
    index('invoices_client_idx').on(t.clientId),
    index('invoices_status_idx').on(t.workspaceId, t.status, t.dueOn),
  ],
);

export const invoiceItems = pgTable(
  'invoice_items',
  {
    id: id(),
    workspaceId: workspaceId(),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    description: text('description').notNull(),
    sacCode: text('sac_code'),
    quantity: numeric('quantity', { precision: 12, scale: 3 }).notNull(),
    rateMinor: bigint('rate_minor', { mode: 'bigint' }).notNull(),
    discountMinor: minor('discount_minor'),
    taxableMinor: minor('taxable_minor'),
    taxRateBp: integer('tax_rate_bp').notNull(),
    cgstMinor: minor('cgst_minor'),
    sgstMinor: minor('sgst_minor'),
    igstMinor: minor('igst_minor'),
    amountMinor: minor('amount_minor'),
  },
  (t) => [index('invoice_items_invoice_idx').on(t.invoiceId, t.position)],
);

export const payments = pgTable(
  'payments',
  {
    id: id(),
    workspaceId: workspaceId(),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'restrict' }),
    amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
    currency: char('currency', { length: 3 }).notNull(),
    method: paymentMethodEnum('method').notNull(),
    /** 'razorpay' for webhook payments; null when recorded by hand. */
    provider: text('provider'),
    providerPaymentId: text('provider_payment_id'),
    receivedOn: date('received_on').notNull(),
    /** FIRA or FIRC for payments from abroad (a Storage path). */
    firaPath: text('fira_path'),
    notes: text('notes'),
    recordedBy: uuid('recorded_by').references(() => authUsers.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('payments_provider_key').on(t.provider, t.providerPaymentId),
    index('payments_invoice_idx').on(t.invoiceId),
  ],
);

export const paymentLinks = pgTable(
  'payment_links',
  {
    id: id(),
    workspaceId: workspaceId(),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull().default('razorpay'),
    providerLinkId: text('provider_link_id').notNull(),
    shortUrl: text('short_url').notNull(),
    amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
    status: text('status').notNull().default('created'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex('payment_links_provider_key').on(t.provider, t.providerLinkId)],
);

export const reminders = pgTable(
  'reminders',
  {
    id: id(),
    workspaceId: workspaceId(),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    kind: reminderKindEnum('kind').notNull(),
    scheduledFor: date('scheduled_for').notNull(),
    channel: text('channel').notNull().default('email'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('reminders_invoice_kind_key').on(t.invoiceId, t.kind),
    index('reminders_due_idx').on(t.scheduledFor),
  ],
);
