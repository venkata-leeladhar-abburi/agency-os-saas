import { PageHeader } from '@agency-os/ui';
import { Empty } from '@/components/workspace/page-bits';
import { TodayList } from '@/components/workspace/tables';
import { EXAMPLE_USER, today, type TodayItem } from '@/lib/data';

export const metadata = { title: 'Today · Agency OS' };

const GROUPS: TodayItem['group'][] = ['Follow-ups', 'Approvals waiting', 'Invoices'];

function greeting(now: Date) {
  const hour = Number(
    new Intl.DateTimeFormat('en-IN', {
      hour: 'numeric',
      hourCycle: 'h23',
      timeZone: 'Asia/Kolkata',
    }).format(now),
  );
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

export default async function TodayPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const items = await today(workspace);
  const now = new Date();
  const date = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(now);
  return (
    <>
      <PageHeader
        greeting
        title={`${greeting(now)}, ${EXAMPLE_USER.name.split(' ')[0]}`}
        subtitle={`${date} · ${items.length === 0 ? 'nothing due' : `${items.length} ${items.length === 1 ? 'thing' : 'things'} today`}`}
        className="mb-4"
      />
      {items.length === 0 ? (
        <Empty
          icon="today"
          title="You’re all caught up"
          text="Follow-ups, approvals and invoices due today appear here."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {GROUPS.map((group) => {
            const list = items.filter((i) => i.group === group);
            if (list.length === 0) return null;
            return (
              <section key={group} className="rounded-lg border border-border bg-card">
                <h2 className="border-b border-border bg-muted px-3 py-2 text-caption text-muted-foreground">
                  {group} · {list.length}
                </h2>
                <div className="p-1">
                  <TodayList items={list} />
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
