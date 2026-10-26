import { createElement } from 'react';
import { portalInvoice } from '@/lib/data/portal';
import { InvoicePdf } from '@/lib/pdf/invoice';
import { pdfBrand, pdfResponse } from '@/lib/pdf/render';
import { currentPortal } from '@/lib/portal-session';
import { notFoundResponse } from '@/lib/server/access';

/** The client's copy: only their own issued invoices. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ workspace: string; id: string }> },
) {
  const { workspace, id } = await params;
  const session = await currentPortal(workspace);
  if (!session) return notFoundResponse();
  const found = await portalInvoice(session.clientId, id);
  if (!found) return notFoundResponse();
  return pdfResponse(
    createElement(InvoicePdf, { ...found, brand: pdfBrand(found.settings) }),
    found.invoice.number!,
  );
}
