import { PageHeader } from '@agency-os/ui';
import { TeamTable } from '@/components/workspace/tables';
import { members } from '@/lib/data';

export const metadata = { title: 'Team · Agency OS' };

export default async function TeamPage() {
  const rows = await members();
  return (
    <>
      <PageHeader title="Team" subtitle={`${rows.length} members`} className="mb-4" />
      <TeamTable rows={rows} />
    </>
  );
}
