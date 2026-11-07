CREATE TYPE "public"."knowledge_kind" AS ENUM('process', 'prompt', 'tool', 'website', 'component', 'template', 'checklist', 'board', 'learning');--> statement-breakpoint
CREATE TYPE "public"."knowledge_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."knowledge_visibility" AS ENUM('private', 'team', 'clients');--> statement-breakpoint
CREATE TABLE "knowledge_folders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"parent_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"is_example" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_item_clients" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"client_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"folder_id" uuid,
	"kind" "knowledge_kind" NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"body" text DEFAULT '' NOT NULL,
	"url" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"visibility" "knowledge_visibility" DEFAULT 'team' NOT NULL,
	"roles" text[] DEFAULT '{}'::text[] NOT NULL,
	"all_clients" boolean DEFAULT false NOT NULL,
	"status" "knowledge_status" DEFAULT 'published' NOT NULL,
	"is_example" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "knowledge_folders" ADD CONSTRAINT "knowledge_folders_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_folders" ADD CONSTRAINT "knowledge_folders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_item_clients" ADD CONSTRAINT "knowledge_item_clients_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_item_clients" ADD CONSTRAINT "knowledge_item_clients_item_id_knowledge_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."knowledge_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_item_clients" ADD CONSTRAINT "knowledge_item_clients_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_items" ADD CONSTRAINT "knowledge_items_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_items" ADD CONSTRAINT "knowledge_items_folder_id_knowledge_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."knowledge_folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_items" ADD CONSTRAINT "knowledge_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_items" ADD CONSTRAINT "knowledge_items_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "knowledge_folders_parent_idx" ON "knowledge_folders" USING btree ("workspace_id","parent_id");--> statement-breakpoint
CREATE INDEX "knowledge_item_clients_item_idx" ON "knowledge_item_clients" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "knowledge_items_folder_idx" ON "knowledge_items" USING btree ("workspace_id","folder_id");--> statement-breakpoint
CREATE INDEX "knowledge_items_updated_idx" ON "knowledge_items" USING btree ("workspace_id","updated_at");