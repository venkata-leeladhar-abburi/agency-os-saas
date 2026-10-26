-- Clients and contacts (M9): RLS, portal access, and the lead link.

-- leads.converted_client_id points at the client a lead became (kept in SQL to avoid a
-- circular schema import).
ALTER TABLE leads ADD CONSTRAINT leads_converted_client_id_fk FOREIGN KEY (converted_client_id)
  REFERENCES clients(id) ON DELETE SET NULL;--> statement-breakpoint

-- One primary contact per client.
CREATE UNIQUE INDEX client_contacts_one_primary ON client_contacts (client_id) WHERE is_primary;--> statement-breakpoint

CREATE TRIGGER clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER client_contacts_updated_at BEFORE UPDATE ON client_contacts FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint

-- A contact's workspace is its client's, and only claim_portal_access() links a portal login.
-- Changing a contact's email unlinks the login, so a new person has to sign in themselves.
CREATE OR REPLACE FUNCTION public.guard_client_contact() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM clients WHERE id = NEW.client_id AND workspace_id = NEW.workspace_id) THEN
    RAISE EXCEPTION 'client_not_found';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.email IS DISTINCT FROM OLD.email THEN
    NEW.user_id := NULL;
  ELSIF current_setting('app.claiming_portal', true) IS DISTINCT FROM 'on'
    AND NEW.user_id IS NOT NULL
    AND (TG_OP = 'INSERT' OR NEW.user_id IS DISTINCT FROM OLD.user_id) THEN
    RAISE EXCEPTION 'portal_user_locked';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER client_contacts_guard BEFORE INSERT OR UPDATE ON client_contacts
  FOR EACH ROW EXECUTE FUNCTION guard_client_contact();--> statement-breakpoint

-- Project leads and members see clients of projects they are on. Projects arrive in M11,
-- which replaces this function; until then "own" matches nothing.
CREATE OR REPLACE FUNCTION public.owns_client(p_client uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT false;
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.can_read_client(p_workspace uuid, p_client uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE permission_scope(p_workspace, 'clients.read')
    WHEN 'all' THEN true
    WHEN 'own' THEN owns_client(p_client)
    ELSE false
  END;
$$;--> statement-breakpoint

-- The signed-in user is a portal contact of this client (and their access is not revoked).
CREATE OR REPLACE FUNCTION public.is_client_contact_for(p_client uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM client_contacts c
    JOIN clients cl ON cl.id = c.client_id AND cl.deleted_at IS NULL
    WHERE c.client_id = p_client AND c.user_id = auth.uid()
      AND c.portal_invited_at IS NOT NULL AND c.portal_revoked_at IS NULL
  );
$$;--> statement-breakpoint

-- After a portal contact signs in with the invited email (magic link), link their login to
-- every contact invited with that email. Returns how many were linked.
CREATE OR REPLACE FUNCTION public.claim_portal_access() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email text;
  v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_signed_in';
  END IF;
  SELECT lower(email) INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL THEN
    RETURN 0;
  END IF;
  PERFORM set_config('app.claiming_portal', 'on', true);
  UPDATE client_contacts SET user_id = auth.uid()
    WHERE lower(email) = v_email AND user_id IS NULL
      AND portal_invited_at IS NOT NULL AND portal_revoked_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  PERFORM set_config('app.claiming_portal', 'off', true);
  RETURN v_count;
END;
$$;--> statement-breakpoint

-- What a portal contact may see of their clients: no internal notes, no other contacts.
CREATE OR REPLACE FUNCTION public.portal_clients()
RETURNS TABLE (client_id uuid, client_name text, workspace_id uuid, workspace_name text,
  logo_path text, brand_color text, plan plan, contact_id uuid, contact_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cl.id, cl.name, w.id, w.name, w.logo_path, w.brand_color, w.plan, c.id, c.name
  FROM client_contacts c
  JOIN clients cl ON cl.id = c.client_id AND cl.deleted_at IS NULL
  JOIN workspaces w ON w.id = cl.workspace_id AND w.deleted_at IS NULL
  WHERE c.user_id = auth.uid() AND c.portal_invited_at IS NOT NULL AND c.portal_revoked_at IS NULL
  ORDER BY w.name, cl.name;
$$;--> statement-breakpoint

-- Timelines can now be about clients too.
CREATE OR REPLACE FUNCTION public.activity_visible(p_workspace uuid, p_type text, p_id uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT CASE p_type
    WHEN 'lead' THEN EXISTS (SELECT 1 FROM leads WHERE id = p_id AND workspace_id = p_workspace)
    WHEN 'client' THEN EXISTS (SELECT 1 FROM clients WHERE id = p_id AND workspace_id = p_workspace)
    ELSE false
  END;
$$;--> statement-breakpoint

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE clients FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE client_contacts FORCE ROW LEVEL SECURITY;--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON clients, client_contacts TO authenticated;--> statement-breakpoint
GRANT ALL ON clients, client_contacts TO service_role;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION owns_client(uuid), can_read_client(uuid, uuid), is_client_contact_for(uuid),
  claim_portal_access(), portal_clients() TO authenticated, service_role;--> statement-breakpoint

CREATE POLICY clients_select ON clients FOR SELECT TO authenticated
  USING (can_read_client(workspace_id, id));--> statement-breakpoint
CREATE POLICY clients_insert ON clients FOR INSERT TO authenticated
  WITH CHECK (has_permission(workspace_id, 'clients.write'));--> statement-breakpoint
CREATE POLICY clients_update ON clients FOR UPDATE TO authenticated
  USING (has_permission(workspace_id, 'clients.write'))
  WITH CHECK (has_permission(workspace_id, 'clients.write'));--> statement-breakpoint
CREATE POLICY clients_delete ON clients FOR DELETE TO authenticated
  USING (has_permission(workspace_id, 'clients.delete'));--> statement-breakpoint

CREATE POLICY client_contacts_select ON client_contacts FOR SELECT TO authenticated
  USING (can_read_client(workspace_id, client_id));--> statement-breakpoint
CREATE POLICY client_contacts_write ON client_contacts FOR ALL TO authenticated
  USING (has_permission(workspace_id, 'clients.write'))
  WITH CHECK (has_permission(workspace_id, 'clients.write'));
