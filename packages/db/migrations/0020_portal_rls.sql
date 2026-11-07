-- The client portal on the database: project messages, and what a portal contact may read about
-- their clients, invoices and the agency. Everything here runs as the signed-in contact.

-- ---- Messages: the portal thread per project ----
ALTER TABLE messages ADD CONSTRAINT messages_body_length
  CHECK (char_length(btrim(body)) BETWEEN 1 AND 4000);--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.project_client(p_project uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT client_id FROM projects WHERE id = p_project AND deleted_at IS NULL;
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.project_workspace(p_project uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT workspace_id FROM projects WHERE id = p_project AND deleted_at IS NULL;
$$;--> statement-breakpoint

-- Members who can read the project, and the client's portal contacts, read its messages.
CREATE OR REPLACE FUNCTION public.can_read_messages(p_workspace uuid, p_project uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT project_workspace(p_project) = p_workspace
    AND (can_project(p_workspace, p_project, 'projects.read')
      OR is_client_contact_for(project_client(p_project)));
$$;--> statement-breakpoint

-- The contact is the signed-in user's own, with portal access, for this project's client.
CREATE OR REPLACE FUNCTION public.is_my_contact_on(p_contact uuid, p_project uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM client_contacts c
    WHERE c.id = p_contact AND c.user_id = auth.uid()
      AND c.portal_invited_at IS NOT NULL AND c.portal_revoked_at IS NULL
      AND c.client_id = project_client(p_project)
  );
$$;--> statement-breakpoint

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE messages FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- Append-only: no update or delete for anyone but the service role.
GRANT SELECT, INSERT ON messages TO authenticated;--> statement-breakpoint
GRANT ALL ON messages TO service_role;--> statement-breakpoint

CREATE POLICY messages_select ON messages FOR SELECT TO authenticated
  USING (can_read_messages(workspace_id, project_id));--> statement-breakpoint
CREATE POLICY messages_insert_member ON messages FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND author_contact_id IS NULL
    AND project_workspace(project_id) = workspace_id
    AND can_project(workspace_id, project_id, 'projects.read'));--> statement-breakpoint
CREATE POLICY messages_insert_contact ON messages FOR INSERT TO authenticated
  WITH CHECK (author_id IS NULL AND project_workspace(project_id) = workspace_id
    AND is_my_contact_on(author_contact_id, project_id));--> statement-breakpoint

-- A project's thread with who wrote each message (members' names are in profiles, which the
-- client can't read), for either side.
CREATE OR REPLACE FUNCTION public.project_messages(p_project uuid)
RETURNS TABLE (id uuid, body text, created_at timestamptz, from_client boolean, author_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id, m.body, m.created_at, m.author_contact_id IS NOT NULL,
    coalesce(c.name, pr.full_name, 'A former member')
  FROM messages m
  LEFT JOIN client_contacts c ON c.id = m.author_contact_id
  LEFT JOIN profiles pr ON pr.id = m.author_id
  WHERE m.project_id = p_project AND can_read_messages(m.workspace_id, p_project)
  ORDER BY m.created_at, m.id;
$$;--> statement-breakpoint

-- ---- What a portal contact sees of their clients ----
-- Now with the workspace's address (slug) and the client's billing details for invoices.
DROP FUNCTION IF EXISTS public.portal_clients();--> statement-breakpoint
CREATE FUNCTION public.portal_clients()
RETURNS TABLE (client_id uuid, client_name text, workspace_id uuid, workspace_name text,
  workspace_slug text, logo_path text, brand_color text, plan plan, contact_id uuid,
  contact_name text, contact_email text, contact_phone text, client_gstin text,
  client_state_code text, client_country text, client_city text, client_currency text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cl.id, cl.name, w.id, w.name, w.slug, w.logo_path, w.brand_color, w.plan, c.id, c.name,
    c.email, c.phone, cl.gstin, cl.state_code, cl.country, cl.billing_address->>'city',
    cl.currency
  FROM client_contacts c
  JOIN clients cl ON cl.id = c.client_id AND cl.deleted_at IS NULL
  JOIN workspaces w ON w.id = cl.workspace_id AND w.deleted_at IS NULL
  WHERE c.user_id = auth.uid() AND c.portal_invited_at IS NOT NULL AND c.portal_revoked_at IS NULL
  ORDER BY w.name, cl.name;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION portal_clients() FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION portal_clients() TO authenticated, service_role;--> statement-breakpoint

-- The agency's details that appear on its invoices, for its clients' portal contacts only.
CREATE OR REPLACE FUNCTION public.portal_workspace(p_workspace uuid)
RETURNS TABLE (id uuid, slug text, name text, plan plan, country text, base_currency text,
  time_zone text, gstin text, state_code text, lut_arn text, invoice_prefix text,
  payment_terms_days integer, address jsonb, bank jsonb, invoice_footer text,
  brand_color text, logo_path text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT w.id, w.slug, w.name, w.plan, w.country, w.base_currency, w.time_zone, w.gstin,
    w.state_code, w.lut_arn, w.invoice_prefix, w.payment_terms_days, w.address, w.bank,
    w.invoice_footer, w.brand_color, w.logo_path
  FROM workspaces w
  WHERE w.id = p_workspace AND w.deleted_at IS NULL AND EXISTS (
    SELECT 1 FROM client_contacts c JOIN clients cl ON cl.id = c.client_id AND cl.deleted_at IS NULL
    WHERE cl.workspace_id = p_workspace AND c.user_id = auth.uid()
      AND c.portal_invited_at IS NOT NULL AND c.portal_revoked_at IS NULL);
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION portal_workspace(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION portal_workspace(uuid) TO authenticated, service_role;--> statement-breakpoint

-- The contact keeps their own name, email and phone up to date (Account in the portal).
CREATE OR REPLACE FUNCTION public.update_my_contact(p_contact uuid, p_name text, p_email text, p_phone text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF char_length(btrim(coalesce(p_name, ''))) < 2 THEN
    RAISE EXCEPTION 'contact_name_required';
  END IF;
  UPDATE client_contacts
    SET name = btrim(p_name), email = lower(btrim(p_email)), phone = nullif(btrim(p_phone), '')
    WHERE id = p_contact AND user_id = auth.uid() AND portal_revoked_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'contact_not_found';
  END IF;
END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION update_my_contact(uuid, text, text, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION update_my_contact(uuid, text, text, text) TO authenticated;--> statement-breakpoint

-- ---- Invoices in the portal: what's needed to show them as issued ----
CREATE OR REPLACE FUNCTION public.portal_invoices() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', i.id, 'clientId', i.client_id, 'workspaceId', i.workspace_id, 'number', i.number,
    'type', i.type, 'status', i.status, 'currency', i.currency, 'exchangeRate', i.exchange_rate,
    'issueOn', i.issue_on, 'dueOn', i.due_on,
    'supplierStateCode', i.supplier_state_code, 'placeOfSupplyCode', i.place_of_supply_code,
    'exportCountry', i.export_country, 'roundOff', i.round_off,
    'subtotalMinor', i.subtotal_minor::text, 'cgstMinor', i.cgst_minor::text,
    'sgstMinor', i.sgst_minor::text, 'igstMinor', i.igst_minor::text,
    'roundOffMinor', i.round_off_minor::text, 'totalMinor', i.total_minor::text,
    'amountPaidMinor', i.amount_paid_minor::text, 'lutArn', i.lut_arn, 'hasLut', i.has_lut,
    'items', (SELECT jsonb_agg(jsonb_build_object(
        'description', it.description, 'sacCode', it.sac_code, 'quantity', it.quantity,
        'rateMinor', it.rate_minor::text, 'discountMinor', it.discount_minor::text,
        'taxRateBp', it.tax_rate_bp, 'taxableMinor', it.taxable_minor::text,
        'amountMinor', it.amount_minor::text) ORDER BY it.position)
      FROM invoice_items it WHERE it.invoice_id = i.id),
    'payments', (SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', p.id, 'amountMinor', p.amount_minor::text, 'method', p.method,
        'receivedOn', p.received_on)
        ORDER BY p.received_on), '[]'::jsonb)
      FROM payments p WHERE p.invoice_id = i.id)
  ) ORDER BY i.issue_on DESC, i.number DESC), '[]'::jsonb)
  FROM invoices i
  WHERE i.deleted_at IS NULL AND i.status NOT IN ('draft', 'cancelled')
    AND is_client_contact_for(i.client_id);
$$;--> statement-breakpoint

-- ---- Projects in the portal: now with who leads the work (the client sees their name) ----
CREATE OR REPLACE FUNCTION public.portal_projects() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'name', p.name, 'clientId', p.client_id, 'status', p.status, 'dueOn', p.due_on,
    'leadName', (SELECT pr.full_name FROM profiles pr WHERE pr.id = p.lead_member_id),
    'progress', (
      SELECT CASE WHEN count(ci.*) = 0 THEN 0 ELSE floor(count(ci.done_at) * 100.0 / count(ci.*)) END
      FROM checklist_items ci JOIN phases x ON x.id = ci.phase_id
      WHERE x.project_id = p.id AND x.status <> 'skipped'
    ),
    'phases', (
      SELECT jsonb_agg(jsonb_build_object(
        'name', ph.name, 'clientLine', ph.client_line, 'status', ph.status, 'position', ph.position,
        'deliverables', ph.deliverables,
        'gate', (SELECT jsonb_build_object('id', g.id, 'title', g.title, 'status', g.status,
          'approverType', g.approver_type, 'requestMessage', g.request_message, 'requestedAt', g.requested_at,
          'decidedAt', g.decided_at, 'comment', g.decision_comment)
          FROM gates g WHERE g.phase_id = ph.id)
      ) ORDER BY ph.position)
      FROM phases ph WHERE ph.project_id = p.id
    )
  ) ORDER BY p.created_at), '[]'::jsonb)
  FROM projects p
  WHERE p.deleted_at IS NULL AND p.status <> 'cancelled' AND is_client_contact_for(p.client_id);
$$;--> statement-breakpoint

GRANT EXECUTE ON FUNCTION project_client(uuid), project_workspace(uuid), can_read_messages(uuid, uuid),
  is_my_contact_on(uuid, uuid), project_messages(uuid) TO authenticated, service_role;
