-- Projects, phases and gates (M11): access by project membership, phase order, and gate
-- decisions that only the right person can make.

-- The signed-in user is on the project (a member or its lead).
CREATE OR REPLACE FUNCTION public.owns_project(p_project uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM project_members WHERE project_id = p_project AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM projects WHERE id = p_project AND lead_member_id = auth.uid());
$$;--> statement-breakpoint

-- A permission on a project: "all" scope, or "own" and on the project.
CREATE OR REPLACE FUNCTION public.can_project(p_workspace uuid, p_project uuid, p_perm text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE permission_scope(p_workspace, p_perm)
    WHEN 'all' THEN true
    WHEN 'own' THEN owns_project(p_project)
    ELSE false
  END;
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.project_of_phase(p_phase uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT project_id FROM phases WHERE id = p_phase;
$$;--> statement-breakpoint

-- Replaces the M9 placeholder: "own" clients are the clients of your projects.
CREATE OR REPLACE FUNCTION public.owns_client(p_client uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects p WHERE p.client_id = p_client AND p.deleted_at IS NULL AND owns_project(p.id)
  );
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.activity_visible(p_workspace uuid, p_type text, p_id uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT CASE p_type
    WHEN 'lead' THEN EXISTS (SELECT 1 FROM leads WHERE id = p_id AND workspace_id = p_workspace)
    WHEN 'client' THEN EXISTS (SELECT 1 FROM clients WHERE id = p_id AND workspace_id = p_workspace)
    WHEN 'quote' THEN EXISTS (SELECT 1 FROM quotes WHERE id = p_id AND workspace_id = p_workspace)
    WHEN 'proposal' THEN EXISTS (SELECT 1 FROM proposals WHERE id = p_id AND workspace_id = p_workspace)
    WHEN 'project' THEN EXISTS (SELECT 1 FROM projects WHERE id = p_id AND workspace_id = p_workspace)
    ELSE false
  END;
$$;--> statement-breakpoint

-- Every child row is in its parent's workspace; members and approvers belong to it.
CREATE OR REPLACE FUNCTION public.check_project_tree() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ok boolean;
BEGIN
  IF TG_TABLE_NAME = 'projects' THEN
    v_ok := EXISTS (SELECT 1 FROM clients WHERE id = NEW.client_id AND workspace_id = NEW.workspace_id);
    IF v_ok AND NEW.lead_member_id IS NOT NULL THEN
      v_ok := EXISTS (SELECT 1 FROM memberships WHERE workspace_id = NEW.workspace_id AND user_id = NEW.lead_member_id AND status = 'active');
    END IF;
  ELSIF TG_TABLE_NAME = 'project_members' THEN
    v_ok := EXISTS (SELECT 1 FROM projects WHERE id = NEW.project_id AND workspace_id = NEW.workspace_id)
      AND EXISTS (SELECT 1 FROM memberships WHERE workspace_id = NEW.workspace_id AND user_id = NEW.user_id AND status = 'active');
  ELSIF TG_TABLE_NAME = 'phases' THEN
    v_ok := EXISTS (SELECT 1 FROM projects WHERE id = NEW.project_id AND workspace_id = NEW.workspace_id);
  ELSIF TG_TABLE_NAME = 'checklist_items' THEN
    v_ok := EXISTS (SELECT 1 FROM phases WHERE id = NEW.phase_id AND workspace_id = NEW.workspace_id);
  ELSIF TG_TABLE_NAME = 'gates' THEN
    v_ok := EXISTS (SELECT 1 FROM phases WHERE id = NEW.phase_id AND workspace_id = NEW.workspace_id);
    IF v_ok AND NEW.approver_contact_id IS NOT NULL THEN
      v_ok := EXISTS (
        SELECT 1 FROM client_contacts c JOIN projects p ON p.client_id = c.client_id
        JOIN phases ph ON ph.project_id = p.id
        WHERE c.id = NEW.approver_contact_id AND ph.id = NEW.phase_id
      );
    END IF;
    IF v_ok AND NEW.approver_user_id IS NOT NULL THEN
      v_ok := EXISTS (SELECT 1 FROM memberships WHERE workspace_id = NEW.workspace_id AND user_id = NEW.approver_user_id AND status = 'active');
    END IF;
  END IF;
  IF NOT v_ok THEN
    RAISE EXCEPTION 'project_mismatch';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER projects_tree BEFORE INSERT OR UPDATE OF client_id, lead_member_id, workspace_id ON projects FOR EACH ROW EXECUTE FUNCTION check_project_tree();--> statement-breakpoint
CREATE TRIGGER project_members_tree BEFORE INSERT OR UPDATE ON project_members FOR EACH ROW EXECUTE FUNCTION check_project_tree();--> statement-breakpoint
CREATE TRIGGER phases_tree BEFORE INSERT OR UPDATE OF project_id, workspace_id ON phases FOR EACH ROW EXECUTE FUNCTION check_project_tree();--> statement-breakpoint
CREATE TRIGGER checklist_items_tree BEFORE INSERT OR UPDATE OF phase_id, workspace_id ON checklist_items FOR EACH ROW EXECUTE FUNCTION check_project_tree();--> statement-breakpoint
CREATE TRIGGER gates_tree BEFORE INSERT OR UPDATE OF phase_id, workspace_id, approver_contact_id, approver_user_id ON gates FOR EACH ROW EXECUTE FUNCTION check_project_tree();--> statement-breakpoint

-- Gate status and decisions change only through the functions below (which set a flag), and
-- a phase that comes after a gate can only start once that gate is approved or skipped.
-- The one exception: a project started from a signed proposal begins with its first gate
-- (Proposal accepted) approved.
CREATE OR REPLACE FUNCTION public.guard_gate() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('app.gate_decision', true) IS DISTINCT FROM 'on' AND (
    TG_OP = 'INSERT' AND NEW.status <> 'not_started' AND NOT (
      NEW.status = 'approved' AND EXISTS (
        SELECT 1 FROM phases ph JOIN projects p ON p.id = ph.project_id
        JOIN proposals pr ON pr.id = p.proposal_id AND pr.status = 'signed' AND pr.workspace_id = p.workspace_id
        WHERE ph.id = NEW.phase_id AND ph.position = 0
      )
    )
    OR TG_OP = 'UPDATE' AND (NEW.status, NEW.decided_at, NEW.decided_by, NEW.decided_by_contact_id, NEW.decision_comment, NEW.requested_at)
      IS DISTINCT FROM (OLD.status, OLD.decided_at, OLD.decided_by, OLD.decided_by_contact_id, OLD.decision_comment, OLD.requested_at)
  ) THEN
    RAISE EXCEPTION 'gate_decision_locked';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER gates_guard BEFORE INSERT OR UPDATE ON gates FOR EACH ROW
  WHEN (pg_trigger_depth() = 0) EXECUTE FUNCTION guard_gate();--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.guard_phase_order() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('in_progress', 'done') AND OLD.status IS DISTINCT FROM NEW.status AND EXISTS (
    SELECT 1 FROM phases ph JOIN gates g ON g.phase_id = ph.id
    WHERE ph.project_id = NEW.project_id AND ph.position < NEW.position
      AND ph.status <> 'skipped' AND g.status NOT IN ('approved', 'skipped')
  ) THEN
    RAISE EXCEPTION 'gate_not_approved';
  END IF;
  IF (NEW.status = 'skipped') IS DISTINCT FROM (OLD.status = 'skipped')
    AND current_setting('app.gate_decision', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'gate_decision_locked';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER phases_order BEFORE UPDATE OF status ON phases FOR EACH ROW EXECUTE FUNCTION guard_phase_order();--> statement-breakpoint

CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER phases_updated_at BEFORE UPDATE ON phases FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER gates_updated_at BEFORE UPDATE ON gates FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER phase_templates_updated_at BEFORE UPDATE ON phase_templates FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint

-- Records a gate event on the project timeline and in the audit log.
CREATE OR REPLACE FUNCTION public.log_gate_event(g gates, p_kind text, p_actor uuid, p_meta jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO activities (id, workspace_id, subject_type, subject_id, kind, actor_id, meta, is_example)
    SELECT gen_random_uuid(), g.workspace_id, 'project', ph.project_id, p_kind, p_actor,
      p_meta || jsonb_build_object('gateId', g.id, 'gate', g.title), g.is_example
    FROM phases ph WHERE ph.id = g.phase_id;
  INSERT INTO audit_log (id, workspace_id, actor_id, action, subject_type, subject_id, changes)
    VALUES (gen_random_uuid(), g.workspace_id, p_actor, replace(p_kind, '_', '.'), 'gate', g.id, p_meta);
$$;--> statement-breakpoint

-- The project lead (gates.request) asks for sign-off.
CREATE OR REPLACE FUNCTION public.request_gate(p_gate uuid, p_message text) RETURNS gates
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  g gates;
BEGIN
  SELECT * INTO g FROM gates WHERE id = p_gate FOR UPDATE;
  IF g.id IS NULL OR NOT can_project(g.workspace_id, project_of_phase(g.phase_id), 'gates.request') THEN
    RAISE EXCEPTION 'gate_not_found';
  END IF;
  IF g.status NOT IN ('not_started', 'changes_requested') THEN
    RAISE EXCEPTION 'gate_not_open';
  END IF;
  PERFORM set_config('app.gate_decision', 'on', true);
  UPDATE gates SET status = 'waiting', requested_at = now(), requested_by = auth.uid(),
    request_message = nullif(trim(p_message), ''), decided_at = NULL, decided_by = NULL,
    decided_by_contact_id = NULL, decision_comment = NULL
    WHERE id = p_gate RETURNING * INTO g;
  PERFORM set_config('app.gate_decision', 'off', true);
  PERFORM log_gate_event(g, 'gate_requested', auth.uid(), jsonb_build_object('message', g.request_message));
  RETURN g;
END;
$$;--> statement-breakpoint

-- Applies a decision once the caller has been checked.
CREATE OR REPLACE FUNCTION public.apply_gate_decision(g gates, p_approve boolean, p_comment text,
  p_user uuid, p_contact uuid) RETURNS gates
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF g.status <> 'waiting' THEN
    RAISE EXCEPTION 'gate_not_waiting';
  END IF;
  IF NOT p_approve AND coalesce(trim(p_comment), '') = '' THEN
    RAISE EXCEPTION 'gate_comment_required';
  END IF;
  PERFORM set_config('app.gate_decision', 'on', true);
  UPDATE gates SET status = CASE WHEN p_approve THEN 'approved'::gate_status ELSE 'changes_requested' END,
    decided_at = now(), decided_by = p_user, decided_by_contact_id = p_contact,
    decision_comment = nullif(trim(p_comment), '')
    WHERE id = g.id RETURNING * INTO g;
  IF p_approve THEN
    UPDATE phases SET status = 'done' WHERE id = g.phase_id AND status <> 'done';
  END IF;
  PERFORM set_config('app.gate_decision', 'off', true);
  PERFORM log_gate_event(g, CASE WHEN p_approve THEN 'gate_approved' ELSE 'gate_changes_requested' END,
    p_user, jsonb_build_object('comment', g.decision_comment, 'byContact', p_contact));
  RETURN g;
END;
$$;--> statement-breakpoint

-- An internal gate: its named approver, or anyone with gates.approve when none is named.
CREATE OR REPLACE FUNCTION public.decide_gate_internal(p_gate uuid, p_approve boolean, p_comment text) RETURNS gates
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  g gates;
BEGIN
  SELECT * INTO g FROM gates WHERE id = p_gate FOR UPDATE;
  IF g.id IS NULL OR NOT is_member(g.workspace_id) THEN
    RAISE EXCEPTION 'gate_not_found';
  END IF;
  -- coalesce: with no named approver the comparison is NULL, which must count as "no".
  IF g.approver_type <> 'internal' OR NOT coalesce(
    g.approver_user_id = auth.uid() OR (g.approver_user_id IS NULL AND has_permission(g.workspace_id, 'gates.approve')),
    false
  ) THEN
    RAISE EXCEPTION 'gate_not_your_decision';
  END IF;
  RETURN apply_gate_decision(g, p_approve, p_comment, auth.uid(), NULL);
END;
$$;--> statement-breakpoint

-- A client gate, decided in the portal by a contact of the project's client (the named one,
-- when the gate names one).
CREATE OR REPLACE FUNCTION public.decide_gate_as_client(p_gate uuid, p_approve boolean, p_comment text) RETURNS gates
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  g gates;
  v_client uuid;
  v_contact uuid;
BEGIN
  SELECT * INTO g FROM gates WHERE id = p_gate FOR UPDATE;
  SELECT p.client_id INTO v_client FROM projects p WHERE p.id = project_of_phase(g.phase_id) AND p.deleted_at IS NULL;
  IF g.id IS NULL OR v_client IS NULL OR NOT is_client_contact_for(v_client) THEN
    RAISE EXCEPTION 'gate_not_found';
  END IF;
  SELECT c.id INTO v_contact FROM client_contacts c
    WHERE c.client_id = v_client AND c.user_id = auth.uid() AND c.portal_revoked_at IS NULL
      AND (g.approver_contact_id IS NULL OR c.id = g.approver_contact_id)
    LIMIT 1;
  IF g.approver_type <> 'client' OR v_contact IS NULL THEN
    RAISE EXCEPTION 'gate_not_your_decision';
  END IF;
  RETURN apply_gate_decision(g, p_approve, p_comment, NULL, v_contact);
END;
$$;--> statement-breakpoint

-- Skips a phase (and its gate); shown struck through, recorded on the timeline.
CREATE OR REPLACE FUNCTION public.skip_phase(p_phase uuid, p_skip boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ph phases;
  g gates;
BEGIN
  SELECT * INTO ph FROM phases WHERE id = p_phase FOR UPDATE;
  IF ph.id IS NULL OR NOT can_project(ph.workspace_id, ph.project_id, 'projects.write') THEN
    RAISE EXCEPTION 'phase_not_found';
  END IF;
  IF p_skip AND ph.status = 'done' THEN
    RAISE EXCEPTION 'phase_done';
  END IF;
  PERFORM set_config('app.gate_decision', 'on', true);
  UPDATE phases SET status = CASE WHEN p_skip THEN 'skipped'::phase_status ELSE 'not_started' END WHERE id = p_phase;
  UPDATE gates SET status = CASE WHEN p_skip THEN 'skipped'::gate_status ELSE 'not_started' END,
    requested_at = NULL, decided_at = NULL WHERE phase_id = p_phase AND status <> 'approved'
    RETURNING * INTO g;
  PERFORM set_config('app.gate_decision', 'off', true);
  INSERT INTO activities (id, workspace_id, subject_type, subject_id, kind, actor_id, meta)
    VALUES (gen_random_uuid(), ph.workspace_id, 'project', ph.project_id,
      CASE WHEN p_skip THEN 'phase_skipped' ELSE 'phase_restored' END, auth.uid(),
      jsonb_build_object('phase', ph.name, 'gate', g.title));
END;
$$;--> statement-breakpoint

-- What a portal contact sees of their projects: phases, client lines, deliverables and
-- gates, with progress. Never the internal checklist, budget or team.
CREATE OR REPLACE FUNCTION public.portal_projects() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'name', p.name, 'clientId', p.client_id, 'status', p.status, 'dueOn', p.due_on,
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

ALTER TABLE phase_templates ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE phase_templates FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE projects FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE project_members FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE phases ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE phases FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE checklist_items FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE gates ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE gates FORCE ROW LEVEL SECURITY;--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON phase_templates, projects, project_members, phases, checklist_items, gates TO authenticated;--> statement-breakpoint
GRANT ALL ON phase_templates, projects, project_members, phases, checklist_items, gates TO service_role;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION owns_project(uuid), can_project(uuid, uuid, text), project_of_phase(uuid),
  request_gate(uuid, text), decide_gate_internal(uuid, boolean, text), decide_gate_as_client(uuid, boolean, text),
  skip_phase(uuid, boolean), portal_projects() TO authenticated, service_role;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION apply_gate_decision(gates, boolean, text, uuid, uuid), log_gate_event(gates, text, uuid, jsonb) FROM PUBLIC;--> statement-breakpoint

CREATE POLICY phase_templates_select ON phase_templates FOR SELECT TO authenticated
  USING (is_member(workspace_id));--> statement-breakpoint
CREATE POLICY phase_templates_write ON phase_templates FOR ALL TO authenticated
  USING (permission_scope(workspace_id, 'projects.write') = 'all')
  WITH CHECK (permission_scope(workspace_id, 'projects.write') = 'all');--> statement-breakpoint

CREATE POLICY projects_select ON projects FOR SELECT TO authenticated
  USING (can_project(workspace_id, id, 'projects.read'));--> statement-breakpoint
-- Project leads ("own" scope) may create projects they lead.
CREATE POLICY projects_insert ON projects FOR INSERT TO authenticated
  WITH CHECK (permission_scope(workspace_id, 'projects.write') = 'all'
    OR (permission_scope(workspace_id, 'projects.write') = 'own' AND lead_member_id = auth.uid()));--> statement-breakpoint
CREATE POLICY projects_update ON projects FOR UPDATE TO authenticated
  USING (can_project(workspace_id, id, 'projects.write'))
  WITH CHECK (can_project(workspace_id, id, 'projects.write'));--> statement-breakpoint

CREATE POLICY project_members_select ON project_members FOR SELECT TO authenticated
  USING (can_project(workspace_id, project_id, 'projects.read'));--> statement-breakpoint
CREATE POLICY project_members_write ON project_members FOR ALL TO authenticated
  USING (can_project(workspace_id, project_id, 'projects.write'))
  WITH CHECK (can_project(workspace_id, project_id, 'projects.write'));--> statement-breakpoint

CREATE POLICY phases_select ON phases FOR SELECT TO authenticated
  USING (can_project(workspace_id, project_id, 'projects.read'));--> statement-breakpoint
CREATE POLICY phases_write ON phases FOR ALL TO authenticated
  USING (can_project(workspace_id, project_id, 'projects.write'))
  WITH CHECK (can_project(workspace_id, project_id, 'projects.write'));--> statement-breakpoint

CREATE POLICY checklist_items_select ON checklist_items FOR SELECT TO authenticated
  USING (can_project(workspace_id, project_of_phase(phase_id), 'projects.read'));--> statement-breakpoint
CREATE POLICY checklist_items_write ON checklist_items FOR ALL TO authenticated
  USING (can_project(workspace_id, project_of_phase(phase_id), 'projects.write'))
  WITH CHECK (can_project(workspace_id, project_of_phase(phase_id), 'projects.write'));--> statement-breakpoint

CREATE POLICY gates_select ON gates FOR SELECT TO authenticated
  USING (can_project(workspace_id, project_of_phase(phase_id), 'projects.read'));--> statement-breakpoint
CREATE POLICY gates_write ON gates FOR ALL TO authenticated
  USING (can_project(workspace_id, project_of_phase(phase_id), 'projects.write'))
  WITH CHECK (can_project(workspace_id, project_of_phase(phase_id), 'projects.write'));
