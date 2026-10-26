import { Card, PageHeader } from '@agency-os/ui';
import {
  DashboardMetrics,
  LeadsBoard,
  RiskTable,
  TeamLoad,
  TodayList,
} from '@/components/workspace/tables';
import { dashboard, leads } from '@/lib/data';

export const metadata = { title: 'Dashboard · Agency OS' };

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  const ws = (p: string) => `/w/${workspace}${p}`;
  const [{ metrics, atRisk, teamLoad, today }, { board }] = await Promise.all([
    dashboard(),
    leads(),
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
          <Card title="Leads pipeline" description="By stage, this quarter">
            <LeadsBoard columns={board.slice(0, 4)} size="sm" />
          </Card>
          <Card title="Projects at risk" description={`${atRisk.length} need attention`} flush>
            <RiskTable rows={atRisk} />
          </Card>
        </div>
        <div className="grid min-w-0 content-start gap-4">
          <Card title="Today">
            <TodayList items={today} href={ws('')} />
          </Card>
          <Card title="Team load" description="Open tasks this week">
            <TeamLoad rows={teamLoad} />
          </Card>
        </div>
      </div>
    </>
  );
}
