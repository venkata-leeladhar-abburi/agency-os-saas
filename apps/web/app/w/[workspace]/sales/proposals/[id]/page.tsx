import { Eye } from '@phosphor-icons/react/dist/ssr';
import { formatDate, formatMoney, unfilledBlocks } from '@agency-os/core';
import { Alert, Badge, buttonVariants, Card, type BadgeProps } from '@agency-os/ui';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProposalDocument } from '@/components/sales/proposal-document';
import { Activities } from '@/components/workspace/activity';
import { getProposal } from '@/lib/data/sales';
import { PROPOSAL_STATUS_LABELS, relativeTime, type ProposalView } from '@/lib/data/views';
import { siteOrigin } from '@/lib/origin';
import { ProposalTextForm, SendDialog } from './proposal-panels';

const TONE: Record<ProposalView, BadgeProps['tone']> = {
  draft: 'neutral',
  sent: 'info',
  viewed: 'brand',
  accepted: 'success',
  declined: 'danger',
  expired: 'warning',
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const found = await getProposal((await params).id);
  return { title: `${found?.proposal.title ?? 'Proposal'} · Agency OS` };
}

export default async function ProposalPage({
  params,
}: {
  params: Promise<{ workspace: string; id: string }>;
}) {
  const { workspace, id } = await params;
  const found = await getProposal(id);
  if (!found) notFound();
  const { proposal: p, quote, totals, status, settings } = found;
  const ws = (path: string) => `/w/${workspace}${path}`;
  const link = `${await siteOrigin()}/p/${p.token}`;
  const editable = status !== 'accepted' && status !== 'declined';
  const block = <T extends string>(type: T) => p.blocks.find((b) => b.type === type);
  const text = (heading: string) => {
    const b = p.blocks.find((x) => x.type === 'text' && x.heading === heading);
    return b && b.type === 'text' && !b.placeholder ? b.body : '';
  };
  const goals = p.blocks.find((x) => x.type === 'list');
  const scope = block('scope');

  return (
    <div className="grid gap-6">
      <Link href={ws('/sales')} className="text-body-sm text-muted-foreground">
        ← All sales docs
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="flex flex-wrap items-center gap-2 text-title-lg">
            {p.title}
            <Badge tone={TONE[status]} dot>
              {PROPOSAL_STATUS_LABELS[status]}
            </Badge>
          </h1>
          <p className="text-body text-muted-foreground">
            <Link href={ws(`/sales/quotes/${quote.id}`)} className="font-mono">
              {quote.number}
            </Link>{' '}
            · {formatMoney(totals.total.amountMinor, quote.currency)} · valid until{' '}
            {formatDate(p.validUntil)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {p.status !== 'draft' ? (
            <a
              href={`/p/${p.token}?preview=1`}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({})}
            >
              <Eye size={16} aria-hidden="true" /> See the client’s view
            </a>
          ) : null}
          {editable ? (
            <SendDialog
              slug={workspace}
              id={p.id}
              client={quote.recipient}
              email={p.email ?? ''}
              link={link}
              unfilled={unfilledBlocks(p.blocks)}
              resend={p.status !== 'draft'}
            />
          ) : quote.clientId ? (
            <Link
              href={ws(`/clients/${quote.clientId}`)}
              className={buttonVariants({ variant: 'primary' })}
            >
              Open client
            </Link>
          ) : null}
        </div>
      </div>

      {status === 'viewed' && p.lastViewedAt ? (
        <Alert tone="brand" title={`Viewed ${p.views} ${p.views === 1 ? 'time' : 'times'}`}>
          Last opened {relativeTime(p.lastViewedAt).toLowerCase()}. A good moment to follow up.
        </Alert>
      ) : null}
      {status === 'accepted' && p.signature ? (
        <Alert tone="success" title={`Signed by ${p.signature.name}`}>
          {formatDate(p.signature.at)} at{' '}
          {new Intl.DateTimeFormat('en-IN', {
            hour: 'numeric',
            minute: '2-digit',
            timeZone: 'Asia/Kolkata',
          }).format(new Date(p.signature.at))}{' '}
          IST · verified with a code sent to {p.signature.email} · from {p.signature.ip}. The lead
          is now a client.
        </Alert>
      ) : null}
      {status === 'declined' ? (
        <Alert tone="danger" title="The client declined this proposal">
          {p.declineReason ? `Their reason: “${p.declineReason}”.` : 'They didn’t give a reason.'}
        </Alert>
      ) : null}
      {status === 'expired' ? (
        <Alert tone="warning" title="This proposal has expired">
          Send it again to give the client another 14 days.
        </Alert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {editable ? (
          <Card title="Edit" description="Changes show on the client’s link as soon as you save.">
            <ProposalTextForm
              slug={workspace}
              id={p.id}
              values={{
                about: text('About us'),
                goals:
                  goals && goals.type === 'list' && !goals.placeholder
                    ? goals.items.join('\n')
                    : '',
                included: scope && scope.type === 'scope' ? scope.included.join('\n') : '',
                excluded: scope && scope.type === 'scope' ? scope.excluded.join('\n') : '',
                paymentTerms: text('Payment terms'),
                terms: text('Terms'),
              }}
            />
          </Card>
        ) : null}
        <Card title="Preview" className={editable ? undefined : 'xl:col-span-2'}>
          <ProposalDocument
            blocks={p.blocks}
            workspace={settings.name}
            validUntil={p.validUntil}
            totals={totals}
            signSlot={
              <p className="text-body text-muted-foreground">
                The client types their name and enters a code sent to their email to sign.
              </p>
            }
          />
        </Card>
      </div>
      <Card title="Activity">
        <Activities items={p.activities} />
      </Card>
    </div>
  );
}
