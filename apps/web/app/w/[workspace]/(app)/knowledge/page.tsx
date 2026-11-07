import { Plus } from '@phosphor-icons/react/dist/ssr';
import { buttonVariants, PageHeader } from '@agency-os/ui';
import Link from 'next/link';
import { KnowledgeBrowser } from '@/components/knowledge/browser';
import { FolderDialog } from '@/components/knowledge/folder-dialog';
import { knowledge } from '@/lib/data/knowledge';
import { readQuery } from './query';
import { saveFolderAction } from './actions';

export const metadata = { title: 'Knowledge base · Agency OS' };

export default async function KnowledgePage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ workspace }, sp] = await Promise.all([params, searchParams]);
  const base = `/w/${workspace}/knowledge`;
  const query = readQuery(sp);
  const view = await knowledge(workspace, query);
  const add = view.rights.add ? (
    <Link href={`${base}/new`} className={buttonVariants({ variant: 'primary' })}>
      <Plus size={16} aria-hidden="true" /> Add item
    </Link>
  ) : null;
  return (
    <>
      <PageHeader
        title="Knowledge base"
        subtitle="How your agency works: processes, prompts, tools and templates, and guides for clients"
        actions={
          <>
            {view.rights.manage ? (
              <FolderDialog
                action={saveFolderAction.bind(null, workspace, undefined)}
                folders={view.folders}
              />
            ) : null}
            {add}
          </>
        }
      />
      <KnowledgeBrowser base={base} view={view} folder={null} query={query} actions={add} />
    </>
  );
}
