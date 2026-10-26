import { createElement } from 'react';
import { getInvoice } from '@/lib/data';
import { InvoicePdf } from '@/lib/pdf/invoice';
import { pdfBrand, pdfResponse } from '@/lib/pdf/render';
import { canOpenWorkspace, notFoundResponse } from '@/lib/server/access';

/** The invoice as a PDF, rendered on demand (stored in the `pdfs` bucket once storage is on). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ workspace: string; id: string }> },
) {
  const { workspace, id } = await params;
  if (!(await canOpenWorkspace(workspace))) return notFoundResponse();
  const found = await getInvoice(id);
  if (!found) return notFoundResponse();
  return pdfResponse(
    createElement(InvoicePdf, { ...found, brand: pdfBrand(found.settings) }),
    found.invoice.number ?? `draft-invoice-${found.client.name}`,
  );
}
