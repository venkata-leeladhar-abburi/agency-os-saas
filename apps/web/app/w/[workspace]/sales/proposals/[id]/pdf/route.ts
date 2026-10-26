import { createElement } from 'react';
import { getProposal, proposalHash } from '@/lib/data/sales';
import { ProposalPdf } from '@/lib/pdf/proposal';
import { pdfBrand, pdfResponse } from '@/lib/pdf/render';
import { canOpenWorkspace, notFoundResponse } from '@/lib/server/access';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ workspace: string; id: string }> },
) {
  const { workspace, id } = await params;
  if (!(await canOpenWorkspace(workspace))) return notFoundResponse();
  const found = await getProposal(id);
  if (!found) return notFoundResponse();
  const { proposal, quote, totals, status, settings } = found;
  return pdfResponse(
    createElement(ProposalPdf, {
      proposal,
      quote,
      totals,
      status,
      settings,
      brand: pdfBrand(settings),
      currentHash: proposalHash(proposal, quote),
    }),
    `${proposal.signature ? 'signed-' : ''}proposal-${quote.number}`,
  );
}
