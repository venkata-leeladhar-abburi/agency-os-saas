import { audit, recordAudit } from '@/lib/data/audit';
import { exampleMode } from '@/lib/data';
import { EXPORTS, exportCsv, exportJson, type ExportKind } from '@/lib/data/export';
import { istDate } from '@/lib/data/views';
import { callerIp } from '@/lib/origin';
import { canOpenWorkspace, notFoundResponse } from '@/lib/server/access';

/** Downloads: /settings/export/leads (CSV) … or /settings/export/all (JSON). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ workspace: string; kind: string }> },
) {
  const { workspace, kind } = await params;
  if (!(await canOpenWorkspace(workspace))) return notFoundResponse();
  const day = istDate(new Date());
  if (kind === 'all') {
    const json = await exportJson(workspace);
    // Not allowed to export: the same answer as a page that isn't there.
    if (json === null) return notFoundResponse();
    // The database records a JSON export in the audit log itself.
    if (exampleMode()) audit('data.exported', 'Everything (JSON)', '', await callerIp());
    return new Response(json, {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'content-disposition': `attachment; filename="agency-os-export-${day}.json"`,
      },
    });
  }
  if (!(kind in EXPORTS)) return notFoundResponse();
  const csv = await exportCsv(kind as ExportKind, workspace);
  if (csv === null) return notFoundResponse();
  await recordAudit(
    workspace,
    'data.exported',
    `${EXPORTS[kind as ExportKind]} (CSV)`,
    '',
    await callerIp(),
  );
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${kind}-${day}.csv"`,
    },
  });
}
