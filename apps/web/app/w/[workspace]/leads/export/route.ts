import { leadsCsv } from '@/lib/data/lead-import';
import { istDate } from '@/lib/data/views';
import { canOpenWorkspace, notFoundResponse } from '@/lib/server/access';

/** The workspace's leads as CSV, for its members (route handlers don't pass the layout's check). */
export async function GET(_req: Request, { params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  if (!(await canOpenWorkspace(workspace))) return notFoundResponse();
  return new Response(await leadsCsv(workspace), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="leads-${istDate(new Date())}.csv"`,
    },
  });
}
