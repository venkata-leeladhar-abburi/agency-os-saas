'use client';

import { FolderSimplePlus, PencilSimple } from '@phosphor-icons/react';
import { Button, Dialog, DialogContent, Input, Select, Textarea } from '@agency-os/ui';
import { useActionState, useState } from 'react';
import { FormMessage, Submit } from '@/components/workspace/form-bits';
import { folderPath, folderTree, type KnowledgeFolder } from '@/lib/data/knowledge-types';
import { EMPTY_FORM, type FormState } from '@/lib/form-state';

/** New folder, or edit (and delete) one, in a dialog. */
export function FolderDialog({
  action,
  deleteAction,
  folders,
  folder,
  parentId,
}: {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  deleteAction?: (prev: FormState) => Promise<FormState>;
  folders: KnowledgeFolder[];
  /** The folder being edited; none for a new one. */
  folder?: KnowledgeFolder;
  /** Where a new folder goes. */
  parentId?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, run] = useActionState(action, EMPTY_FORM);
  const [deleted, runDelete] = useActionState(deleteAction ?? (async () => EMPTY_FORM), EMPTY_FORM);
  const v = state.values;
  // A folder can't go inside itself or its own subfolders.
  const below = new Set<string>();
  if (folder)
    for (const f of folderTree(folders))
      if (folderPath(folders, f.id).some((x) => x.id === folder.id)) below.add(f.id);
  const parents = folderTree(folders).filter((f) => !below.has(f.id));
  return (
    <>
      <Button icon={folder ? PencilSimple : FolderSimplePlus} onClick={() => setOpen(true)}>
        {folder ? 'Edit folder' : 'New folder'}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          title={folder ? 'Edit folder' : 'New folder'}
          description="Everyone in the team sees folders; what's in them follows each item's choice."
        >
          <form action={run} className="grid gap-4" noValidate>
            <FormMessage state={state} title="The folder wasn’t saved" />
            <Input
              label="Name"
              name="name"
              required
              maxLength={80}
              defaultValue={v?.name ?? folder?.name}
              error={state.errors?.name}
            />
            <Textarea
              label="Description"
              name="description"
              optional
              rows={2}
              defaultValue={v?.description ?? folder?.description ?? ''}
            />
            <Select
              label="Inside"
              name="parentId"
              defaultValue={v?.parentId ?? folder?.parentId ?? parentId ?? ''}
              options={[
                { value: '', label: 'Top level' },
                ...parents.map((f) => ({
                  value: f.id,
                  label: folderPath(folders, f.id)
                    .map((x) => x.name)
                    .join(' / '),
                })),
              ]}
            />
            <div className="flex flex-wrap justify-end gap-2">
              <Button onClick={() => setOpen(false)}>Cancel</Button>
              <Submit>{folder ? 'Save folder' : 'Create folder'}</Submit>
            </div>
          </form>
          {folder && deleteAction ? (
            <form action={runDelete} className="mt-4 grid gap-2 border-t border-border pt-4">
              <FormMessage state={deleted} title="The folder wasn’t deleted" />
              <p className="text-body-sm text-muted-foreground">
                A folder can be deleted once it&rsquo;s empty.
              </p>
              <div>
                <Submit variant="destructive">Delete folder</Submit>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
