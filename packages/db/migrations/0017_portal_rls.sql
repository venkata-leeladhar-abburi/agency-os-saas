-- Files and the project thread (M14): access by project, and what portal contacts may do.

CREATE OR REPLACE FUNCTION public.check_file() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF left(NEW.storage_path, length(NEW.workspace_id::text) + 1) <> NEW.workspace_id::text || '/'
    OR (NEW.project_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM projects WHERE id = NEW.project_id AND workspace_id = NEW.workspace_id))
    OR (NEW.subject_type = 'project' AND NEW.subject_id IS DISTINCT FROM NEW.project_id)
  THEN
    RAISE EXCEPTION 'file_mismatch';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER files_check BEFORE INSERT OR UPDATE OF storage_path, project_id, subject_type, subject_id, workspace_id ON files
  FOR EACH ROW EXECUTE FUNCTION check_file();--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.check_message() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM projects WHERE id = NEW.project_id AND workspace_id = NEW.workspace_id)
    OR EXISTS (SELECT 1 FROM unnest(NEW.file_ids) f(id) WHERE NOT EXISTS (
      SELECT 1 FROM files WHERE files.id = f.id AND files.project_id = NEW.project_id AND files.deleted_at IS NULL))
    OR coalesce(trim(NEW.body), '') = '' AND cardinality(NEW.file_ids) = 0
  THEN
    RAISE EXCEPTION 'message_invalid';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER messages_check BEFORE INSERT ON messages FOR EACH ROW EXECUTE FUNCTION check_message();--> statement-breakpoint

-- files.read / files.write: "all", or "own" for files of your projects.
CREATE OR REPLACE FUNCTION public.can_files(p_workspace uuid, p_project uuid, p_perm text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE permission_scope(p_workspace, p_perm)
    WHEN 'all' THEN true
    WHEN 'own' THEN p_project IS NOT NULL AND owns_project(p_project)
    ELSE false
  END;
$$;--> statement-breakpoint

-- The client's project the signed-in portal contact may act on, or NULL.
CREATE OR REPLACE FUNCTION public.portal_project(p_project uuid) RETURNS projects
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.* FROM projects p
  WHERE p.id = p_project AND p.deleted_at IS NULL AND p.status <> 'cancelled' AND is_client_contact_for(p.client_id);
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.portal_contact_id(p_client uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM client_contacts
  WHERE client_id = p_client AND user_id = auth.uid() AND portal_invited_at IS NOT NULL AND portal_revoked_at IS NULL
  ORDER BY is_primary DESC, created_at LIMIT 1;
$$;--> statement-breakpoint

-- The workspace of a portal contact's project (for building the upload path), or NULL.
CREATE OR REPLACE FUNCTION public.portal_project_workspace(p_project uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (portal_project(p_project)).workspace_id;
$$;--> statement-breakpoint

-- The thread as the portal shows it: who wrote each message (member or contact name), and
-- the files attached, which are always client-visible.
CREATE OR REPLACE FUNCTION public.portal_thread(p_project uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p projects := portal_project(p_project);
BEGIN
  IF p.id IS NULL THEN
    RAISE EXCEPTION 'project_not_found';
  END IF;
  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'id', m.id, 'body', m.body, 'createdAt', m.created_at,
      'fromClient', m.author_contact_id IS NOT NULL,
      'author', coalesce(c.name, pr.full_name, 'Agency team'),
      'files', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'name', f.name, 'mime', f.mime, 'sizeBytes', f.size_bytes)), '[]'::jsonb)
        FROM files f WHERE f.id = ANY (m.file_ids) AND f.visibility = 'client' AND f.deleted_at IS NULL)
    ) ORDER BY m.created_at, m.id)
    FROM messages m
    LEFT JOIN client_contacts c ON c.id = m.author_contact_id
    LEFT JOIN profiles pr ON pr.id = m.author_id
    WHERE m.project_id = p.id
  ), '[]'::jsonb);
END;
$$;--> statement-breakpoint

-- A portal contact uploads a file to their project (after the browser's signed upload).
CREATE OR REPLACE FUNCTION public.add_portal_file(p_project uuid, p_id uuid, p_name text, p_mime text,
  p_size bigint, p_path text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p projects := portal_project(p_project);
BEGIN
  IF p.id IS NULL THEN
    RAISE EXCEPTION 'project_not_found';
  END IF;
  INSERT INTO files (id, workspace_id, project_id, subject_type, subject_id, storage_path, name, mime,
    size_bytes, visibility, uploaded_by_contact_id)
  VALUES (p_id, p.workspace_id, p.id, 'project', p.id, p_path, p_name, p_mime, p_size, 'client',
    portal_contact_id(p.client_id));
  RETURN p_id;
END;
$$;--> statement-breakpoint

-- A portal contact writes in their project's thread.
CREATE OR REPLACE FUNCTION public.post_portal_message(p_project uuid, p_body text, p_file_ids uuid[]) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p projects := portal_project(p_project);
  v_id uuid := gen_random_uuid();
BEGIN
  IF p.id IS NULL THEN
    RAISE EXCEPTION 'project_not_found';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(coalesce(p_file_ids, '{}')) f(id)
    WHERE NOT EXISTS (SELECT 1 FROM files WHERE files.id = f.id AND files.visibility = 'client')) THEN
    RAISE EXCEPTION 'message_invalid';
  END IF;
  INSERT INTO messages (id, workspace_id, project_id, author_contact_id, body, file_ids)
  VALUES (v_id, p.workspace_id, p.id, portal_contact_id(p.client_id), trim(p_body), coalesce(p_file_ids, '{}'));
  RETURN v_id;
END;
$$;--> statement-breakpoint

-- The project's files the client can see.
CREATE OR REPLACE FUNCTION public.portal_files(p_project uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p projects := portal_project(p_project);
BEGIN
  IF p.id IS NULL THEN
    RAISE EXCEPTION 'project_not_found';
  END IF;
  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object('id', f.id, 'name', f.name, 'mime', f.mime, 'sizeBytes', f.size_bytes,
      'path', f.storage_path, 'createdAt', f.created_at, 'fromClient', f.uploaded_by_contact_id IS NOT NULL)
      ORDER BY f.created_at DESC)
    FROM files f WHERE f.project_id = p.id AND f.visibility = 'client' AND f.deleted_at IS NULL
  ), '[]'::jsonb);
END;
$$;--> statement-breakpoint

ALTER TABLE files ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE files FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE messages FORCE ROW LEVEL SECURITY;--> statement-breakpoint

GRANT SELECT, INSERT ON files, messages TO authenticated;--> statement-breakpoint
GRANT UPDATE (name, visibility, deleted_at) ON files TO authenticated;--> statement-breakpoint
GRANT ALL ON files, messages TO service_role;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION can_files(uuid, uuid, text), portal_project_workspace(uuid), portal_thread(uuid), add_portal_file(uuid, uuid, text, text, bigint, text),
  post_portal_message(uuid, text, uuid[]), portal_files(uuid) TO authenticated, service_role;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION portal_project(uuid), portal_contact_id(uuid) FROM PUBLIC;--> statement-breakpoint

CREATE POLICY files_select ON files FOR SELECT TO authenticated
  USING (can_files(workspace_id, project_id, 'files.read'));--> statement-breakpoint
CREATE POLICY files_insert ON files FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND uploaded_by_contact_id IS NULL AND can_files(workspace_id, project_id, 'files.write'));--> statement-breakpoint
CREATE POLICY files_update ON files FOR UPDATE TO authenticated
  USING (can_files(workspace_id, project_id, 'files.write'))
  WITH CHECK (can_files(workspace_id, project_id, 'files.write'));--> statement-breakpoint

CREATE POLICY messages_select ON messages FOR SELECT TO authenticated
  USING (can_project(workspace_id, project_id, 'messages.read'));--> statement-breakpoint
CREATE POLICY messages_insert ON messages FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND author_contact_id IS NULL AND can_project(workspace_id, project_id, 'messages.write'));
