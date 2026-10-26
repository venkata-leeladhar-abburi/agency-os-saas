import { leadsCsv } from '@/lib/data/lead-import';
import { istDate } from '@/lib/data/views';

export async function GET() {
  return new Response(await leadsCsv(), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="leads-${istDate(new Date())}.csv"`,
    },
  });
}
