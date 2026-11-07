-- Invoices and payments (M13): what can't change once issued, payments that keep the paid
-- amount right, row-level security, the pay link lookup and the client portal's invoices.

-- Who can read an invoice: "all" scope, or "own" (project leads) for invoices on their projects.
CREATE OR REPLACE FUNCTION public.can_invoice(p_workspace uuid, p_project uuid, p_perm text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE permission_scope(p_workspace, p_perm)
    WHEN 'all' THEN true
    WHEN 'own' THEN p_project IS NOT NULL AND owns_project(p_project)
    ELSE false
  END;
$$;--> statement-breakpoint

-- An invoice's items are in its workspace and change only while it is a draft.
CREATE OR REPLACE FUNCTION public.guard_invoice_item() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_status invoice_status;
BEGIN
  SELECT status INTO v_status FROM invoices
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id)
      AND workspace_id = COALESCE(NEW.workspace_id, OLD.workspace_id);
  IF v_status IS NULL THEN
    -- Deleting a draft removes its items too (cascade): the invoice is already gone.
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RAISE EXCEPTION 'invoice_not_found';
  ELSIF v_status <> 'draft' THEN
    RAISE EXCEPTION 'invoice_locked';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;--> statement-breakpoint
CREATE TRIGGER invoice_items_guard BEFORE INSERT OR UPDATE OR DELETE ON invoice_items
  FOR EACH ROW EXECUTE FUNCTION guard_invoice_item();--> statement-breakpoint

-- An issued invoice is never edited or deleted (data-model.md): only its status, paid amount,
-- reminders switch, pay link and PDF move. Cancelling is the way back.
CREATE OR REPLACE FUNCTION public.guard_invoice() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' THEN RAISE EXCEPTION 'invoice_locked'; END IF;
    RETURN OLD;
  END IF;
  IF OLD.status <> 'draft' AND (
    NEW.client_id, NEW.number, NEW.financial_year, NEW.type, NEW.currency, NEW.exchange_rate,
    NEW.supplier_state_code, NEW.place_of_supply_code, NEW.export_country, NEW.has_lut, NEW.lut_arn,
    NEW.issue_on, NEW.due_on, NEW.subtotal_minor, NEW.cgst_minor, NEW.sgst_minor, NEW.igst_minor,
    NEW.round_off_minor, NEW.total_minor, NEW.workspace_id
  ) IS DISTINCT FROM (
    OLD.client_id, OLD.number, OLD.financial_year, OLD.type, OLD.currency, OLD.exchange_rate,
    OLD.supplier_state_code, OLD.place_of_supply_code, OLD.export_country, OLD.has_lut, OLD.lut_arn,
    OLD.issue_on, OLD.due_on, OLD.subtotal_minor, OLD.cgst_minor, OLD.sgst_minor, OLD.igst_minor,
    OLD.round_off_minor, OLD.total_minor, OLD.workspace_id
  ) THEN
    RAISE EXCEPTION 'invoice_locked';
  END IF;
  IF OLD.status = 'cancelled' AND NEW.status <> 'cancelled' THEN
    RAISE EXCEPTION 'invoice_locked';
  END IF;
  -- Issuing gives a number; nothing else does, and a number is never taken away.
  IF NEW.status <> 'draft' AND NEW.number IS NULL THEN
    RAISE EXCEPTION 'invoice_number_required';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER invoices_guard BEFORE UPDATE OR DELETE ON invoices
  FOR EACH ROW EXECUTE FUNCTION guard_invoice();--> statement-breakpoint
CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint

-- A payment goes on an issued invoice, in its currency, and never above what is due
-- (tax-test-cases.md H). The invoice's paid amount and status follow every payment.
CREATE OR REPLACE FUNCTION public.apply_payment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v invoices;
BEGIN
  -- A provider's payment seen before (a repeated webhook): skip it quietly. Row triggers run
  -- before ON CONFLICT is checked, so this has to be caught here.
  IF NEW.provider_payment_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM payments WHERE provider_payment_id = NEW.provider_payment_id
  ) THEN
    RETURN NULL;
  END IF;
  SELECT * INTO v FROM invoices
    WHERE id = NEW.invoice_id AND workspace_id = NEW.workspace_id FOR UPDATE;
  IF v.id IS NULL THEN
    RAISE EXCEPTION 'invoice_not_found';
  ELSIF v.status NOT IN ('issued', 'partially_paid') THEN
    RAISE EXCEPTION 'invoice_not_payable';
  ELSIF NEW.currency <> v.currency THEN
    RAISE EXCEPTION 'payment_currency';
  ELSIF NEW.amount_minor <= 0 THEN
    RAISE EXCEPTION 'payment_amount';
  ELSIF v.amount_paid_minor + NEW.amount_minor > v.total_minor THEN
    RAISE EXCEPTION 'overpayment';
  END IF;
  UPDATE invoices SET
    amount_paid_minor = v.amount_paid_minor + NEW.amount_minor,
    status = CASE WHEN v.amount_paid_minor + NEW.amount_minor = v.total_minor
      THEN 'paid'::invoice_status ELSE 'partially_paid'::invoice_status END
  WHERE id = v.id;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER payments_apply BEFORE INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION apply_payment();--> statement-breakpoint

-- Payments are a record of money received: never changed or deleted.
CREATE OR REPLACE FUNCTION public.payments_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'payment_locked';
END;
$$;--> statement-breakpoint
CREATE TRIGGER payments_append_only BEFORE UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION payments_append_only();--> statement-breakpoint

-- The workspace behind a pay link, for the public page (anon may call it). Drafts and
-- cancelled invoices have no working link.
CREATE OR REPLACE FUNCTION public.invoice_link_workspace(p_token_hash text) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT workspace_id FROM invoices
  WHERE public_token_hash = p_token_hash AND status NOT IN ('draft', 'cancelled') AND deleted_at IS NULL;
$$;--> statement-breakpoint

-- The client portal: a contact's issued invoices, with their lines and payments.
CREATE OR REPLACE FUNCTION public.portal_invoices() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', i.id, 'clientId', i.client_id, 'workspaceId', i.workspace_id, 'number', i.number,
    'type', i.type, 'status', i.status, 'currency', i.currency, 'exchangeRate', i.exchange_rate,
    'issueOn', i.issue_on, 'dueOn', i.due_on,
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
        'amountMinor', p.amount_minor::text, 'method', p.method, 'receivedOn', p.received_on)
        ORDER BY p.received_on), '[]'::jsonb)
      FROM payments p WHERE p.invoice_id = i.id)
  ) ORDER BY i.issue_on DESC, i.number DESC), '[]'::jsonb)
  FROM invoices i
  WHERE i.deleted_at IS NULL AND i.status NOT IN ('draft', 'cancelled')
    AND is_client_contact_for(i.client_id);
$$;--> statement-breakpoint

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE invoices FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE invoice_items FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE payments FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE reminders FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- Reminders are written only by the daily job (service role); payments are inserted, never
-- changed. Online payments arrive through the Razorpay webhook (service role).
GRANT SELECT, INSERT, UPDATE, DELETE ON invoices, invoice_items TO authenticated;--> statement-breakpoint
GRANT SELECT, INSERT ON payments TO authenticated;--> statement-breakpoint
GRANT SELECT ON reminders TO authenticated;--> statement-breakpoint
GRANT ALL ON invoices, invoice_items, reminders TO service_role;--> statement-breakpoint
GRANT SELECT, INSERT ON payments TO service_role;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION can_invoice(uuid, uuid, text), portal_invoices() TO authenticated, service_role;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION invoice_link_workspace(text) TO anon, authenticated, service_role;--> statement-breakpoint

CREATE POLICY invoices_select ON invoices FOR SELECT TO authenticated
  USING (can_invoice(workspace_id, project_id, 'invoices.read'));--> statement-breakpoint
CREATE POLICY invoices_insert ON invoices FOR INSERT TO authenticated
  WITH CHECK (has_permission(workspace_id, 'invoices.write'));--> statement-breakpoint
CREATE POLICY invoices_update ON invoices FOR UPDATE TO authenticated
  USING (has_permission(workspace_id, 'invoices.write'))
  WITH CHECK (has_permission(workspace_id, 'invoices.write'));--> statement-breakpoint
CREATE POLICY invoices_delete ON invoices FOR DELETE TO authenticated
  USING (has_permission(workspace_id, 'invoices.delete'));--> statement-breakpoint

CREATE POLICY invoice_items_select ON invoice_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_id
    AND can_invoice(i.workspace_id, i.project_id, 'invoices.read')));--> statement-breakpoint
CREATE POLICY invoice_items_write ON invoice_items FOR ALL TO authenticated
  USING (has_permission(workspace_id, 'invoices.write'))
  WITH CHECK (has_permission(workspace_id, 'invoices.write'));--> statement-breakpoint

CREATE POLICY payments_select ON payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_id
    AND can_invoice(i.workspace_id, i.project_id, 'invoices.read')));--> statement-breakpoint
CREATE POLICY payments_insert ON payments FOR INSERT TO authenticated
  WITH CHECK (has_permission(workspace_id, 'invoices.write'));--> statement-breakpoint

CREATE POLICY reminders_select ON reminders FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_id
    AND can_invoice(i.workspace_id, i.project_id, 'invoices.read')));
