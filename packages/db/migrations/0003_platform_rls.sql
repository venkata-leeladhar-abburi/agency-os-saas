-- Row-level security for the platform tables (M6). Same pattern as 0001_rls.sql.

ALTER TABLE notification_preferences ADD CONSTRAINT notification_preferences_email_check
  CHECK (email IS NULL OR email IN ('on', 'off', 'digest'));--> statement-breakpoint

CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER notification_preferences_updated_at BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE subscriptions FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE webhook_events FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE notification_preferences FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- Subscriptions and webhook events are written only by webhooks (service role).
-- Notifications are created by jobs; members may only mark their own read or delete them.
GRANT SELECT ON subscriptions TO authenticated;--> statement-breakpoint
GRANT SELECT, DELETE ON notifications TO authenticated;--> statement-breakpoint
GRANT UPDATE (read_at) ON notifications TO authenticated;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_preferences TO authenticated;--> statement-breakpoint
GRANT ALL ON subscriptions, webhook_events, notifications, notification_preferences TO service_role;--> statement-breakpoint

CREATE POLICY subscriptions_select ON subscriptions FOR SELECT TO authenticated
  USING (has_permission(workspace_id, 'billing.manage'));--> statement-breakpoint

CREATE POLICY notifications_select ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND is_member(workspace_id));--> statement-breakpoint
CREATE POLICY notifications_update ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND is_member(workspace_id))
  WITH CHECK (user_id = auth.uid() AND is_member(workspace_id));--> statement-breakpoint
CREATE POLICY notifications_delete ON notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND is_member(workspace_id));--> statement-breakpoint

CREATE POLICY notification_preferences_own ON notification_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid() AND is_member(workspace_id))
  WITH CHECK (user_id = auth.uid() AND is_member(workspace_id));
