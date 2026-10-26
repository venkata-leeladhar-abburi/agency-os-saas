import { formatDate } from '@agency-os/core';
import { DownloadSimple } from '@phosphor-icons/react/dist/ssr';
import { Alert, buttonVariants, ExampleBadge } from '@agency-os/ui';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BrandScope } from '@/components/brand/brand';
import { ProposalDocument } from '@/components/sales/proposal-document';
import { exampleMode } from '@/lib/data';
import { proposalByToken } from '@/lib/data/sales';
import { DeclineButton, SignPanel } from './sign-panel';

// Proposal links are private: keep them out of search engines.
export const metadata: Metadata = { title: 'Proposal', robots: { index: false, follow: false } };

export default async function PublicProposalPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const [{ token }, { preview }] = await Promise.all([params, searchParams]);
  const found = await proposalByToken(token, preview !== '1');
  if (!found) notFound();
  const { proposal: p, totals, status, workspace, brand } = found;
  const open = status === 'sent' || status === 'viewed';

  return (
    <BrandScope colour={brand.colour}>
      <main className="mx-auto grid w-full max-w-prose gap-4 px-4 py-8">
        {exampleMode() || preview === '1' ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            {preview === '1' ? (
              <p className="text-body-sm text-muted-foreground">
                Your preview. Views from this page aren’t counted.
              </p>
            ) : (
              <span />
            )}
            {exampleMode() ? <ExampleBadge /> : null}
          </div>
        ) : null}
        {status === 'accepted' && p.signature ? (
          <>
            <Alert
              tone="success"
              title={`You accepted this proposal on ${formatDate(p.signature.at)}`}
            >
              {workspace} has been told and will be in touch to start.
            </Alert>
            <a
              href={`/proposal/${token}/pdf`}
              download
              className={`${buttonVariants({ size: 'lg' })} justify-self-start`}
            >
              <DownloadSimple size={18} aria-hidden="true" />
              Download your signed copy
            </a>
          </>
        ) : null}
        {status === 'declined' ? (
          <Alert tone="info" title="You declined this proposal">
            {workspace} has been told.
          </Alert>
        ) : null}
        {status === 'expired' ? (
          <Alert tone="warning" title={`This proposal expired on ${formatDate(p.validUntil)}`}>
            Ask {workspace} to send an updated one.
          </Alert>
        ) : null}
        <article className="grid gap-4 rounded-xl border border-border bg-card p-6 max-sm:p-4">
          <ProposalDocument
            blocks={p.blocks}
            workspace={workspace}
            logoUrl={brand.logoUrl}
            validUntil={p.validUntil}
            totals={totals}
            forClient
            signSlot={
              open && preview !== '1' ? <SignPanel token={token} email={p.email ?? ''} /> : null
            }
          />
        </article>
        {open && preview !== '1' ? (
          <div className="flex justify-center">
            <DeclineButton token={token} />
          </div>
        ) : null}
      </main>
    </BrandScope>
  );
}
