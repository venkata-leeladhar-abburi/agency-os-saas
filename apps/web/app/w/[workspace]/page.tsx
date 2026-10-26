import { PageHeader } from '@agency-os/ui';
import { TodayList } from '@/components/workspace/tables';
import { Empty } from '@/components/workspace/page-bits';
import { dashboard, EXAMPLE_USER } from '@/lib/data';

export const metadata = { title: 'Today · Agency OS' };

export default async function TodayPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const { today } = await dashboard();
  const first = EXAMPLE_USER.name.split(' ')[0];
  return (
    <>
      <PageHeader
        greeting
        title={`Good morning, ${first}`}
        subtitle={`${today.length} things today`}
        className="mb-4"
      />
      {today.length === 0 ? (
        <Empty
          icon="today"
          title="You’re all caught up"
          text="Follow-ups, tasks, approvals and dues for today appear here."
        />
      ) : (
        <div className="rounded-lg border border-border bg-card p-2">
          <TodayList items={today} href={`/w/${workspace}`} />
        </div>
      )}
    </>
  );
}
