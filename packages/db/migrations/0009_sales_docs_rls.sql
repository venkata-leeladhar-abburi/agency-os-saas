-- Quotes and proposals (M10): numbering, locks, row-level security and the public link lookup.

-- Takes the next number for a document kind and financial year, row-locked so two people
-- never get the same one. Quotes need sales_docs.write; invoices need invoices.write.
CREATE OR REPLACE FUNCTION public.take_document_number(p_workspace uuid, p_kind document_kind, p_fy text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_number integer;
BEGIN
  -- In a SECURITY DEFINER function current_user is the owner; the caller's role is in 'role'.
  IF current_setting('role', true) IS DISTINCT FROM 'service_role' AND NOT has_permission(p_workspace,
    CASE p_kind WHEN 'quote' THEN 'sales_docs.write' ELSE 'invoices.write' END) THEN
    RAISE EXCEPTION 'no_access';
  END IF;
  INSERT INTO document_sequences AS s (workspace_id, kind, financial_year, next_number)
    VALUES (p_workspace, p_kind, p_fy, 2)
  ON CONFLICT (workspace_id, kind, financial_year) DO UPDATE SET next_number = s.next_number + 1
  RETURNING next_number - 1 INTO v_number;
  RETURN v_number;
END;
$$;--> statement-breakpoint

-- A quote's items are in its workspace, and a quote changes only while it is a draft
-- (status moves are the exception).
CREATE OR REPLACE FUNCTION public.guard_quote_item() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_status quote_status;
  v_quote uuid := COALESCE(NEW.quote_id, OLD.quote_id);
BEGIN
  SELECT status INTO v_status FROM quotes
    WHERE id = v_quote AND workspace_id = COALESCE(NEW.workspace_id, OLD.workspace_id);
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'quote_not_found';
  ELSIF v_status <> 'draft' THEN
    RAISE EXCEPTION 'quote_locked';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;--> statement-breakpoint
CREATE TRIGGER quote_items_guard BEFORE INSERT OR UPDATE OR DELETE ON quote_items
  FOR EACH ROW EXECUTE FUNCTION guard_quote_item();--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.guard_quote() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status <> 'draft' AND (
    NEW.currency, NEW.discount_minor, NEW.total_minor, NEW.place_of_supply_code, NEW.has_lut, NEW.round_off
  ) IS DISTINCT FROM (
    OLD.currency, OLD.discount_minor, OLD.total_minor, OLD.place_of_supply_code, OLD.has_lut, OLD.round_off
  ) THEN
    RAISE EXCEPTION 'quote_locked';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER quotes_guard BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION guard_quote();--> statement-breakpoint

-- What was sent is what gets signed: blocks, quote and hash are fixed once a proposal leaves
-- draft, and a signed proposal can't be reopened.
CREATE OR REPLACE FUNCTION public.guard_proposal() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status <> 'draft' AND (NEW.blocks, NEW.quote_id, NEW.document_sha256)
    IS DISTINCT FROM (OLD.blocks, OLD.quote_id, OLD.document_sha256) THEN
    RAISE EXCEPTION 'proposal_locked';
  END IF;
  IF OLD.status = 'signed' AND NEW.status <> 'signed' THEN
    RAISE EXCEPTION 'proposal_locked';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER proposals_guard BEFORE UPDATE ON proposals FOR EACH ROW EXECUTE FUNCTION guard_proposal();--> statement-breakpoint

CREATE TRIGGER quotes_updated_at BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER proposals_updated_at BEFORE UPDATE ON proposals FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint

-- The workspace behind a proposal link, for the public page (anon may call it).
CREATE OR REPLACE FUNCTION public.proposal_link_workspace(p_token_hash text) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT workspace_id FROM proposals
  WHERE public_token_hash = p_token_hash AND status <> 'draft' AND deleted_at IS NULL;
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.activity_visible(p_workspace uuid, p_type text, p_id uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT CASE p_type
    WHEN 'lead' THEN EXISTS (SELECT 1 FROM leads WHERE id = p_id AND workspace_id = p_workspace)
    WHEN 'client' THEN EXISTS (SELECT 1 FROM clients WHERE id = p_id AND workspace_id = p_workspace)
    WHEN 'quote' THEN EXISTS (SELECT 1 FROM quotes WHERE id = p_id AND workspace_id = p_workspace)
    WHEN 'proposal' THEN EXISTS (SELECT 1 FROM proposals WHERE id = p_id AND workspace_id = p_workspace)
    ELSE false
  END;
$$;--> statement-breakpoint

ALTER TABLE document_sequences ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE document_sequences FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE quotes FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE quote_items FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE proposals FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE signing_codes ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE signing_codes FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE signatures FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- Sequences are reached only through take_document_number(); signing codes only by the
-- public signing flow (service role); signatures are written once by that flow and never changed.
GRANT SELECT, INSERT, UPDATE, DELETE ON quotes, quote_items, proposals TO authenticated;--> statement-breakpoint
GRANT SELECT ON signatures TO authenticated;--> statement-breakpoint
GRANT ALL ON document_sequences, quotes, quote_items, proposals, signing_codes TO service_role;--> statement-breakpoint
GRANT SELECT, INSERT ON signatures TO service_role;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION take_document_number(uuid, document_kind, text) TO authenticated, service_role;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION proposal_link_workspace(text) TO anon, authenticated, service_role;--> statement-breakpoint

CREATE POLICY quotes_select ON quotes FOR SELECT TO authenticated
  USING (has_permission(workspace_id, 'sales_docs.read'));--> statement-breakpoint
CREATE POLICY quotes_write ON quotes FOR ALL TO authenticated
  USING (has_permission(workspace_id, 'sales_docs.write'))
  WITH CHECK (has_permission(workspace_id, 'sales_docs.write'));--> statement-breakpoint
CREATE POLICY quote_items_select ON quote_items FOR SELECT TO authenticated
  USING (has_permission(workspace_id, 'sales_docs.read'));--> statement-breakpoint
CREATE POLICY quote_items_write ON quote_items FOR ALL TO authenticated
  USING (has_permission(workspace_id, 'sales_docs.write'))
  WITH CHECK (has_permission(workspace_id, 'sales_docs.write'));--> statement-breakpoint
CREATE POLICY proposals_select ON proposals FOR SELECT TO authenticated
  USING (has_permission(workspace_id, 'sales_docs.read'));--> statement-breakpoint
CREATE POLICY proposals_write ON proposals FOR ALL TO authenticated
  USING (has_permission(workspace_id, 'sales_docs.write'))
  WITH CHECK (has_permission(workspace_id, 'sales_docs.write'));--> statement-breakpoint
CREATE POLICY signatures_select ON signatures FOR SELECT TO authenticated
  USING (has_permission(workspace_id, 'sales_docs.read'));
