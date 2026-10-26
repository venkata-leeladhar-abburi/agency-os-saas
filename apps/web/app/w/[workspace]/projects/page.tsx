import { PageHeader } from '@agency-os/ui';
import { Empty } from '@/components/workspace/page-bits';
import { ProjectsTable } from '@/components/workspace/tables';
import { projects } from '@/lib/data';

export const metadata = { title: 'Projects · Agency OS' };

export default async function ProjectsPage() {
  const rows = await projects();
  const atRisk = rows.filter((p) => p.health !== 'On track').length;
  return (
    <>
      <PageHeader
        title="Projects"
        subtitle={`${rows.length} active · ${atRisk} need attention`}
        className="mb-4"
      />
      {rows.length === 0 ? (
        <Empty
          icon="projects"
          title="No projects yet"
          text="Start a project from a won lead or a template."
        />
      ) : (
        <ProjectsTable rows={rows} />
      )}
    </>
  );
}
