import { Plus } from '@phosphor-icons/react/dist/ssr';
import { buttonVariants, PageHeader } from '@agency-os/ui';
import Link from 'next/link';
import { Empty } from '@/components/workspace/page-bits';
import { ProjectsTable } from '@/components/workspace/tables';
import { projects } from '@/lib/data';

export const metadata = { title: 'Projects · Agency OS' };

export default async function ProjectsPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const base = `/w/${workspace}/projects`;
  const rows = await projects(workspace);
  const atRisk = rows.filter((p) => p.health !== 'On track').length;
  return (
    <>
      <PageHeader
        title="Projects"
        subtitle={`${rows.length} active · ${atRisk} need attention`}
        actions={
          <Link href={`${base}/new`} className={buttonVariants({ variant: 'primary' })}>
            <Plus size={16} aria-hidden="true" /> New project
          </Link>
        }
        className="mb-4"
      />
      {rows.length === 0 ? (
        <Empty
          icon="projects"
          title="No projects yet"
          text="Start a project from a won lead or a template."
        />
      ) : (
        <ProjectsTable rows={rows} base={base} />
      )}
    </>
  );
}
