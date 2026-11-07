import { createElement } from 'react';
import { invoiceByPayToken } from '@/lib/data/pay';
import { findByLink, tooManyResponse } from '@/lib/link-guard';
import { InvoicePdf } from '@/lib/pdf/invoice';
import { pdfBrand, pdfResponse } from '@/lib/pdf/render';
import { notFoundResponse } from '@/lib/server/access';

/** The invoice PDF from the pay link: the token is the key, as for the page. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const lookup = await findByLink(() => invoiceByPayToken(token));
  if (!lookup) return notFoundResponse();
  if ('blocked' in lookup) return tooManyResponse();
  const found = lookup.found;
  return pdfResponse(
    createElement(InvoicePdf, { ...found, brand: pdfBrand(found.settings) }),
    found.invoice.number!,
  );
}
