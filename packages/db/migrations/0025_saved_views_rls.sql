-- Saved views (D-066): each member's own named filters. Only the member reads or changes theirs,
-- and only while they're in the workspace.
ALTER TABLE saved_views ADD CONSTRAINT saved_views_area_check CHECK (area IN ('leads'));--> statement-breakpoint
ALTER TABLE saved_views ADD CONSTRAINT saved_views_name_check
  CHECK (char_length(btrim(name)) BETWEEN 1 AND 60);--> statement-breakpoint
ALTER TABLE saved_views ADD CONSTRAINT saved_views_query_check
  CHECK (char_length(query) <= 500);--> statement-breakpoint

ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE saved_views FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON saved_views TO authenticated;--> statement-breakpoint
GRANT ALL ON saved_views TO service_role;--> statement-breakpoint

CREATE POLICY saved_views_own ON saved_views FOR ALL TO authenticated
  USING (user_id = auth.uid() AND is_member(workspace_id))
  WITH CHECK (user_id = auth.uid() AND is_member(workspace_id));
