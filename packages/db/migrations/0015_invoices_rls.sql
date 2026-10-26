-- Invoices and payments (M13): issued invoices are fixed, payments go in only through
-- record_invoice_payment(), and reminders stop when an invoice is paid.

CREATE OR REPLACE FUNCTION public.check_invoice() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM clients WHERE id = NEW.client_id AND workspace_id = NEW.workspace_id)
    OR (NEW.project_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM projects WHERE id = NEW.project_id AND workspace_id = NEW.workspace_id AND client_id = NEW.client_id))
    OR (NEW.quote_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM quotes WHERE id = NEW.quote_id AND workspace_id = NEW.workspace_id))
  THEN
    RAISE EXCEPTION 'invoice_mismatch';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER invoices_check BEFORE INSERT OR UPDATE OF client_id, project_id, quote_id, workspace_id ON invoices
  FOR EACH ROW EXECUTE FUNCTION check_invoice();--> statement-breakpoint

-- After issue only the status, payment total, cancellation, PDF and link may change, and the
-- payment total and paid statuses only through record_invoice_payment().
CREATE OR REPLACE FUNCTION public.guard_invoice() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_free text[] := ARRAY['status', 'amount_paid_minor', 'cancelled_at', 'cancel_reason', 'pdf_path',
    'public_token_hash', 'updated_at'];
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' THEN RAISE EXCEPTION 'invoice_locked'; END IF;
    RETURN OLD;
  END IF;
  IF current_setting('app.invoice_payment', true) IS DISTINCT FROM 'on' AND (
    NEW.amount_paid_minor IS DISTINCT FROM OLD.amount_paid_minor
    OR (NEW.status IN ('partially_paid', 'paid') AND NEW.status IS DISTINCT FROM OLD.status)
  ) THEN
    RAISE EXCEPTION 'invoice_payment_locked';
  END IF;
  IF OLD.status <> 'draft' AND (to_jsonb(NEW) - v_free) IS DISTINCT FROM (to_jsonb(OLD) - v_free) THEN
    RAISE EXCEPTION 'invoice_locked';
  END IF;
  IF OLD.status = 'draft' AND NEW.status = 'issued'
    AND (NEW.number IS NULL OR NEW.issue_on IS NULL OR NEW.due_on IS NULL) THEN
    RAISE EXCEPTION 'invoice_not_ready';
  END IF;
  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' AND (OLD.status = 'draft' OR OLD.amount_paid_minor > 0) THEN
    RAISE EXCEPTION 'invoice_cannot_cancel';
  END IF;
  IF OLD.status = 'cancelled' AND NEW.status <> 'cancelled' THEN
    RAISE EXCEPTION 'invoice_locked';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER invoices_guard BEFORE UPDATE OR DELETE ON invoices FOR EACH ROW EXECUTE FUNCTION guard_invoice();--> statement-breakpoint
CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER payment_links_updated_at BEFORE UPDATE ON payment_links FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.guard_invoice_item() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_status invoice_status;
BEGIN
  SELECT status INTO v_status FROM invoices
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id) AND workspace_id = COALESCE(NEW.workspace_id, OLD.workspace_id);
  IF v_status IS NULL AND TG_OP = 'DELETE' THEN
    RETURN OLD; -- the draft itself is being deleted (cascade)
  ELSIF v_status IS NULL THEN
    RAISE EXCEPTION 'invoice_not_found';
  ELSIF v_status <> 'draft' THEN
    RAISE EXCEPTION 'invoice_locked';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;--> statement-breakpoint
CREATE TRIGGER invoice_items_guard BEFORE INSERT OR UPDATE OR DELETE ON invoice_items
  FOR EACH ROW EXECUTE FUNCTION guard_invoice_item();--> statement-breakpoint

-- Records a payment against an issued invoice. Members need invoices.write; the payment
-- webhook calls it as the service role with the provider's payment id (a repeat is ignored).
-- The amount rules and messages live in packages/core; these checks are the safety net.
CREATE OR REPLACE FUNCTION public.record_invoice_payment(p_invoice uuid, p_amount bigint, p_currency text,
  p_method payment_method, p_received_on date, p_notes text, p_fira_path text, p_provider text,
  p_provider_payment_id text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv invoices;
  v_id uuid := gen_random_uuid();
  v_paid bigint;
BEGIN
  SELECT * INTO inv FROM invoices WHERE id = p_invoice FOR UPDATE;
  IF inv.id IS NULL OR (current_setting('role', true) IS DISTINCT FROM 'service_role'
    AND NOT has_permission(inv.workspace_id, 'invoices.write')) THEN
    RAISE EXCEPTION 'invoice_not_found';
  END IF;
  IF p_provider_payment_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM payments WHERE provider = p_provider AND provider_payment_id = p_provider_payment_id) THEN
    RETURN NULL;
  END IF;
  IF inv.status NOT IN ('issued', 'partially_paid') OR inv.proforma THEN
    RAISE EXCEPTION 'invoice_not_payable';
  END IF;
  IF p_amount <= 0 OR p_amount > inv.total_minor - inv.amount_paid_minor OR upper(p_currency) <> inv.currency THEN
    RAISE EXCEPTION 'payment_invalid';
  END IF;
  INSERT INTO payments (id, workspace_id, invoice_id, amount_minor, currency, method, provider,
    provider_payment_id, received_on, fira_path, notes, recorded_by)
  VALUES (v_id, inv.workspace_id, inv.id, p_amount, inv.currency, p_method, p_provider,
    p_provider_payment_id, p_received_on, p_fira_path, nullif(trim(p_notes), ''), auth.uid());
  v_paid := inv.amount_paid_minor + p_amount;
  PERFORM set_config('app.invoice_payment', 'on', true);
  UPDATE invoices SET amount_paid_minor = v_paid,
    status = CASE WHEN v_paid = inv.total_minor THEN 'paid'::invoice_status ELSE 'partially_paid' END
    WHERE id = inv.id;
  PERFORM set_config('app.invoice_payment', 'off', true);
  IF v_paid = inv.total_minor THEN
    UPDATE reminders SET cancelled_at = now() WHERE invoice_id = inv.id AND sent_at IS NULL AND cancelled_at IS NULL;
  END IF;
  INSERT INTO activities (id, workspace_id, subject_type, subject_id, kind, actor_id, meta, is_example)
    VALUES (gen_random_uuid(), inv.workspace_id, 'invoice', inv.id, 'payment_received', auth.uid(),
      jsonb_build_object('paymentId', v_id, 'amountMinor', p_amount::text, 'method', p_method), inv.is_example);
  INSERT INTO audit_log (id, workspace_id, actor_id, action, subject_type, subject_id, changes)
    VALUES (gen_random_uuid(), inv.workspace_id, auth.uid(), 'payment.recorded', 'invoice', inv.id,
      jsonb_build_object('amountMinor', p_amount::text, 'method', p_method, 'provider', p_provider));
  RETURN v_id;
END;
$$;--> statement-breakpoint

-- invoices.read: "all", or "own" (project leads) for invoices of their projects.
CREATE OR REPLACE FUNCTION public.can_read_invoice(p_workspace uuid, p_project uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE permission_scope(p_workspace, 'invoices.read')
    WHEN 'all' THEN true
    WHEN 'own' THEN p_project IS NOT NULL AND owns_project(p_project)
    ELSE false
  END;
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.can_read_invoice_id(p_invoice uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((SELECT can_read_invoice(workspace_id, project_id) FROM invoices WHERE id = p_invoice), false);
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.invoice_link_workspace(p_token_hash text) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT workspace_id FROM invoices WHERE public_token_hash = p_token_hash AND status <> 'draft' AND deleted_at IS NULL;
$$;--> statement-breakpoint

-- The portal's invoice list: issued invoices of the contact's clients, with what's due.
CREATE OR REPLACE FUNCTION public.portal_invoices() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', i.id, 'clientId', i.client_id, 'number', i.number, 'type', i.type, 'status', i.status,
    'issueOn', i.issue_on, 'dueOn', i.due_on, 'currency', i.currency,
    'totalMinor', i.total_minor::text, 'paidMinor', i.amount_paid_minor::text,
    'dueMinor', (i.total_minor - i.amount_paid_minor)::text,
    'overdue', i.status IN ('issued', 'partially_paid') AND i.due_on < (now() AT TIME ZONE w.time_zone)::date,
    'payUrl', (SELECT l.short_url FROM payment_links l WHERE l.invoice_id = i.id AND l.status NOT IN ('cancelled', 'expired') ORDER BY l.created_at DESC LIMIT 1),
    'pdfPath', i.pdf_path
  ) ORDER BY i.issue_on DESC, i.number DESC), '[]'::jsonb)
  FROM invoices i JOIN workspaces w ON w.id = i.workspace_id
  WHERE i.status <> 'draft' AND i.deleted_at IS NULL AND is_client_contact_for(i.client_id);
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.activity_visible(p_workspace uuid, p_type text, p_id uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT CASE p_type
    WHEN 'lead' THEN EXISTS (SELECT 1 FROM leads WHERE id = p_id AND workspace_id = p_workspace)
    WHEN 'client' THEN EXISTS (SELECT 1 FROM clients WHERE id = p_id AND workspace_id = p_workspace)
    WHEN 'quote' THEN EXISTS (SELECT 1 FROM quotes WHERE id = p_id AND workspace_id = p_workspace)
    WHEN 'proposal' THEN EXISTS (SELECT 1 FROM proposals WHERE id = p_id AND workspace_id = p_workspace)
    WHEN 'project' THEN EXISTS (SELECT 1 FROM projects WHERE id = p_id AND workspace_id = p_workspace)
    WHEN 'task' THEN EXISTS (SELECT 1 FROM tasks WHERE id = p_id AND workspace_id = p_workspace)
    WHEN 'invoice' THEN EXISTS (SELECT 1 FROM invoices WHERE id = p_id AND workspace_id = p_workspace)
    ELSE false
  END;
$$;--> statement-breakpoint

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE invoices FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE invoice_items FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE payments FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE payment_links FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE reminders FORCE ROW LEVEL SECURITY;--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON invoices, invoice_items, reminders TO authenticated;--> statement-breakpoint
GRANT SELECT ON payments, payment_links TO authenticated;--> statement-breakpoint
GRANT ALL ON invoices, invoice_items, payment_links, reminders TO service_role;--> statement-breakpoint
GRANT SELECT, INSERT ON payments TO service_role;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION record_invoice_payment(uuid, bigint, text, payment_method, date, text, text, text, text),
  portal_invoices() TO authenticated, service_role;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION invoice_link_workspace(text) TO anon, authenticated, service_role;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION can_read_invoice(uuid, uuid), can_read_invoice_id(uuid) TO authenticated, service_role;--> statement-breakpoint

CREATE POLICY invoices_select ON invoices FOR SELECT TO authenticated
  USING (can_read_invoice(workspace_id, project_id));--> statement-breakpoint
CREATE POLICY invoices_insert ON invoices FOR INSERT TO authenticated
  WITH CHECK (has_permission(workspace_id, 'invoices.write'));--> statement-breakpoint
CREATE POLICY invoices_update ON invoices FOR UPDATE TO authenticated
  USING (has_permission(workspace_id, 'invoices.write'))
  WITH CHECK (has_permission(workspace_id, 'invoices.write'));--> statement-breakpoint
CREATE POLICY invoices_delete ON invoices FOR DELETE TO authenticated
  USING (has_permission(workspace_id, 'invoices.delete'));--> statement-breakpoint
CREATE POLICY invoice_items_select ON invoice_items FOR SELECT TO authenticated
  USING (can_read_invoice_id(invoice_id));--> statement-breakpoint
CREATE POLICY invoice_items_write ON invoice_items FOR ALL TO authenticated
  USING (has_permission(workspace_id, 'invoices.write'))
  WITH CHECK (has_permission(workspace_id, 'invoices.write'));--> statement-breakpoint
CREATE POLICY payments_select ON payments FOR SELECT TO authenticated
  USING (can_read_invoice_id(invoice_id));--> statement-breakpoint
CREATE POLICY payment_links_select ON payment_links FOR SELECT TO authenticated
  USING (can_read_invoice_id(invoice_id));--> statement-breakpoint
CREATE POLICY reminders_select ON reminders FOR SELECT TO authenticated
  USING (can_read_invoice_id(invoice_id));--> statement-breakpoint
CREATE POLICY reminders_write ON reminders FOR ALL TO authenticated
  USING (has_permission(workspace_id, 'invoices.write'))
  WITH CHECK (has_permission(workspace_id, 'invoices.write'));
