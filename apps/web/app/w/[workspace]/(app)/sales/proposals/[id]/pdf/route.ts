import { createElement } from 'react';
import { getProposal } from '@/lib/data/sales';
import { ProposalPdf } from '@/lib/pdf/proposal';
import { pdfBrand, pdfResponse } from '@/lib/pdf/render';
import { canOpenWorkspace, notFoundResponse } from '@/lib/server/access';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ workspace: string; id: string }> },
) {
  const { workspace, id } = await params;
  if (!(await canOpenWorkspace(workspace))) return notFoundResponse();
  const found = await getProposal(id, workspace);
  if (!found) return notFoundResponse();
  const { proposal, quote, totals, status, settings, hash } = found;
  return pdfResponse(
    createElement(ProposalPdf, {
      proposal,
      quote,
      totals,
      status,
      settings,
      brand: pdfBrand(settings),
      currentHash: hash,
    }),
    `${proposal.signature ? 'signed-' : ''}proposal-${quote.number}`,
  );
}
