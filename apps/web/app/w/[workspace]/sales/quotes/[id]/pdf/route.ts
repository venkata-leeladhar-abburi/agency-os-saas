import { createElement } from 'react';
import { settings } from '@/lib/data';
import { getQuote } from '@/lib/data/sales';
import { QuotePdf } from '@/lib/pdf/quote';
import { pdfBrand, pdfResponse } from '@/lib/pdf/render';
import { canOpenWorkspace, notFoundResponse } from '@/lib/server/access';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ workspace: string; id: string }> },
) {
  const { workspace, id } = await params;
  if (!(await canOpenWorkspace(workspace))) return notFoundResponse();
  const found = await getQuote(id, workspace);
  if (!found) return notFoundResponse();
  const s = await settings(workspace);
  return pdfResponse(
    createElement(QuotePdf, {
      quote: found.quote,
      totals: found.totals,
      settings: s,
      brand: pdfBrand(s),
    }),
    `quote-${found.quote.number}`,
  );
}
