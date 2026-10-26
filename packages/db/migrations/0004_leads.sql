CREATE TYPE "public"."lead_source" AS ENUM('referral', 'instagram', 'linkedin', 'website', 'marketplace', 'ads', 'indiamart', 'whatsapp', 'other');--> statement-breakpoint
CREATE TYPE "public"."lost_reason" AS ENUM('price', 'timing', 'chose_another_provider', 'no_reply', 'not_a_fit', 'budget_cut', 'other');--> statement-breakpoint
CREATE TYPE "public"."stage_kind" AS ENUM('open', 'won', 'lost');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"body" text,
	"actor_id" uuid,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_example" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enquiry_forms" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"public_token_hash" text NOT NULL,
	"fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"stage_id" uuid NOT NULL,
	"position" text NOT NULL,
	"name" text NOT NULL,
	"company" text,
	"email" text,
	"phone" text,
	"source" "lead_source" DEFAULT 'other' NOT NULL,
	"value_minor" bigint,
	"currency" char(3) NOT NULL,
	"service" text,
	"notes" text,
	"owner_id" uuid,
	"next_follow_up_at" timestamp with time zone,
	"lost_reason" "lost_reason",
	"lost_note" text,
	"converted_client_id" uuid,
	"is_example" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_stages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" text NOT NULL,
	"kind" "stage_kind" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiry_forms" ADD CONSTRAINT "enquiry_forms_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_stage_id_pipeline_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."pipeline_stages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_subject_idx" ON "activities" USING btree ("workspace_id","subject_type","subject_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "enquiry_forms_token_key" ON "enquiry_forms" USING btree ("public_token_hash");--> statement-breakpoint
CREATE INDEX "leads_board_idx" ON "leads" USING btree ("workspace_id","stage_id","position");--> statement-breakpoint
CREATE INDEX "leads_follow_up_idx" ON "leads" USING btree ("workspace_id","next_follow_up_at");--> statement-breakpoint
CREATE INDEX "leads_owner_idx" ON "leads" USING btree ("workspace_id","owner_id");--> statement-breakpoint
CREATE INDEX "pipeline_stages_workspace_idx" ON "pipeline_stages" USING btree ("workspace_id","position");