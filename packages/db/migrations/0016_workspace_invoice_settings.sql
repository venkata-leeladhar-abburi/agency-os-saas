ALTER TABLE "workspaces" ADD COLUMN "payment_terms_days" integer DEFAULT 7 NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "bank" jsonb;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "invoice_footer" text;