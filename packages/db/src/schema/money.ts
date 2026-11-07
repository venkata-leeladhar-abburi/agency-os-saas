import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  char,
  date,
  index,
  integer,
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

/** The document a GST invoice is, from packages/core (calculateInvoice().documentType). */
export const invoiceTypeEnum = pgEnum('invoice_type', [
  'tax_invoice',
  'export_invoice',
  'bill_of_supply',
]);
/** Stored states; "overdue" is worked out from the due date when read. */
export const invoiceStatusEnum = pgEnum('invoice_status', [
  'draft',
  'issued',
  'partially_paid',
  'paid',
  'cancelled',
]);
export const paymentMethodEnum = pgEnum('payment_method', [
  'bank_transfer',
  'upi',
  'card',
  'net_banking',
  'cash',
  'wise',
  'paypal',
  'other',
]);
export const reminderKindEnum = pgEnum('reminder_kind', ['before_due', 'on_due', 'after_due']);

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
    /** Given when issued: OSS/26-27/017. Drafts have none. */
    number: text('number'),
    financialYear: text('financial_year'),
    type: invoiceTypeEnum('type').notNull(),
    status: invoiceStatusEnum('status').notNull().default('draft'),
    currency: char('currency', { length: 3 }).notNull(),
    /** Base currency per unit of the invoice currency on the invoice date (numeric(18,8)). */
    exchangeRate: numeric('exchange_rate', { precision: 18, scale: 8 }),
    baseCurrency: char('base_currency', { length: 3 }).notNull(),
    supplierStateCode: char('supplier_state_code', { length: 2 }),
    placeOfSupplyCode: char('place_of_supply_code', { length: 2 }),
    exportCountry: char('export_country', { length: 2 }),
    hasLut: boolean('has_lut').notNull().default(false),
    lutArn: text('lut_arn'),
    roundOff: boolean('round_off').notNull().default(false),
    issueOn: date('issue_on'),
    dueOn: date('due_on').notNull(),
    subtotalMinor: minor('subtotal_minor'),
    cgstMinor: minor('cgst_minor'),
    sgstMinor: minor('sgst_minor'),
    igstMinor: minor('igst_minor'),
    roundOffMinor: minor('round_off_minor'),
    totalMinor: minor('total_minor'),
    amountPaidMinor: minor('amount_paid_minor'),
    notes: text('notes'),
    /** Email reminders around the due date (defaults-and-content.md §4). */
    remindersEnabled: boolean('reminders_enabled').notNull().default(true),
    /** The pay link: hash of linkToken('invoice', id, linkVersion). */
    publicTokenHash: text('public_token_hash'),
    linkVersion: integer('link_version').notNull().default(1),
    pdfPath: text('pdf_path'),
    isExample: boolean('is_example').notNull().default(false),
    createdBy: uuid('created_by').references(() => authUsers.id, { onDelete: 'set null' }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('invoices_number_key').on(t.workspaceId, t.number),
    uniqueIndex('invoices_token_key').on(t.publicTokenHash),
    index('invoices_client_idx').on(t.clientId),
    index('invoices_due_idx').on(t.workspaceId, t.status, t.dueOn),
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
    taxRateBp: integer('tax_rate_bp').notNull(),
    taxableMinor: minor('taxable_minor'),
    cgstMinor: minor('cgst_minor'),
    sgstMinor: minor('sgst_minor'),
    igstMinor: minor('igst_minor'),
    amountMinor: minor('amount_minor'),
  },
  (t) => [index('invoice_items_invoice_idx').on(t.invoiceId, t.position)],
);

/** Money received. Never changed or deleted once recorded; the invoice's paid amount follows. */
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
    /** "razorpay" for online payments; null when recorded by hand. */
    provider: text('provider'),
    providerPaymentId: text('provider_payment_id'),
    receivedOn: date('received_on').notNull(),
    reference: text('reference'),
    firaPath: text('fira_path'),
    isExample: boolean('is_example').notNull().default(false),
    recordedBy: uuid('recorded_by').references(() => authUsers.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('payments_provider_key').on(t.providerPaymentId),
    index('payments_invoice_idx').on(t.invoiceId),
  ],
);

/** Reminders that went out, one per invoice and scheduled date. */
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
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
    channel: text('channel').notNull().default('email'),
    providerMessageId: text('provider_message_id'),
  },
  (t) => [uniqueIndex('reminders_invoice_day_key').on(t.invoiceId, t.scheduledFor)],
);
