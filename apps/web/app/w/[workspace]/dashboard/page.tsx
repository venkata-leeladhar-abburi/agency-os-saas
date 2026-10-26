import { ArrowRight } from '@phosphor-icons/react/dist/ssr';
import { Card, PageHeader } from '@agency-os/ui';
import Link from 'next/link';
import {
  DashboardMetrics,
  LeadsBoard,
  RiskTable,
  TeamLoad,
  TodayList,
} from '@/components/workspace/tables';
import { dashboard, leads, today } from '@/lib/data';

export const metadata = { title: 'Dashboard · Agency OS' };

function More({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-body-sm font-medium">
      {children} <ArrowRight size={14} aria-hidden="true" />
    </Link>
  );
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  const ws = (p: string) => `/w/${workspace}${p}`;
  const [{ metrics, atRisk, teamLoad }, { board }, items] = await Promise.all([
    dashboard(),
    leads(),
    today(workspace),
  ]);
  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="How the agency is doing this month"
        className="mb-4"
      />
      <DashboardMetrics metrics={metrics} base={ws('')} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 content-start gap-4">
          <Card
            title="Leads pipeline"
            description="Open leads by stage"
            actions={<More href={ws('/leads')}>Open pipeline</More>}
          >
            <LeadsBoard columns={board.slice(0, 4)} base={ws('/leads')} size="sm" />
          </Card>
          <Card
            title="Projects at risk"
            description={
              atRisk.length ? `${atRisk.length} need attention` : 'All projects on track'
            }
            flush
          >
            {atRisk.length ? (
              <RiskTable rows={atRisk} base={ws('/projects')} />
            ) : (
              <p className="px-5 pb-5 text-body-sm text-muted-foreground">Nothing at risk.</p>
            )}
          </Card>
        </div>
        <div className="grid min-w-0 content-start gap-4">
          <Card title="Today" actions={<More href={ws('')}>Open Today</More>}>
            {items.length ? (
              <TodayList items={items} limit={5} />
            ) : (
              <p className="text-body-sm text-muted-foreground">Nothing due today.</p>
            )}
          </Card>
          <Card title="Team load" description="Open tasks per person">
            <TeamLoad rows={teamLoad} />
          </Card>
        </div>
      </div>
    </>
  );
}
