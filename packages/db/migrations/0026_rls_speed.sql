-- Faster row-level security (D-069), the same rules. The busiest tables' read policies called a
-- function per row that looked up the member's role again (about 40 µs a row, so 10,000 records
-- took seconds). They now compare each row with the set of workspaces where the member has the
-- permission, worked out once per query. "Own" scopes still check the project per row, but only
-- for roles whose scope is "own".

-- The workspaces where the signed-in person is an active member with this permission, at this
-- scope (any scope when null).
CREATE OR REPLACE FUNCTION public.permitted_workspaces(p_perm text, p_scope permission_scope DEFAULT NULL)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.workspace_id FROM memberships m
  JOIN role_permissions rp ON rp.role = m.role
  WHERE m.user_id = auth.uid() AND m.status = 'active' AND rp.permission = p_perm
    AND (p_scope IS NULL OR rp.scope = p_scope);
$$;--> statement-breakpoint

-- The workspaces where the signed-in person is an active member.
CREATE OR REPLACE FUNCTION public.my_workspaces()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.workspace_id FROM memberships m WHERE m.user_id = auth.uid() AND m.status = 'active';
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION permitted_workspaces(text, permission_scope) FROM PUBLIC, anon;--> statement-breakpoint
REVOKE ALL ON FUNCTION my_workspaces() FROM PUBLIC, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION permitted_workspaces(text, permission_scope) TO authenticated, service_role;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION my_workspaces() TO authenticated, service_role;--> statement-breakpoint

-- has_permission(workspace_id, p)
ALTER POLICY leads_select ON leads
  USING (workspace_id IN (SELECT permitted_workspaces('leads.read')));--> statement-breakpoint
ALTER POLICY proposals_select ON proposals
  USING (workspace_id IN (SELECT permitted_workspaces('sales_docs.read')));--> statement-breakpoint
ALTER POLICY quotes_select ON quotes
  USING (workspace_id IN (SELECT permitted_workspaces('sales_docs.read')));--> statement-breakpoint
ALTER POLICY quote_items_select ON quote_items
  USING (workspace_id IN (SELECT permitted_workspaces('sales_docs.read')));--> statement-breakpoint
ALTER POLICY audit_log_select ON audit_log
  USING (workspace_id IN (SELECT permitted_workspaces('audit.read')));--> statement-breakpoint

-- can_read_client(workspace_id, client): "all" reads every client, "own" those with a project
-- the member is on.
ALTER POLICY clients_select ON clients
  USING (workspace_id IN (SELECT permitted_workspaces('clients.read', 'all'))
    OR (workspace_id IN (SELECT permitted_workspaces('clients.read', 'own')) AND owns_client(id)));--> statement-breakpoint
ALTER POLICY client_contacts_select ON client_contacts
  USING (workspace_id IN (SELECT permitted_workspaces('clients.read', 'all'))
    OR (workspace_id IN (SELECT permitted_workspaces('clients.read', 'own')) AND owns_client(client_id)));--> statement-breakpoint

-- can_project(workspace_id, project, p)
ALTER POLICY projects_select ON projects
  USING (workspace_id IN (SELECT permitted_workspaces('projects.read', 'all'))
    OR (workspace_id IN (SELECT permitted_workspaces('projects.read', 'own')) AND owns_project(id)));--> statement-breakpoint
ALTER POLICY phases_select ON phases
  USING (workspace_id IN (SELECT permitted_workspaces('projects.read', 'all'))
    OR (workspace_id IN (SELECT permitted_workspaces('projects.read', 'own')) AND owns_project(project_id)));--> statement-breakpoint

-- can_see_task: the project's tasks, or tasks assigned to you in a workspace you're in.
ALTER POLICY tasks_select ON tasks
  USING (workspace_id IN (SELECT permitted_workspaces('tasks.read', 'all'))
    OR (workspace_id IN (SELECT permitted_workspaces('tasks.read', 'own')) AND owns_project(project_id))
    OR (assignee_id = (SELECT auth.uid()) AND workspace_id IN (SELECT my_workspaces())));--> statement-breakpoint

-- can_invoice(workspace_id, project, 'invoices.read')
ALTER POLICY invoices_select ON invoices
  USING (workspace_id IN (SELECT permitted_workspaces('invoices.read', 'all'))
    OR (workspace_id IN (SELECT permitted_workspaces('invoices.read', 'own'))
      AND project_id IS NOT NULL AND owns_project(project_id)));--> statement-breakpoint

-- is_member(workspace_id)
ALTER POLICY activities_select ON activities
  USING (workspace_id IN (SELECT my_workspaces()) AND activity_visible(workspace_id, subject_type, subject_id));--> statement-breakpoint
ALTER POLICY comments_select ON comments
  USING (workspace_id IN (SELECT my_workspaces()) AND activity_visible(workspace_id, subject_type, subject_id));--> statement-breakpoint
ALTER POLICY pipeline_stages_select ON pipeline_stages
  USING (workspace_id IN (SELECT my_workspaces()));--> statement-breakpoint
ALTER POLICY notifications_select ON notifications
  USING (user_id = (SELECT auth.uid()) AND workspace_id IN (SELECT my_workspaces()));
--> statement-breakpoint

-- can_project(workspace_id, project_of_phase(phase_id), 'projects.read'): checklists and gates.
ALTER POLICY checklist_items_select ON checklist_items
  USING (workspace_id IN (SELECT permitted_workspaces('projects.read', 'all'))
    OR (workspace_id IN (SELECT permitted_workspaces('projects.read', 'own'))
      AND owns_project(project_of_phase(phase_id))));--> statement-breakpoint
ALTER POLICY gates_select ON gates
  USING (workspace_id IN (SELECT permitted_workspaces('projects.read', 'all'))
    OR (workspace_id IN (SELECT permitted_workspaces('projects.read', 'own'))
      AND owns_project(project_of_phase(phase_id))));--> statement-breakpoint
ALTER POLICY project_members_select ON project_members
  USING (workspace_id IN (SELECT permitted_workspaces('projects.read', 'all'))
    OR (workspace_id IN (SELECT permitted_workspaces('projects.read', 'own')) AND owns_project(project_id)));
--> statement-breakpoint

-- Write policies (FOR ALL) are also read policies, joined to the read ones with OR, so they get
-- the same treatment; their checks on new rows stay the same rules.
ALTER POLICY phases_write ON phases
  USING (workspace_id IN (SELECT permitted_workspaces('projects.write', 'all'))
    OR (workspace_id IN (SELECT permitted_workspaces('projects.write', 'own')) AND owns_project(project_id)))
  WITH CHECK (workspace_id IN (SELECT permitted_workspaces('projects.write', 'all'))
    OR (workspace_id IN (SELECT permitted_workspaces('projects.write', 'own')) AND owns_project(project_id)));--> statement-breakpoint
ALTER POLICY project_members_write ON project_members
  USING (workspace_id IN (SELECT permitted_workspaces('projects.write', 'all'))
    OR (workspace_id IN (SELECT permitted_workspaces('projects.write', 'own')) AND owns_project(project_id)))
  WITH CHECK (workspace_id IN (SELECT permitted_workspaces('projects.write', 'all'))
    OR (workspace_id IN (SELECT permitted_workspaces('projects.write', 'own')) AND owns_project(project_id)));--> statement-breakpoint
ALTER POLICY checklist_items_write ON checklist_items
  USING (workspace_id IN (SELECT permitted_workspaces('projects.write', 'all'))
    OR (workspace_id IN (SELECT permitted_workspaces('projects.write', 'own'))
      AND owns_project(project_of_phase(phase_id))))
  WITH CHECK (workspace_id IN (SELECT permitted_workspaces('projects.write', 'all'))
    OR (workspace_id IN (SELECT permitted_workspaces('projects.write', 'own'))
      AND owns_project(project_of_phase(phase_id))));--> statement-breakpoint
ALTER POLICY gates_write ON gates
  USING (workspace_id IN (SELECT permitted_workspaces('projects.write', 'all'))
    OR (workspace_id IN (SELECT permitted_workspaces('projects.write', 'own'))
      AND owns_project(project_of_phase(phase_id))))
  WITH CHECK (workspace_id IN (SELECT permitted_workspaces('projects.write', 'all'))
    OR (workspace_id IN (SELECT permitted_workspaces('projects.write', 'own'))
      AND owns_project(project_of_phase(phase_id))));--> statement-breakpoint
ALTER POLICY client_contacts_write ON client_contacts
  USING (workspace_id IN (SELECT permitted_workspaces('clients.write')))
  WITH CHECK (workspace_id IN (SELECT permitted_workspaces('clients.write')));--> statement-breakpoint
ALTER POLICY invoice_items_write ON invoice_items
  USING (workspace_id IN (SELECT permitted_workspaces('invoices.write')))
  WITH CHECK (workspace_id IN (SELECT permitted_workspaces('invoices.write')));--> statement-breakpoint
ALTER POLICY proposals_write ON proposals
  USING (workspace_id IN (SELECT permitted_workspaces('sales_docs.write')))
  WITH CHECK (workspace_id IN (SELECT permitted_workspaces('sales_docs.write')));--> statement-breakpoint
ALTER POLICY quotes_write ON quotes
  USING (workspace_id IN (SELECT permitted_workspaces('sales_docs.write')))
  WITH CHECK (workspace_id IN (SELECT permitted_workspaces('sales_docs.write')));--> statement-breakpoint
ALTER POLICY quote_items_write ON quote_items
  USING (workspace_id IN (SELECT permitted_workspaces('sales_docs.write')))
  WITH CHECK (workspace_id IN (SELECT permitted_workspaces('sales_docs.write')));--> statement-breakpoint
ALTER POLICY enquiry_forms_write ON enquiry_forms
  USING (workspace_id IN (SELECT permitted_workspaces('leads.write')))
  WITH CHECK (workspace_id IN (SELECT permitted_workspaces('leads.write')));
