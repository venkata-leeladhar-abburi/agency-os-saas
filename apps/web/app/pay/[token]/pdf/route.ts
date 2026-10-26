import { createElement } from 'react';
import { invoiceByPayToken } from '@/lib/data/pay';
import { InvoicePdf } from '@/lib/pdf/invoice';
import { pdfBrand, pdfResponse } from '@/lib/pdf/render';
import { notFoundResponse } from '@/lib/server/access';

/** The invoice PDF from the pay link: the token is the key, as for the page. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const found = await invoiceByPayToken((await params).token);
  if (!found) return notFoundResponse();
  return pdfResponse(
    createElement(InvoicePdf, { ...found, brand: pdfBrand(found.settings) }),
    found.invoice.number!,
  );
}
