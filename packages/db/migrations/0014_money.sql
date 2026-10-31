CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'issued', 'partially_paid', 'paid', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."invoice_type" AS ENUM('tax_invoice', 'export_invoice', 'bill_of_supply');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('bank_transfer', 'upi', 'card', 'net_banking', 'cash', 'wise', 'paypal', 'other');--> statement-breakpoint
CREATE TYPE "public"."reminder_kind" AS ENUM('before_due', 'on_due', 'after_due');--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"description" text NOT NULL,
	"sac_code" text,
	"quantity" numeric(12, 3) NOT NULL,
	"rate_minor" bigint NOT NULL,
	"discount_minor" bigint DEFAULT 0 NOT NULL,
	"tax_rate_bp" integer NOT NULL,
	"taxable_minor" bigint DEFAULT 0 NOT NULL,
	"cgst_minor" bigint DEFAULT 0 NOT NULL,
	"sgst_minor" bigint DEFAULT 0 NOT NULL,
	"igst_minor" bigint DEFAULT 0 NOT NULL,
	"amount_minor" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"project_id" uuid,
	"quote_id" uuid,
	"number" text,
	"financial_year" text,
	"type" "invoice_type" NOT NULL,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"currency" char(3) NOT NULL,
	"exchange_rate" numeric(18, 8),
	"base_currency" char(3) NOT NULL,
	"supplier_state_code" char(2),
	"place_of_supply_code" char(2),
	"export_country" char(2),
	"has_lut" boolean DEFAULT false NOT NULL,
	"lut_arn" text,
	"round_off" boolean DEFAULT false NOT NULL,
	"issue_on" date,
	"due_on" date NOT NULL,
	"subtotal_minor" bigint DEFAULT 0 NOT NULL,
	"cgst_minor" bigint DEFAULT 0 NOT NULL,
	"sgst_minor" bigint DEFAULT 0 NOT NULL,
	"igst_minor" bigint DEFAULT 0 NOT NULL,
	"round_off_minor" bigint DEFAULT 0 NOT NULL,
	"total_minor" bigint DEFAULT 0 NOT NULL,
	"amount_paid_minor" bigint DEFAULT 0 NOT NULL,
	"notes" text,
	"reminders_enabled" boolean DEFAULT true NOT NULL,
	"public_token_hash" text,
	"link_version" integer DEFAULT 1 NOT NULL,
	"pdf_path" text,
	"is_example" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" char(3) NOT NULL,
	"method" "payment_method" NOT NULL,
	"provider" text,
	"provider_payment_id" text,
	"received_on" date NOT NULL,
	"reference" text,
	"fira_path" text,
	"is_example" boolean DEFAULT false NOT NULL,
	"recorded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"kind" "reminder_kind" NOT NULL,
	"scheduled_for" date NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"channel" text DEFAULT 'email' NOT NULL,
	"provider_message_id" text
);
--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoice_items_invoice_idx" ON "invoice_items" USING btree ("invoice_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_number_key" ON "invoices" USING btree ("workspace_id","number");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_token_key" ON "invoices" USING btree ("public_token_hash");--> statement-breakpoint
CREATE INDEX "invoices_client_idx" ON "invoices" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "invoices_due_idx" ON "invoices" USING btree ("workspace_id","status","due_on");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_key" ON "payments" USING btree ("provider_payment_id");--> statement-breakpoint
CREATE INDEX "payments_invoice_idx" ON "payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reminders_invoice_day_key" ON "reminders" USING btree ("invoice_id","scheduled_for");