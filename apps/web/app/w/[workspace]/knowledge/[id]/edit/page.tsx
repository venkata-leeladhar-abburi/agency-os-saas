import { PageHeader } from '@agency-os/ui';
import { notFound } from 'next/navigation';
import { ItemForm } from '@/components/knowledge/item-form';
import { knowledge, knowledgeItem, sharingClients } from '@/lib/data/knowledge';
import { saveItemAction } from '../../actions';

export const metadata = { title: 'Edit item · Agency OS' };

export default async function EditKnowledgeItem({
  params,
}: {
  params: Promise<{ workspace: string; id: string }>;
}) {
  const { workspace, id } = await params;
  const [item, view, clients] = await Promise.all([
    knowledgeItem(id, workspace),
    knowledge(workspace, { folderId: null }),
    sharingClients(workspace),
  ]);
  if (!item || !item.canEdit) notFound();
  return (
    <div className="grid max-w-3xl gap-2">
      <PageHeader title={`Edit “${item.title}”`} />
      <ItemForm
        action={saveItemAction.bind(null, workspace, item.id)}
        item={item}
        folders={view.folders}
        clients={clients}
        canShareWithClients={view.rights.manage}
        cancelHref={`/w/${workspace}/knowledge/${item.id}`}
      />
    </div>
  );
}
