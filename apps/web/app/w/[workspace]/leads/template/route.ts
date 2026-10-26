import { IMPORT_TEMPLATE } from '@/lib/data/lead-import';

export function GET() {
  return new Response(IMPORT_TEMPLATE, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="agency-os-leads-template.csv"',
    },
  });
}
