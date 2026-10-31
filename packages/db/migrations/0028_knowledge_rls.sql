-- Knowledge base (D-072, docs/02-product/knowledge-base.md): who reads and who manages.
-- Everyone in the workspace reads (knowledge.read); owners, admins and project leads manage it
-- all (knowledge.write, all); members add items and edit their own (knowledge.write, own).

INSERT INTO role_permissions (role, permission, scope) VALUES
  ('owner', 'knowledge.read', 'all'), ('owner', 'knowledge.write', 'all'),
  ('admin', 'knowledge.read', 'all'), ('admin', 'knowledge.write', 'all'),
  ('project_lead', 'knowledge.read', 'all'), ('project_lead', 'knowledge.write', 'all'),
  ('member', 'knowledge.read', 'all'), ('member', 'knowledge.write', 'own'),
  ('finance', 'knowledge.read', 'all'),
  ('hr', 'knowledge.read', 'all');--> statement-breakpoint

ALTER TABLE knowledge_folders ADD CONSTRAINT knowledge_folders_name_check
  CHECK (char_length(btrim(name)) BETWEEN 1 AND 80);--> statement-breakpoint
ALTER TABLE knowledge_folders ADD CONSTRAINT knowledge_folders_parent_fk
  FOREIGN KEY (parent_id) REFERENCES knowledge_folders(id) ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE knowledge_items ADD CONSTRAINT knowledge_items_title_check
  CHECK (char_length(btrim(title)) BETWEEN 1 AND 160);--> statement-breakpoint
ALTER TABLE knowledge_items ADD CONSTRAINT knowledge_items_summary_check
  CHECK (summary IS NULL OR char_length(summary) <= 300);--> statement-breakpoint
ALTER TABLE knowledge_items ADD CONSTRAINT knowledge_items_body_check
  CHECK (char_length(body) <= 100000);--> statement-breakpoint
-- Links open in a browser: web addresses only, never javascript: or data:.
ALTER TABLE knowledge_items ADD CONSTRAINT knowledge_items_url_check
  CHECK (url IS NULL OR url ~* '^https?://[^\s]+$');--> statement-breakpoint
ALTER TABLE knowledge_items ADD CONSTRAINT knowledge_items_tags_check
  CHECK (cardinality(tags) <= 10);--> statement-breakpoint
ALTER TABLE knowledge_items ADD CONSTRAINT knowledge_items_roles_check
  CHECK (roles <@ ARRAY['owner', 'admin', 'project_lead', 'member', 'finance', 'hr']);--> statement-breakpoint
CREATE UNIQUE INDEX knowledge_item_clients_key ON knowledge_item_clients (item_id, client_id);--> statement-breakpoint

CREATE TRIGGER knowledge_folders_updated_at BEFORE UPDATE ON knowledge_folders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER knowledge_items_updated_at BEFORE UPDATE ON knowledge_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint

-- A folder's parent, an item's folder and an item's clients belong to the same workspace, and
-- a folder can't be moved inside itself. One function per table (PL/pgSQL reads every NEW field).
CREATE OR REPLACE FUNCTION public.knowledge_folder_parent() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM knowledge_folders WHERE id = NEW.parent_id AND workspace_id = NEW.workspace_id) THEN
    RAISE EXCEPTION 'knowledge_mismatch';
  END IF;
  IF EXISTS (
    WITH RECURSIVE up AS (
      SELECT id, parent_id FROM knowledge_folders WHERE id = NEW.parent_id
      UNION ALL
      SELECT f.id, f.parent_id FROM knowledge_folders f JOIN up ON f.id = up.parent_id
    ) SELECT 1 FROM up WHERE up.id = NEW.id) THEN
    RAISE EXCEPTION 'knowledge_folder_parent_invalid';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.knowledge_item_folder() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.folder_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM knowledge_folders WHERE id = NEW.folder_id AND workspace_id = NEW.workspace_id) THEN
    RAISE EXCEPTION 'knowledge_mismatch';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.knowledge_item_client() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM knowledge_items WHERE id = NEW.item_id AND workspace_id = NEW.workspace_id)
    OR NOT EXISTS (SELECT 1 FROM clients WHERE id = NEW.client_id AND workspace_id = NEW.workspace_id) THEN
    RAISE EXCEPTION 'knowledge_mismatch';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER knowledge_folders_same_workspace BEFORE INSERT OR UPDATE ON knowledge_folders
  FOR EACH ROW EXECUTE FUNCTION knowledge_folder_parent();--> statement-breakpoint
CREATE TRIGGER knowledge_items_same_workspace BEFORE INSERT OR UPDATE ON knowledge_items
  FOR EACH ROW EXECUTE FUNCTION knowledge_item_folder();--> statement-breakpoint
CREATE TRIGGER knowledge_item_clients_same_workspace BEFORE INSERT OR UPDATE ON knowledge_item_clients
  FOR EACH ROW EXECUTE FUNCTION knowledge_item_client();--> statement-breakpoint

-- A folder is deleted only when nothing is left in it, counting items nobody else can see.
CREATE OR REPLACE FUNCTION public.knowledge_folder_empty() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM knowledge_folders WHERE parent_id = OLD.id)
    OR EXISTS (SELECT 1 FROM knowledge_items WHERE folder_id = OLD.id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'knowledge_folder_not_empty';
  END IF;
  RETURN OLD;
END;
$$;--> statement-breakpoint
CREATE TRIGGER knowledge_folders_empty BEFORE DELETE ON knowledge_folders
  FOR EACH ROW EXECUTE FUNCTION knowledge_folder_empty();--> statement-breakpoint

-- The signed-in person's role in a workspace.
CREATE OR REPLACE FUNCTION public.my_role(p_workspace uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role::text FROM memberships
  WHERE workspace_id = p_workspace AND user_id = auth.uid() AND status = 'active';
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION my_role(uuid) FROM PUBLIC, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION my_role(uuid) TO authenticated, service_role;--> statement-breakpoint

ALTER TABLE knowledge_folders ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE knowledge_folders FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE knowledge_items ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE knowledge_items FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE knowledge_item_clients ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE knowledge_item_clients FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON knowledge_folders, knowledge_items, knowledge_item_clients TO authenticated;--> statement-breakpoint
GRANT ALL ON knowledge_folders, knowledge_items, knowledge_item_clients TO service_role;--> statement-breakpoint

-- Folders: everyone who reads the knowledge base sees them; those who manage it change them.
CREATE POLICY knowledge_folders_select ON knowledge_folders FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT permitted_workspaces('knowledge.read')));--> statement-breakpoint
CREATE POLICY knowledge_folders_write ON knowledge_folders FOR ALL TO authenticated
  USING (workspace_id IN (SELECT permitted_workspaces('knowledge.write', 'all')))
  WITH CHECK (workspace_id IN (SELECT permitted_workspaces('knowledge.write', 'all')));--> statement-breakpoint

-- Items. You see an item if you wrote it; or it isn't private and you manage the knowledge
-- base; or it's published, not private, and open to your role (owners and admins manage it).
CREATE POLICY knowledge_items_select ON knowledge_items FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT permitted_workspaces('knowledge.read')) AND (
    created_by = (SELECT auth.uid())
    OR (visibility <> 'private' AND workspace_id IN (SELECT permitted_workspaces('knowledge.write', 'all')))
    OR (visibility <> 'private' AND status = 'published'
      AND (cardinality(roles) = 0 OR my_role(workspace_id) = ANY (roles)))
  ));--> statement-breakpoint
-- Adding: as yourself; only those who manage the knowledge base share items with clients.
CREATE POLICY knowledge_items_insert ON knowledge_items FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT permitted_workspaces('knowledge.write'))
    AND created_by = (SELECT auth.uid()) AND updated_by = (SELECT auth.uid())
    AND (visibility <> 'clients' OR workspace_id IN (SELECT permitted_workspaces('knowledge.write', 'all'))));--> statement-breakpoint
-- Changing (and deleting): your own items, or any item that isn't private if you manage it.
CREATE POLICY knowledge_items_update ON knowledge_items FOR UPDATE TO authenticated
  USING (
    (created_by = (SELECT auth.uid()) AND workspace_id IN (SELECT permitted_workspaces('knowledge.write')))
    OR (visibility <> 'private' AND workspace_id IN (SELECT permitted_workspaces('knowledge.write', 'all'))))
  WITH CHECK (updated_by = (SELECT auth.uid())
    AND ((created_by = (SELECT auth.uid()) AND workspace_id IN (SELECT permitted_workspaces('knowledge.write')))
      OR (visibility <> 'private' AND workspace_id IN (SELECT permitted_workspaces('knowledge.write', 'all'))))
    AND (visibility <> 'clients' OR workspace_id IN (SELECT permitted_workspaces('knowledge.write', 'all'))));--> statement-breakpoint
CREATE POLICY knowledge_items_delete ON knowledge_items FOR DELETE TO authenticated
  USING (
    (created_by = (SELECT auth.uid()) AND workspace_id IN (SELECT permitted_workspaces('knowledge.write')))
    OR (visibility <> 'private' AND workspace_id IN (SELECT permitted_workspaces('knowledge.write', 'all'))));--> statement-breakpoint
-- The author can't be changed.
CREATE OR REPLACE FUNCTION public.knowledge_keep_author() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.workspace_id <> OLD.workspace_id THEN
    RAISE EXCEPTION 'knowledge_author_locked';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER knowledge_items_keep_author BEFORE UPDATE ON knowledge_items
  FOR EACH ROW EXECUTE FUNCTION knowledge_keep_author();--> statement-breakpoint

-- Which clients an item is shared with: seen with the item, set by those who manage it.
CREATE POLICY knowledge_item_clients_select ON knowledge_item_clients FOR SELECT TO authenticated
  USING (item_id IN (SELECT id FROM knowledge_items));--> statement-breakpoint
CREATE POLICY knowledge_item_clients_write ON knowledge_item_clients FOR ALL TO authenticated
  USING (workspace_id IN (SELECT permitted_workspaces('knowledge.write', 'all')))
  WITH CHECK (workspace_id IN (SELECT permitted_workspaces('knowledge.write', 'all')));--> statement-breakpoint

-- The client portal's guides: published items shared with this client (all clients, or this
-- one), for the client's own invited contacts only. Read-only; nothing about who wrote them.
CREATE OR REPLACE FUNCTION public.portal_knowledge(p_client uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', i.id, 'kind', i.kind, 'title', i.title, 'summary', i.summary, 'body', i.body,
    'url', i.url, 'tags', to_jsonb(i.tags), 'updatedAt', i.updated_at,
    'folder', (SELECT f.name FROM knowledge_folders f WHERE f.id = i.folder_id)
  ) ORDER BY i.title), '[]'::jsonb)
  FROM knowledge_items i
  JOIN clients c ON c.id = p_client AND c.workspace_id = i.workspace_id
  WHERE is_client_contact_for(p_client)
    AND i.deleted_at IS NULL AND i.status = 'published' AND i.visibility = 'clients'
    AND (i.all_clients OR EXISTS (
      SELECT 1 FROM knowledge_item_clients k WHERE k.item_id = i.id AND k.client_id = p_client));
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION portal_knowledge(uuid) FROM PUBLIC, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION portal_knowledge(uuid) TO authenticated;
