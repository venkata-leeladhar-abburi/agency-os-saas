import { DownloadSimple, LockSimple } from '@phosphor-icons/react/dist/ssr';
import { buttonVariants, Card, EmptyState, PageHeader } from '@agency-os/ui';
import Link from 'next/link';
import { EXPORTS, exportCounts, type ExportKind } from '@/lib/data/export';

export const metadata = { title: 'Data export · Settings · Agency OS' };

export default async function ExportPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const counts = await exportCounts(workspace);
  const base = `/w/${workspace}/settings/export`;
  if (!counts)
    return (
      <>
        <PageHeader title="Data export" className="mb-0" />
        <div className="rounded-lg border border-border bg-card">
          <EmptyState
            icon={LockSimple}
            title="You don’t have access to data export"
            action={
              <Link href={`/w/${workspace}`} className={buttonVariants({})}>
                Go to Today
              </Link>
            }
          >
            Your role doesn’t include it. Ask an owner or admin to export the data, or to change
            your role.
          </EmptyState>
        </div>
      </>
    );
  return (
    <>
      <PageHeader
        title="Data export"
        subtitle="Your data is yours. Download it any time, on any plan."
        className="mb-0"
      />
      <Card
        title="Everything"
        description="One JSON file with every record, for a backup or moving elsewhere."
      >
        <a href={`${base}/all`} className={buttonVariants({ variant: 'primary' })}>
          <DownloadSimple size={16} aria-hidden="true" /> Download everything (JSON)
        </a>
      </Card>
      <Card
        title="One list at a time"
        description="CSV files that open in Excel or Google Sheets, with ₹ shown correctly."
        flush
      >
        <ul className="grid p-0">
          {(Object.keys(EXPORTS) as ExportKind[]).map((k) => (
            <li
              key={k}
              className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 first:border-t-0"
            >
              <span className="grid">
                <span className="text-body font-medium">{EXPORTS[k]}</span>
                <span className="text-caption font-normal text-muted-foreground">
                  {counts[k]} {counts[k] === 1 ? 'row' : 'rows'}
                </span>
              </span>
              <a href={`${base}/${k}`} className={buttonVariants({ size: 'sm' })}>
                <DownloadSimple size={16} aria-hidden="true" /> Download {EXPORTS[k]} CSV
              </a>
            </li>
          ))}
        </ul>
      </Card>
      <p className="text-body-sm text-muted-foreground">
        Each download is recorded in the audit log.
      </p>
    </>
  );
}
