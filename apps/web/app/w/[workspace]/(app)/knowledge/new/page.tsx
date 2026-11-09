import { PageHeader } from '@agency-os/ui';
import { notFound } from 'next/navigation';
import { ItemForm } from '@/components/knowledge/item-form';
import { knowledge, sharingClients } from '@/lib/data/knowledge';
import { saveItemAction } from '../actions';

export const metadata = { title: 'Add to the knowledge base · Agency OS' };

export default async function NewKnowledgeItem({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ folder?: string }>;
}) {
  const [{ workspace }, { folder }] = await Promise.all([params, searchParams]);
  const base = `/w/${workspace}/knowledge`;
  const [view, clients] = await Promise.all([
    knowledge(workspace, { folderId: null }),
    sharingClients(workspace),
  ]);
  if (!view.rights.add) notFound();
  const inFolder = view.folders.some((f) => f.id === folder) ? folder : null;
  return (
    <div className="grid max-w-3xl gap-2">
      <PageHeader
        title="Add to the knowledge base"
        subtitle="A process, prompt, tool, template or anything your agency should remember"
      />
      <ItemForm
        action={saveItemAction.bind(null, workspace, undefined)}
        folders={view.folders}
        folderId={inFolder}
        clients={clients}
        canShareWithClients={view.rights.manage}
        cancelHref={inFolder ? `${base}/folders/${inFolder}` : base}
      />
    </div>
  );
}
