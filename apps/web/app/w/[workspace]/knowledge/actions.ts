'use server';

import { ROLES, type Role } from '@agency-os/core';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  deleteKnowledgeFolder,
  deleteKnowledgeItem,
  knowledge,
  saveKnowledgeFolder,
  saveKnowledgeItem,
} from '@/lib/data/knowledge';
import {
  KNOWLEDGE_KINDS,
  type KnowledgeInput,
  type KnowledgeKind,
  type KnowledgeVisibility,
} from '@/lib/data/knowledge-types';
import type { FormState } from '@/lib/form-state';

const base = (slug: string) => `/w/${slug}/knowledge`;
const text = (form: FormData, key: string) => String(form.get(key) ?? '').trim();

/** The item form's fields, checked. */
function readItem(form: FormData): { input: KnowledgeInput; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const kind = text(form, 'kind') as KnowledgeKind;
  const visibility = text(form, 'visibility') as KnowledgeVisibility;
  const title = text(form, 'title');
  if (!title) errors.title = 'Give the item a title.';
  if (title.length > 160) errors.title = 'Keep the title under 160 characters.';
  const summary = text(form, 'summary');
  if (summary.length > 300) errors.summary = 'Keep the summary under 300 characters.';
  const url = text(form, 'url');
  if (url && !/^https?:\/\/\S+$/i.test(url))
    errors.url = 'Enter a web address starting with https://.';
  const someRoles = text(form, 'roleScope') === 'some';
  const roles = someRoles
    ? form
        .getAll('roles')
        .map(String)
        .filter((r): r is Role => (ROLES as readonly string[]).includes(r))
    : [];
  if (visibility === 'team' && someRoles && roles.length === 0)
    errors.roles = 'Pick at least one role, or share it with everyone in the team.';
  const allClients = text(form, 'clientScope') !== 'some';
  const clientIds = allClients ? [] : form.getAll('clientIds').map(String).filter(Boolean);
  if (visibility === 'clients' && !allClients && clientIds.length === 0)
    errors.clients = 'Pick at least one client, or share it with all clients.';
  const folder = text(form, 'folderId');
  return {
    errors,
    input: {
      folderId: folder || null,
      kind: (KNOWLEDGE_KINDS as readonly string[]).includes(kind) ? kind : 'process',
      title,
      summary: summary || null,
      body: String(form.get('body') ?? ''),
      url: url || null,
      tags: text(form, 'tags')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      visibility: ['private', 'team', 'clients'].includes(visibility) ? visibility : 'team',
      roles,
      allClients,
      clientIds,
      status: text(form, 'status') === 'draft' ? 'draft' : 'published',
    },
  };
}

export async function saveItemAction(
  slug: string,
  id: string | undefined,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const values = Object.fromEntries(
    [...form.entries()].filter(([, v]) => typeof v === 'string') as [string, string][],
  );
  const { input, errors } = readItem(form);
  const { rights } = await knowledge(slug, { folderId: null });
  if (input.visibility === 'clients' && !rights.manage)
    errors.visibility = 'Only owners, admins and project leads share items with clients.';
  if (Object.keys(errors).length) return { errors, values };
  const saved = await saveKnowledgeItem(input, slug, id);
  if (saved.error) {
    const field = saved.field === 'clients' ? 'clients' : saved.field;
    return field ? { errors: { [field]: saved.error }, values } : { message: saved.error, values };
  }
  revalidatePath(base(slug), 'layout');
  redirect(`${base(slug)}/${saved.id}`);
}

export async function deleteItemAction(slug: string, id: string, folderId: string | null) {
  await deleteKnowledgeItem(id, slug);
  revalidatePath(base(slug), 'layout');
  redirect(folderId ? `${base(slug)}/folders/${folderId}` : base(slug));
}

export async function saveFolderAction(
  slug: string,
  id: string | undefined,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const name = text(form, 'name');
  const values = { name, description: text(form, 'description'), parentId: text(form, 'parentId') };
  if (!name) return { errors: { name: 'Give the folder a name.' }, values };
  if (name.length > 80) return { errors: { name: 'Keep the name under 80 characters.' }, values };
  const saved = await saveKnowledgeFolder(
    { name, description: values.description || null, parentId: values.parentId || null },
    slug,
    id,
  );
  if (saved.error) return { message: saved.error, values };
  revalidatePath(base(slug), 'layout');
  redirect(`${base(slug)}/folders/${saved.id}`);
}

export async function deleteFolderAction(
  slug: string,
  id: string,
  parentId: string | null,
): Promise<FormState> {
  const done = await deleteKnowledgeFolder(id, slug);
  if (done.error) return { message: done.error };
  revalidatePath(base(slug), 'layout');
  redirect(parentId ? `${base(slug)}/folders/${parentId}` : base(slug));
}
