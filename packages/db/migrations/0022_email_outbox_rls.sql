-- The email outbox is for jobs only: the service role writes and sends; members and clients
-- have no access at all (they see their notifications elsewhere).
ALTER TABLE email_outbox ADD CONSTRAINT email_outbox_status
  CHECK (status IN ('queued', 'sent', 'skipped', 'failed'));--> statement-breakpoint
ALTER TABLE email_outbox ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE email_outbox FORCE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON email_outbox FROM PUBLIC, anon, authenticated;--> statement-breakpoint
GRANT ALL ON email_outbox TO service_role;--> statement-breakpoint

-- Members' sign-in emails, for the emails they get. Service role only.
CREATE OR REPLACE FUNCTION public.user_emails(p_users uuid[])
RETURNS TABLE (user_id uuid, email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, u.email::text FROM auth.users u WHERE u.id = ANY(p_users) AND u.email IS NOT NULL;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION user_emails(uuid[]) FROM PUBLIC, anon, authenticated;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION user_emails(uuid[]) TO service_role;--> statement-breakpoint

-- Which workspaces have emails due, so the email job can work through them one at a time.
-- Ids only; service role only.
CREATE OR REPLACE FUNCTION public.workspaces_with_email_due(p_now timestamptz)
RETURNS TABLE (workspace_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT o.workspace_id FROM email_outbox o
  WHERE o.status = 'queued' AND o.next_attempt_at <= p_now;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION workspaces_with_email_due(timestamptz) FROM PUBLIC, anon, authenticated;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION workspaces_with_email_due(timestamptz) TO service_role;
--> statement-breakpoint

-- Every live workspace, for the daily jobs (reminders) to work through one at a time.
-- Ids only; service role only.
CREATE OR REPLACE FUNCTION public.active_workspace_ids()
RETURNS TABLE (workspace_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT w.id FROM workspaces w WHERE w.deleted_at IS NULL ORDER BY w.id;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION active_workspace_ids() FROM PUBLIC, anon, authenticated;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION active_workspace_ids() TO service_role;
