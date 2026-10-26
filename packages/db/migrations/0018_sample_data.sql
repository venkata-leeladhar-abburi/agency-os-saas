-- Example data (M7): example records can be removed in one go, and only example records.

-- Issued invoices are never deleted, except example ones when sample data is removed.
CREATE OR REPLACE FUNCTION public.guard_invoice() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_free text[] := ARRAY['status', 'amount_paid_minor', 'cancelled_at', 'cancel_reason', 'pdf_path',
    'public_token_hash', 'updated_at'];
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' AND NOT OLD.is_example THEN RAISE EXCEPTION 'invoice_locked'; END IF;
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

-- Payments are kept for good, except those on example invoices (removed with the sample data).
CREATE OR REPLACE FUNCTION public.guard_payment_delete() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM invoices WHERE id = OLD.invoice_id AND is_example) THEN
    RAISE EXCEPTION 'payment_locked';
  END IF;
  RETURN OLD;
END;
$$;--> statement-breakpoint
CREATE TRIGGER payments_guard_delete BEFORE DELETE ON payments FOR EACH ROW EXECUTE FUNCTION guard_payment_delete();--> statement-breakpoint
GRANT DELETE ON payments TO service_role;
