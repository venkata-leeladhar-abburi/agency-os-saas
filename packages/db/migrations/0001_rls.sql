-- Row-level security for accounts and workspaces. Hand-written; see docs/04-engineering/data-model.md.
-- Every table: RLS enabled and forced. Policies call is_member() and has_permission().

-- Role permissions, seeded from packages/core/src/permissions.ts (a test checks they match).
INSERT INTO role_permissions (role, permission, scope) VALUES
  ('owner', 'workspace.manage', 'all'),
  ('owner', 'billing.manage', 'all'),
  ('owner', 'members.read', 'all'),
  ('owner', 'members.write', 'all'),
  ('owner', 'leads.read', 'all'),
  ('owner', 'leads.write', 'all'),
  ('owner', 'leads.delete', 'all'),
  ('owner', 'sales_docs.read', 'all'),
  ('owner', 'sales_docs.write', 'all'),
  ('owner', 'clients.read', 'all'),
  ('owner', 'clients.write', 'all'),
  ('owner', 'clients.delete', 'all'),
  ('owner', 'projects.read', 'all'),
  ('owner', 'projects.write', 'all'),
  ('owner', 'projects.delete', 'all'),
  ('owner', 'gates.request', 'all'),
  ('owner', 'gates.approve', 'all'),
  ('owner', 'tasks.read', 'all'),
  ('owner', 'tasks.write', 'all'),
  ('owner', 'tasks.delete', 'all'),
  ('owner', 'invoices.read', 'all'),
  ('owner', 'invoices.write', 'all'),
  ('owner', 'invoices.delete', 'all'),
  ('owner', 'files.read', 'all'),
  ('owner', 'files.write', 'all'),
  ('owner', 'messages.read', 'all'),
  ('owner', 'messages.write', 'all'),
  ('owner', 'dashboard.money', 'all'),
  ('owner', 'audit.read', 'all'),
  ('owner', 'data.export', 'all'),
  ('admin', 'workspace.manage', 'all'),
  ('admin', 'members.read', 'all'),
  ('admin', 'members.write', 'all'),
  ('admin', 'leads.read', 'all'),
  ('admin', 'leads.write', 'all'),
  ('admin', 'leads.delete', 'all'),
  ('admin', 'sales_docs.read', 'all'),
  ('admin', 'sales_docs.write', 'all'),
  ('admin', 'clients.read', 'all'),
  ('admin', 'clients.write', 'all'),
  ('admin', 'clients.delete', 'all'),
  ('admin', 'projects.read', 'all'),
  ('admin', 'projects.write', 'all'),
  ('admin', 'projects.delete', 'all'),
  ('admin', 'gates.request', 'all'),
  ('admin', 'gates.approve', 'all'),
  ('admin', 'tasks.read', 'all'),
  ('admin', 'tasks.write', 'all'),
  ('admin', 'tasks.delete', 'all'),
  ('admin', 'invoices.read', 'all'),
  ('admin', 'invoices.write', 'all'),
  ('admin', 'files.read', 'all'),
  ('admin', 'files.write', 'all'),
  ('admin', 'messages.read', 'all'),
  ('admin', 'messages.write', 'all'),
  ('admin', 'dashboard.money', 'all'),
  ('admin', 'audit.read', 'all'),
  ('admin', 'data.export', 'all'),
  ('project_lead', 'members.read', 'all'),
  ('project_lead', 'leads.read', 'all'),
  ('project_lead', 'sales_docs.read', 'all'),
  ('project_lead', 'tasks.read', 'all'),
  ('project_lead', 'clients.read', 'own'),
  ('project_lead', 'projects.read', 'own'),
  ('project_lead', 'projects.write', 'own'),
  ('project_lead', 'gates.request', 'own'),
  ('project_lead', 'tasks.write', 'own'),
  ('project_lead', 'tasks.delete', 'own'),
  ('project_lead', 'invoices.read', 'own'),
  ('project_lead', 'files.read', 'own'),
  ('project_lead', 'files.write', 'own'),
  ('project_lead', 'messages.read', 'own'),
  ('project_lead', 'messages.write', 'own'),
  ('member', 'members.read', 'all'),
  ('member', 'clients.read', 'own'),
  ('member', 'projects.read', 'own'),
  ('member', 'tasks.read', 'own'),
  ('member', 'tasks.write', 'own'),
  ('member', 'files.read', 'own'),
  ('member', 'files.write', 'own'),
  ('member', 'messages.read', 'own'),
  ('member', 'messages.write', 'own'),
  ('finance', 'members.read', 'all'),
  ('finance', 'leads.read', 'all'),
  ('finance', 'sales_docs.read', 'all'),
  ('finance', 'clients.read', 'all'),
  ('finance', 'projects.read', 'all'),
  ('finance', 'invoices.read', 'all'),
  ('finance', 'invoices.write', 'all'),
  ('finance', 'invoices.delete', 'all'),
  ('finance', 'files.read', 'all'),
  ('finance', 'dashboard.money', 'all'),
  ('hr', 'members.read', 'all');
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER workspaces_updated_at BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER memberships_updated_at BEFORE UPDATE ON memberships FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER invitations_updated_at BEFORE UPDATE ON invitations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint

-- The signed-in user is an active member of the workspace.
CREATE OR REPLACE FUNCTION public.is_member(ws uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.workspace_id = ws AND m.user_id = auth.uid() AND m.status = 'active'
  );
$$;
--> statement-breakpoint

-- The signed-in user's role grants the permission (any scope; tables narrow "own" themselves).
CREATE OR REPLACE FUNCTION public.has_permission(ws uuid, perm text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships m
    JOIN role_permissions rp ON rp.role = m.role
    WHERE m.workspace_id = ws AND m.user_id = auth.uid() AND m.status = 'active' AND rp.permission = perm
  );
$$;
--> statement-breakpoint

-- 'all', 'own' or NULL: the scope the signed-in user has for a permission.
CREATE OR REPLACE FUNCTION public.permission_scope(ws uuid, perm text) RETURNS permission_scope
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT rp.scope FROM memberships m
  JOIN role_permissions rp ON rp.role = m.role
  WHERE m.workspace_id = ws AND m.user_id = auth.uid() AND m.status = 'active' AND rp.permission = perm
  LIMIT 1;
$$;
--> statement-breakpoint

-- People who share a workspace with the signed-in user (for showing names and avatars).
CREATE OR REPLACE FUNCTION public.shares_workspace_with(other uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships a JOIN memberships b ON a.workspace_id = b.workspace_id
    WHERE a.user_id = auth.uid() AND a.status = 'active' AND b.user_id = other
  );
$$;
--> statement-breakpoint

-- Creates a workspace and makes the caller its owner, in one step.
CREATE OR REPLACE FUNCTION public.create_workspace(
  p_id uuid, p_name text, p_slug text, p_country text, p_currency text,
  p_locale text, p_time_zone text, p_invoice_prefix text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_signed_in' USING ERRCODE = '28000'; END IF;
  IF length(trim(p_name)) = 0 THEN RAISE EXCEPTION 'name_required' USING ERRCODE = '22023'; END IF;
  INSERT INTO workspaces (id, name, slug, country, base_currency, locale, time_zone, invoice_prefix, created_by)
  VALUES (p_id, trim(p_name), p_slug, upper(p_country), upper(p_currency), p_locale, p_time_zone, p_invoice_prefix, uid);
  INSERT INTO memberships (id, workspace_id, user_id, role) VALUES (gen_random_uuid(), p_id, uid, 'owner');
  INSERT INTO audit_log (id, workspace_id, actor_id, action, subject_type, subject_id)
  VALUES (gen_random_uuid(), p_id, uid, 'workspace.created', 'workspace', p_id);
  RETURN p_id;
END;
$$;
--> statement-breakpoint

-- Accepts an invitation by the hash of its token. Errors: invite_not_found, invite_expired,
-- invite_revoked, invite_used, invite_wrong_email, already_member.
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token_hash text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  inv invitations%ROWTYPE;
  user_email text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_signed_in' USING ERRCODE = '28000'; END IF;
  SELECT * INTO inv FROM invitations WHERE token_hash = p_token_hash FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invite_not_found' USING ERRCODE = 'P0002'; END IF;
  IF inv.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'invite_revoked' USING ERRCODE = 'P0001'; END IF;
  IF inv.accepted_at IS NOT NULL THEN RAISE EXCEPTION 'invite_used' USING ERRCODE = 'P0001'; END IF;
  IF inv.expires_at <= now() THEN RAISE EXCEPTION 'invite_expired' USING ERRCODE = 'P0001'; END IF;
  IF inv.email IS NOT NULL THEN
    SELECT email INTO user_email FROM auth.users WHERE id = uid;
    IF lower(coalesce(user_email, '')) <> lower(inv.email) THEN
      RAISE EXCEPTION 'invite_wrong_email' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM memberships WHERE workspace_id = inv.workspace_id AND user_id = uid) THEN
    RAISE EXCEPTION 'already_member' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO memberships (id, workspace_id, user_id, role) VALUES (gen_random_uuid(), inv.workspace_id, uid, inv.role);
  UPDATE invitations SET accepted_at = now(), accepted_by = uid WHERE id = inv.id;
  INSERT INTO audit_log (id, workspace_id, actor_id, action, subject_type, subject_id, changes)
  VALUES (gen_random_uuid(), inv.workspace_id, uid, 'invitation.accepted', 'invitation', inv.id, jsonb_build_object('role', inv.role));
  RETURN inv.workspace_id;
END;
$$;
--> statement-breakpoint

-- A workspace always keeps at least one active owner.
CREATE OR REPLACE FUNCTION public.keep_an_owner() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ws uuid := OLD.workspace_id;
BEGIN
  IF OLD.role = 'owner' AND OLD.status = 'active'
     AND (TG_OP = 'DELETE' OR NEW.role <> 'owner' OR NEW.status <> 'active')
     AND NOT EXISTS (
       SELECT 1 FROM memberships
       WHERE workspace_id = ws AND role = 'owner' AND status = 'active' AND id <> OLD.id
     )
     AND EXISTS (SELECT 1 FROM workspaces WHERE id = ws) THEN
    RAISE EXCEPTION 'last_owner' USING ERRCODE = 'P0001';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
--> statement-breakpoint
CREATE TRIGGER memberships_keep_an_owner BEFORE UPDATE OR DELETE ON memberships FOR EACH ROW EXECUTE FUNCTION keep_an_owner();
--> statement-breakpoint

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE workspaces FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE memberships FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE invitations FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;--> statement-breakpoint

GRANT USAGE ON SCHEMA public TO authenticated;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles, workspaces, memberships, invitations TO authenticated;--> statement-breakpoint
GRANT SELECT ON role_permissions TO authenticated;--> statement-breakpoint
GRANT SELECT, INSERT ON audit_log TO authenticated;--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO service_role;--> statement-breakpoint
GRANT ALL ON profiles, workspaces, memberships, role_permissions, invitations, audit_log TO service_role;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION is_member(uuid), has_permission(uuid, text), permission_scope(uuid, text),
  shares_workspace_with(uuid), create_workspace(uuid, text, text, text, text, text, text, text),
  accept_invitation(text) TO authenticated;--> statement-breakpoint

-- profiles: your own, and people you share a workspace with.
CREATE POLICY profiles_select ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR shares_workspace_with(id));--> statement-breakpoint
CREATE POLICY profiles_insert ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());--> statement-breakpoint
CREATE POLICY profiles_update ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());--> statement-breakpoint

-- workspaces: members read; workspace.manage edits; creating goes through create_workspace().
CREATE POLICY workspaces_select ON workspaces FOR SELECT TO authenticated USING (is_member(id));--> statement-breakpoint
CREATE POLICY workspaces_update ON workspaces FOR UPDATE TO authenticated
  USING (has_permission(id, 'workspace.manage')) WITH CHECK (has_permission(id, 'workspace.manage'));--> statement-breakpoint

-- memberships: members see their workspace's members; members.write changes them.
CREATE POLICY memberships_select ON memberships FOR SELECT TO authenticated
  USING (is_member(workspace_id) OR user_id = auth.uid());--> statement-breakpoint
CREATE POLICY memberships_insert ON memberships FOR INSERT TO authenticated
  WITH CHECK (has_permission(workspace_id, 'members.write'));--> statement-breakpoint
CREATE POLICY memberships_update ON memberships FOR UPDATE TO authenticated
  USING (has_permission(workspace_id, 'members.write')) WITH CHECK (has_permission(workspace_id, 'members.write'));--> statement-breakpoint
CREATE POLICY memberships_delete ON memberships FOR DELETE TO authenticated
  USING (has_permission(workspace_id, 'members.write') OR user_id = auth.uid());--> statement-breakpoint

-- role_permissions: read-only reference.
CREATE POLICY role_permissions_select ON role_permissions FOR SELECT TO authenticated USING (true);--> statement-breakpoint

-- invitations: only people who manage members; accepting goes through accept_invitation().
CREATE POLICY invitations_select ON invitations FOR SELECT TO authenticated
  USING (has_permission(workspace_id, 'members.write'));--> statement-breakpoint
CREATE POLICY invitations_insert ON invitations FOR INSERT TO authenticated
  WITH CHECK (has_permission(workspace_id, 'members.write') AND invited_by = auth.uid());--> statement-breakpoint
CREATE POLICY invitations_update ON invitations FOR UPDATE TO authenticated
  USING (has_permission(workspace_id, 'members.write')) WITH CHECK (has_permission(workspace_id, 'members.write'));--> statement-breakpoint

-- audit_log: append-only. Members add entries as themselves; audit.read reads. No update or delete.
CREATE POLICY audit_log_insert ON audit_log FOR INSERT TO authenticated
  WITH CHECK (is_member(workspace_id) AND actor_id = auth.uid());--> statement-breakpoint
CREATE POLICY audit_log_select ON audit_log FOR SELECT TO authenticated
  USING (has_permission(workspace_id, 'audit.read'));
