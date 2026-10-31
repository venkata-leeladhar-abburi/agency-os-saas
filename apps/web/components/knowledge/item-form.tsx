'use client';

import { ROLE_LABELS, ROLES, type Role } from '@agency-os/core';
import { Alert, Checkbox, Input, Select, Textarea, buttonVariants } from '@agency-os/ui';
import Link from 'next/link';
import { useActionState, useState, type ReactNode } from 'react';
import { FormMessage, Submit } from '@/components/workspace/form-bits';
import {
  folderPath,
  folderTree,
  KIND_LABELS,
  KNOWLEDGE_KINDS,
  type KnowledgeFolder,
  type KnowledgeItem,
  type KnowledgeVisibility,
} from '@/lib/data/knowledge-types';
import { EMPTY_FORM, type FormState } from '@/lib/form-state';
import { Markdown } from './markdown';

/** A radio with its label and an explanation under it. */
function Choice({
  name,
  value,
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  label: string;
  description?: ReactNode;
  disabled?: boolean;
}) {
  const id = `${name}-${value}`;
  return (
    <div className={disabled ? 'flex gap-2.5 opacity-60' : 'flex gap-2.5'}>
      <input
        type="radio"
        id={id}
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
        aria-describedby={description ? `${id}-d` : undefined}
        className="mt-0.5 size-4.5 shrink-0 accent-primary"
      />
      <span className="grid gap-0.5">
        <label htmlFor={id} className="cursor-pointer text-body-medium">
          {label}
        </label>
        {description ? (
          <span id={`${id}-d`} className="text-body-sm text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
    </div>
  );
}

export function ItemForm({
  action,
  item,
  folders,
  folderId,
  clients,
  canShareWithClients,
  cancelHref,
}: {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  item?: KnowledgeItem;
  folders: KnowledgeFolder[];
  /** The folder a new item goes in. */
  folderId?: string | null;
  clients: { id: string; name: string }[];
  canShareWithClients: boolean;
  cancelHref: string;
}) {
  const [state, run] = useActionState(action, EMPTY_FORM);
  const v = state.values;
  const e = state.errors ?? {};
  const [visibility, setVisibility] = useState<KnowledgeVisibility>(
    (v?.visibility as KnowledgeVisibility) ?? item?.visibility ?? 'team',
  );
  const [roleScope, setRoleScope] = useState(
    v?.roleScope ?? (item?.roles.length ? 'some' : 'everyone'),
  );
  const [clientScope, setClientScope] = useState(
    v?.clientScope ?? (item && !item.allClients && item.visibility === 'clients' ? 'some' : 'all'),
  );
  const [body, setBody] = useState(v?.body ?? item?.body ?? '');
  const [preview, setPreview] = useState(false);
  const roles = new Set<Role>(item?.roles ?? []);
  const picked = new Set(item?.clientIds ?? []);
  return (
    <form action={run} className="grid gap-6" noValidate>
      <FormMessage state={state} title="The item wasn’t saved" />
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <Input
          label="Title"
          name="title"
          required
          maxLength={160}
          defaultValue={v?.title ?? item?.title}
          error={e.title}
        />
        <Select
          label="Kind"
          name="kind"
          defaultValue={v?.kind ?? item?.kind ?? 'process'}
          options={KNOWLEDGE_KINDS.map((k) => ({ value: k, label: KIND_LABELS[k] }))}
        />
      </div>
      <Input
        label="Summary"
        name="summary"
        optional
        maxLength={300}
        hint="One line that says what it's for. It shows in lists."
        defaultValue={v?.summary ?? item?.summary ?? ''}
        error={e.summary}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Folder"
          name="folderId"
          defaultValue={v?.folderId ?? item?.folderId ?? folderId ?? ''}
          options={[
            { value: '', label: 'No folder' },
            ...folderTree(folders).map((f) => ({
              value: f.id,
              label: folderPath(folders, f.id)
                .map((x) => x.name)
                .join(' / '),
            })),
          ]}
        />
        <Input
          label="Link"
          name="url"
          type="url"
          optional
          placeholder="https://"
          hint="A tool, website, board or file kept somewhere else."
          defaultValue={v?.url ?? item?.url ?? ''}
          error={e.url}
        />
      </div>
      <div className="grid gap-2">
        <div className="flex items-end justify-between gap-2">
          <label htmlFor="kb-body" className="text-body-sm font-medium">
            Content <span className="font-normal text-muted-foreground">(Optional)</span>
          </label>
          <button
            type="button"
            onClick={() => setPreview((p) => !p)}
            aria-pressed={preview}
            className="text-body-sm text-link underline decoration-1 underline-offset-3"
          >
            {preview ? 'Back to writing' : 'Preview'}
          </button>
        </div>
        {preview ? (
          <div className="min-h-48 rounded-md border border-border bg-card p-4">
            {body.trim() ? (
              <Markdown source={body} />
            ) : (
              <p className="text-body text-muted-foreground">Nothing written yet.</p>
            )}
          </div>
        ) : null}
        <Textarea
          id="kb-body"
          name="body"
          rows={14}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          aria-describedby="kb-body-hint"
          className="font-mono text-body-sm"
          containerClassName={preview ? 'hidden' : undefined}
        />
        <p id="kb-body-hint" className="text-body-sm text-muted-foreground">
          Markdown: <code className="font-mono"># Heading</code>,{' '}
          <code className="font-mono">- list</code>,{' '}
          <code className="font-mono">- [ ] checklist</code>,{' '}
          <code className="font-mono">**bold**</code>,{' '}
          <code className="font-mono">[link](https://…)</code>.
        </p>
      </div>
      <Input
        label="Tags"
        name="tags"
        optional
        hint="Separated by commas: onboarding, ai, launch."
        defaultValue={v?.tags ?? item?.tags.join(', ') ?? ''}
      />

      <fieldset className="grid gap-3 rounded-lg border border-border p-4">
        <legend className="px-1 text-body-medium">Who can see it</legend>
        {e.visibility ? <Alert tone="danger">{e.visibility}</Alert> : null}
        <Choice
          name="visibility"
          value="private"
          checked={visibility === 'private'}
          onChange={(x) => setVisibility(x as KnowledgeVisibility)}
          label="Only me"
          description="Something just for you, or a draft you're not ready to share."
        />
        <Choice
          name="visibility"
          value="team"
          checked={visibility === 'team'}
          onChange={(x) => setVisibility(x as KnowledgeVisibility)}
          label="The team"
          description="People in this workspace. You can choose which roles."
        />
        <Choice
          name="visibility"
          value="clients"
          checked={visibility === 'clients'}
          onChange={(x) => setVisibility(x as KnowledgeVisibility)}
          label="The team and clients"
          disabled={!canShareWithClients}
          description={
            canShareWithClients
              ? 'Clients read it under Guides in their portal, once it’s published.'
              : 'Owners, admins and project leads share items with clients.'
          }
        />

        {visibility !== 'private' ? (
          <fieldset className="mt-1 grid gap-3 border-t border-border pt-3">
            <legend className="sr-only">In the team</legend>
            <p className="text-body-sm font-medium">In the team</p>
            <Choice
              name="roleScope"
              value="everyone"
              checked={roleScope === 'everyone'}
              onChange={setRoleScope}
              label="Everyone"
            />
            <Choice
              name="roleScope"
              value="some"
              checked={roleScope === 'some'}
              onChange={setRoleScope}
              label="Only some roles"
              description="Owners and admins always see it."
            />
            {roleScope === 'some' ? (
              <div className="grid gap-2 pl-7 sm:grid-cols-2">
                {ROLES.filter((r) => r !== 'owner' && r !== 'admin').map((r) => (
                  <Checkbox
                    key={r}
                    name="roles"
                    value={r}
                    label={ROLE_LABELS[r]}
                    defaultChecked={roles.has(r)}
                  />
                ))}
                {e.roles ? (
                  <p className="text-body-sm text-danger sm:col-span-2">{e.roles}</p>
                ) : null}
              </div>
            ) : null}
          </fieldset>
        ) : null}

        {visibility === 'clients' ? (
          <fieldset className="grid gap-3 border-t border-border pt-3">
            <legend className="sr-only">Clients</legend>
            <p className="text-body-sm font-medium">Clients</p>
            <Choice
              name="clientScope"
              value="all"
              checked={clientScope === 'all'}
              onChange={setClientScope}
              label="All clients"
              description="Including clients you add later."
            />
            <Choice
              name="clientScope"
              value="some"
              checked={clientScope === 'some'}
              onChange={setClientScope}
              label="Only the clients I pick"
            />
            {clientScope === 'some' ? (
              <div className="grid max-h-56 gap-2 overflow-y-auto pl-7 sm:grid-cols-2">
                {clients.length ? (
                  clients.map((c) => (
                    <Checkbox
                      key={c.id}
                      name="clientIds"
                      value={c.id}
                      label={c.name}
                      defaultChecked={picked.has(c.id)}
                    />
                  ))
                ) : (
                  <p className="text-body-sm text-muted-foreground">No clients yet.</p>
                )}
              </div>
            ) : null}
            {e.clients ? <p className="text-body-sm text-danger">{e.clients}</p> : null}
          </fieldset>
        ) : null}
      </fieldset>

      <div className="flex flex-wrap items-center gap-2">
        <Submit name="status" value="published">
          {item?.status === 'published' ? 'Save' : 'Publish'}
        </Submit>
        <Submit name="status" value="draft" variant="secondary">
          Save as draft
        </Submit>
        <Link href={cancelHref} className={buttonVariants({ variant: 'ghost' })}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
