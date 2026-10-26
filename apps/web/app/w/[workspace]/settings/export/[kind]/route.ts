import { audit } from '@/lib/data/audit';
import { EXPORTS, exportCsv, exportJson, type ExportKind } from '@/lib/data/export';
import { istDate } from '@/lib/data/views';
import { callerIp } from '@/lib/origin';

/** Downloads: /settings/export/leads (CSV) … or /settings/export/all (JSON). */
export async function GET(_req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const day = istDate(new Date());
  if (kind === 'all') {
    audit('data.exported', 'Everything (JSON)', '', await callerIp());
    return new Response(exportJson(), {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'content-disposition': `attachment; filename="agency-os-export-${day}.json"`,
      },
    });
  }
  if (!(kind in EXPORTS)) return new Response('Not found', { status: 404 });
  audit('data.exported', `${EXPORTS[kind as ExportKind]} (CSV)`, '', await callerIp());
  return new Response(exportCsv(kind as ExportKind), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${kind}-${day}.csv"`,
    },
  });
}
