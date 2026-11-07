-- Members' sign-in emails for the members list. auth.users isn't readable by members, so this
-- returns only the emails of one workspace's members, and only to someone allowed to see members.
CREATE OR REPLACE FUNCTION public.workspace_member_emails(p_workspace uuid)
RETURNS TABLE (user_id uuid, email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.user_id, u.email::text
  FROM memberships m JOIN auth.users u ON u.id = m.user_id
  WHERE m.workspace_id = p_workspace AND has_permission(p_workspace, 'members.read');
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION workspace_member_emails(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION workspace_member_emails(uuid) TO authenticated, service_role;
