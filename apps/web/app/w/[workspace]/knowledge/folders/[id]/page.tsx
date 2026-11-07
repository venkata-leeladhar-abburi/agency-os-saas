import { CaretRight, Plus } from '@phosphor-icons/react/dist/ssr';
import { buttonVariants, PageHeader } from '@agency-os/ui';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { KnowledgeBrowser } from '@/components/knowledge/browser';
import { FolderDialog } from '@/components/knowledge/folder-dialog';
import { knowledge } from '@/lib/data/knowledge';
import { folderPath } from '@/lib/data/knowledge-types';
import { deleteFolderAction, saveFolderAction } from '../../actions';
import { readQuery } from '../../query';

export const metadata = { title: 'Knowledge base · Agency OS' };

export default async function KnowledgeFolderPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string; id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ workspace, id }, sp] = await Promise.all([params, searchParams]);
  const base = `/w/${workspace}/knowledge`;
  const query = readQuery(sp);
  const view = await knowledge(workspace, { ...query, folderId: id });
  const folder = view.folders.find((f) => f.id === id);
  if (!folder) notFound();
  const path = folderPath(view.folders, id);
  return (
    <>
      <nav aria-label="Folder path" className="mb-2">
        <ol className="flex flex-wrap items-center gap-1 p-0 text-body-sm text-muted-foreground">
          <li>
            <Link href={base} className="text-muted-foreground">
              Knowledge base
            </Link>
          </li>
          {path.slice(0, -1).map((f) => (
            <li key={f.id} className="flex items-center gap-1">
              <CaretRight size={12} aria-hidden="true" />
              <Link href={`${base}/folders/${f.id}`} className="text-muted-foreground">
                {f.name}
              </Link>
            </li>
          ))}
        </ol>
      </nav>
      <PageHeader
        title={folder.name}
        subtitle={folder.description ?? undefined}
        actions={
          <>
            {view.rights.manage ? (
              <>
                <FolderDialog
                  action={saveFolderAction.bind(null, workspace, folder.id)}
                  deleteAction={deleteFolderAction.bind(
                    null,
                    workspace,
                    folder.id,
                    folder.parentId,
                  )}
                  folders={view.folders}
                  folder={folder}
                />
                <FolderDialog
                  action={saveFolderAction.bind(null, workspace, undefined)}
                  folders={view.folders}
                  parentId={folder.id}
                />
              </>
            ) : null}
            {view.rights.add ? (
              <Link
                href={`${base}/new?folder=${folder.id}`}
                className={buttonVariants({ variant: 'primary' })}
              >
                <Plus size={16} aria-hidden="true" /> Add item
              </Link>
            ) : null}
          </>
        }
      />
      <KnowledgeBrowser base={base} view={view} folder={folder} query={query} />
    </>
  );
}
