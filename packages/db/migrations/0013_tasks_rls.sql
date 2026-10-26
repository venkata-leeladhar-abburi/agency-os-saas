-- Tasks, comments and daily updates (M12).

ALTER TABLE tasks ALTER COLUMN position TYPE text COLLATE "C";--> statement-breakpoint
ALTER TABLE tasks ADD CONSTRAINT tasks_parent_task_id_fk FOREIGN KEY (parent_task_id)
  REFERENCES tasks(id) ON DELETE CASCADE;--> statement-breakpoint

-- A task's phase is in its project, a subtask is in its parent's project (one level deep),
-- and the assignee is an active member of the workspace.
CREATE OR REPLACE FUNCTION public.check_task() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM projects WHERE id = NEW.project_id AND workspace_id = NEW.workspace_id)
    OR (NEW.phase_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM phases WHERE id = NEW.phase_id AND project_id = NEW.project_id))
    OR (NEW.parent_task_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM tasks WHERE id = NEW.parent_task_id AND project_id = NEW.project_id AND parent_task_id IS NULL))
    OR (NEW.assignee_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM memberships WHERE workspace_id = NEW.workspace_id AND user_id = NEW.assignee_id AND status = 'active'))
  THEN
    RAISE EXCEPTION 'task_mismatch';
  END IF;
  IF NEW.status = 'done' AND (TG_OP = 'INSERT' OR OLD.status <> 'done') THEN
    NEW.completed_at := now();
  ELSIF NEW.status <> 'done' THEN
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER tasks_check BEFORE INSERT OR UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION check_task();--> statement-breakpoint
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER daily_updates_updated_at BEFORE UPDATE ON daily_updates FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint

-- Members see the tasks of their projects and anything assigned to them.
CREATE OR REPLACE FUNCTION public.can_see_task(p_workspace uuid, p_project uuid, p_assignee uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT can_project(p_workspace, p_project, 'tasks.read')
    OR (p_assignee = auth.uid() AND is_member(p_workspace)) IS TRUE;
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
    ELSE false
  END;
$$;--> statement-breakpoint

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE tasks FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE comments FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE daily_updates ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE daily_updates FORCE ROW LEVEL SECURITY;--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON tasks, daily_updates TO authenticated;--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON comments TO authenticated;--> statement-breakpoint
GRANT UPDATE (body, edited_at) ON comments TO authenticated;--> statement-breakpoint
GRANT ALL ON tasks, comments, daily_updates TO service_role;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION can_see_task(uuid, uuid, uuid) TO authenticated, service_role;--> statement-breakpoint

CREATE POLICY tasks_select ON tasks FOR SELECT TO authenticated
  USING (can_see_task(workspace_id, project_id, assignee_id));--> statement-breakpoint
CREATE POLICY tasks_insert ON tasks FOR INSERT TO authenticated
  WITH CHECK (can_project(workspace_id, project_id, 'tasks.write'));--> statement-breakpoint
CREATE POLICY tasks_update ON tasks FOR UPDATE TO authenticated
  USING (can_project(workspace_id, project_id, 'tasks.write'))
  WITH CHECK (can_project(workspace_id, project_id, 'tasks.write'));--> statement-breakpoint
CREATE POLICY tasks_delete ON tasks FOR DELETE TO authenticated
  USING (can_project(workspace_id, project_id, 'tasks.delete'));--> statement-breakpoint

CREATE POLICY comments_select ON comments FOR SELECT TO authenticated
  USING (is_member(workspace_id) AND activity_visible(workspace_id, subject_type, subject_id));--> statement-breakpoint
CREATE POLICY comments_insert ON comments FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND author_contact_id IS NULL AND is_member(workspace_id)
    AND activity_visible(workspace_id, subject_type, subject_id));--> statement-breakpoint
CREATE POLICY comments_update ON comments FOR UPDATE TO authenticated
  USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());--> statement-breakpoint
CREATE POLICY comments_delete ON comments FOR DELETE TO authenticated
  USING (author_id = auth.uid());--> statement-breakpoint

-- Your own updates; the project's lead (projects.write) and people managers (members.write) read them.
CREATE POLICY daily_updates_select ON daily_updates FOR SELECT TO authenticated
  USING (user_id = auth.uid()
    OR (project_id IS NOT NULL AND can_project(workspace_id, project_id, 'projects.write'))
    OR has_permission(workspace_id, 'members.write'));--> statement-breakpoint
CREATE POLICY daily_updates_write ON daily_updates FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND is_member(workspace_id)
    AND (project_id IS NULL OR can_project(workspace_id, project_id, 'projects.read')));
--> statement-breakpoint

-- The team page: each member with their role, how many active projects they're on and their
-- open tasks (counts only). Anyone with members.read sees it.
CREATE OR REPLACE FUNCTION public.team_overview(p_workspace uuid)
RETURNS TABLE (user_id uuid, name text, role role, status membership_status, projects integer, open_tasks integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.user_id, pr.full_name, m.role, m.status,
    (SELECT count(DISTINCT p.id)::int FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = m.user_id
      WHERE p.workspace_id = m.workspace_id AND p.deleted_at IS NULL AND p.status = 'active'
        AND (pm.id IS NOT NULL OR p.lead_member_id = m.user_id)),
    (SELECT count(*)::int FROM tasks t
      WHERE t.workspace_id = m.workspace_id AND t.assignee_id = m.user_id AND t.deleted_at IS NULL AND t.status <> 'done')
  FROM memberships m LEFT JOIN profiles pr ON pr.id = m.user_id
  WHERE m.workspace_id = p_workspace AND has_permission(p_workspace, 'members.read')
  ORDER BY pr.full_name NULLS LAST, m.created_at;
$$;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION team_overview(uuid) TO authenticated, service_role;
