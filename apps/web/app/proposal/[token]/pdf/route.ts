import { createElement } from 'react';
import { settings } from '@/lib/data';
import { proposalByToken, proposalHash } from '@/lib/data/sales';
import { findByLink, tooManyResponse } from '@/lib/link-guard';
import { ProposalPdf } from '@/lib/pdf/proposal';
import { pdfBrand, pdfResponse } from '@/lib/pdf/render';
import { notFoundResponse } from '@/lib/server/access';

/** The client's signed copy, from their proposal link. Only once it's signed. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const lookup = await findByLink(() => proposalByToken(token, false));
  if (!lookup) return notFoundResponse();
  if ('blocked' in lookup) return tooManyResponse();
  const found = lookup.found;
  if (found.status !== 'accepted' || !found.proposal.signature) return notFoundResponse();
  const s = await settings();
  return pdfResponse(
    createElement(ProposalPdf, {
      proposal: found.proposal,
      quote: found.quote,
      totals: found.totals,
      status: found.status,
      settings: s,
      brand: pdfBrand(s),
      currentHash: proposalHash(found.proposal, found.quote),
    }),
    `signed-proposal-${found.quote.number}`,
  );
}
