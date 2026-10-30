-- Example data in a real workspace (M7, D-063): labelled records the owner can load to look around
-- and remove in one go. Example invoices stay drafts, so they never take a number from the series.

-- An example invoice is never issued: issuing would take the next number, and removing the
-- example later would leave a gap in the GST series.
CREATE OR REPLACE FUNCTION public.guard_example_invoice() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_example AND NEW.status <> 'draft' THEN
    RAISE EXCEPTION 'example_invoice_draft';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER invoices_example_draft BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION guard_example_invoice();--> statement-breakpoint

-- Removes the workspace's example records, for those who manage the workspace. An example record
-- the workspace's own records still use (a client on your invoice, a project with your task)
-- stays, and the result names it. Returns {"removed": n, "kept": ["the client …", …]}.
CREATE OR REPLACE FUNCTION public.remove_example_data(p_workspace uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_projects uuid[];
  v_quotes uuid[];
  v_proposals uuid[];
  v_leads uuid[];
  v_clients uuid[];
  v_tasks uuid[];
  v_gone uuid[] := '{}';
  v_ids uuid[];
  v_kept text[] := '{}';
BEGIN
  IF NOT has_permission(p_workspace, 'workspace.manage') THEN
    RAISE EXCEPTION 'no_access';
  END IF;

  -- What the workspace's own records use.
  v_tasks := ARRAY(
    SELECT c.subject_id FROM comments c
    WHERE c.workspace_id = p_workspace AND c.subject_type = 'task');
  v_projects := ARRAY(
    SELECT project_id FROM tasks
      WHERE workspace_id = p_workspace AND (NOT is_example OR id = ANY(v_tasks))
    UNION SELECT project_id FROM messages WHERE workspace_id = p_workspace AND NOT is_example
    UNION SELECT project_id FROM daily_updates WHERE workspace_id = p_workspace AND project_id IS NOT NULL
    UNION SELECT project_id FROM invoices
      WHERE workspace_id = p_workspace AND project_id IS NOT NULL
        AND (NOT is_example OR status <> 'draft'));
  v_proposals := ARRAY(
    SELECT proposal_id FROM projects
      WHERE workspace_id = p_workspace AND proposal_id IS NOT NULL
        AND (NOT is_example OR id = ANY(v_projects))
    UNION SELECT proposal_id FROM signatures WHERE workspace_id = p_workspace);
  v_quotes := ARRAY(
    SELECT quote_id FROM invoices
      WHERE workspace_id = p_workspace AND quote_id IS NOT NULL
        AND (NOT is_example OR status <> 'draft')
    UNION SELECT quote_id FROM proposals
      WHERE workspace_id = p_workspace AND quote_id IS NOT NULL
        AND (NOT is_example OR id = ANY(v_proposals))
    UNION SELECT id FROM quotes WHERE workspace_id = p_workspace AND is_example AND status <> 'draft');
  v_leads := ARRAY(
    SELECT lead_id FROM quotes
      WHERE workspace_id = p_workspace AND lead_id IS NOT NULL
        AND (NOT is_example OR id = ANY(v_quotes))
    UNION SELECT lead_id FROM proposals
      WHERE workspace_id = p_workspace AND lead_id IS NOT NULL
        AND (NOT is_example OR id = ANY(v_proposals)));
  v_clients := ARRAY(
    SELECT client_id FROM invoices
      WHERE workspace_id = p_workspace AND (NOT is_example OR status <> 'draft')
    UNION SELECT client_id FROM projects
      WHERE workspace_id = p_workspace AND (NOT is_example OR id = ANY(v_projects))
    UNION SELECT client_id FROM quotes
      WHERE workspace_id = p_workspace AND client_id IS NOT NULL
        AND (NOT is_example OR id = ANY(v_quotes))
    UNION SELECT client_id FROM proposals
      WHERE workspace_id = p_workspace AND client_id IS NOT NULL
        AND (NOT is_example OR id = ANY(v_proposals))
    UNION SELECT converted_client_id FROM leads
      WHERE workspace_id = p_workspace AND converted_client_id IS NOT NULL
        AND (NOT is_example OR id = ANY(v_leads)));

  -- What stays, in words.
  v_kept := v_kept
    || ARRAY(SELECT 'the invoice ' || coalesce(number, 'draft') FROM invoices
        WHERE workspace_id = p_workspace AND is_example AND status <> 'draft')
    || ARRAY(SELECT 'the project ' || name FROM projects
        WHERE workspace_id = p_workspace AND is_example AND id = ANY(v_projects))
    || ARRAY(SELECT 'the task ' || title FROM tasks
        WHERE workspace_id = p_workspace AND is_example AND id = ANY(v_tasks))
    || ARRAY(SELECT 'the quote ' || coalesce(number, 'draft') FROM quotes
        WHERE workspace_id = p_workspace AND is_example AND id = ANY(v_quotes))
    || ARRAY(SELECT 'the lead ' || coalesce(company, name, 'without a name') FROM leads
        WHERE workspace_id = p_workspace AND is_example AND id = ANY(v_leads))
    || ARRAY(SELECT 'the client ' || name FROM clients
        WHERE workspace_id = p_workspace AND is_example AND id = ANY(v_clients));

  -- Then the rest goes, children first.
  WITH d AS (DELETE FROM invoices
    WHERE workspace_id = p_workspace AND is_example AND status = 'draft' RETURNING id)
    SELECT ARRAY(SELECT id FROM d) INTO v_ids;
  v_gone := v_gone || v_ids;
  WITH d AS (DELETE FROM messages WHERE workspace_id = p_workspace AND is_example RETURNING id)
    SELECT ARRAY(SELECT id FROM d) INTO v_ids;
  v_gone := v_gone || v_ids;
  WITH d AS (DELETE FROM tasks
    WHERE workspace_id = p_workspace AND is_example AND NOT id = ANY(v_tasks) RETURNING id)
    SELECT ARRAY(SELECT id FROM d) INTO v_ids;
  v_gone := v_gone || v_ids;
  WITH d AS (DELETE FROM projects
    WHERE workspace_id = p_workspace AND is_example AND NOT id = ANY(v_projects) RETURNING id)
    SELECT ARRAY(SELECT id FROM d) INTO v_ids;
  v_gone := v_gone || v_ids;
  WITH d AS (DELETE FROM proposals
    WHERE workspace_id = p_workspace AND is_example AND NOT id = ANY(v_proposals) RETURNING id)
    SELECT ARRAY(SELECT id FROM d) INTO v_ids;
  v_gone := v_gone || v_ids;
  WITH d AS (DELETE FROM quotes
    WHERE workspace_id = p_workspace AND is_example AND NOT id = ANY(v_quotes) RETURNING id)
    SELECT ARRAY(SELECT id FROM d) INTO v_ids;
  v_gone := v_gone || v_ids;
  WITH d AS (DELETE FROM leads
    WHERE workspace_id = p_workspace AND is_example AND NOT id = ANY(v_leads) RETURNING id)
    SELECT ARRAY(SELECT id FROM d) INTO v_ids;
  v_gone := v_gone || v_ids;
  WITH d AS (DELETE FROM clients
    WHERE workspace_id = p_workspace AND is_example AND NOT id = ANY(v_clients) RETURNING id)
    SELECT ARRAY(SELECT id FROM d) INTO v_ids;
  v_gone := v_gone || v_ids;

  -- Timelines and comments about what's gone go with it.
  DELETE FROM activities
    WHERE workspace_id = p_workspace AND (is_example OR subject_id = ANY(v_gone));
  DELETE FROM comments WHERE workspace_id = p_workspace AND subject_id = ANY(v_gone);

  INSERT INTO audit_log (id, workspace_id, actor_id, action, subject_type, subject_id, changes)
  VALUES (gen_random_uuid(), p_workspace, auth.uid(), 'example.removed', 'workspace', p_workspace,
    jsonb_build_object('removed', cardinality(v_gone), 'kept', to_jsonb(v_kept)));

  RETURN jsonb_build_object('removed', cardinality(v_gone), 'kept', to_jsonb(v_kept));
END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION remove_example_data(uuid) FROM PUBLIC, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION remove_example_data(uuid) TO authenticated;
