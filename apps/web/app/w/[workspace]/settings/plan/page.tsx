import { PLAN_DETAILS, type LimitedResource } from '@agency-os/core';
import { Alert, Badge, Card, PageHeader, Progress } from '@agency-os/ui';
import { LimitedActionButton } from '@/components/workspace/limited-action';
import { exampleMode } from '@/lib/data';
import { planOverview, planPrice, planSummary } from '@/lib/data/plan';
import { switchPlanAction } from './actions';

export const metadata = { title: 'Plan and billing · Settings · Agency OS' };

const LABELS: Record<LimitedResource, string> = {
  members: 'Members (with open invites)',
  portal_clients: 'Clients with a portal',
  open_leads: 'Open leads',
  quotes_per_month: 'Quotes this month',
  proposals_per_month: 'Proposals this month',
  invoices_per_month: 'Invoices this month',
};

export default async function PlanPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const o = await planOverview();
  const example = exampleMode();
  return (
    <>
      <PageHeader
        title="Plan and billing"
        subtitle={`You’re on ${o.details.name}`}
        className="mb-0"
      />
      <Card
        title="What you’re using"
        description="Example data doesn’t count. Viewing and exporting are never limited."
      >
        <ul className="grid gap-4 p-0">
          {o.rows.map((r) => (
            <li key={r.resource} className="grid gap-1.5">
              <div className="flex justify-between gap-3 text-body">
                <span>{LABELS[r.resource]}</span>
                <span className="text-muted-foreground tabular-nums">
                  {r.limit === null ? `${r.used} · unlimited` : `${r.used} of ${r.limit}`}
                </span>
              </div>
              {r.limit !== null ? (
                <Progress
                  value={Math.min(100, Math.round((r.used / Math.max(1, r.limit)) * 100))}
                  tone={r.used >= r.limit ? 'danger' : 'default'}
                  aria-label={`${LABELS[r.resource]}: ${r.used} of ${r.limit}`}
                />
              ) : null}
            </li>
          ))}
        </ul>
      </Card>
      {example ? (
        <Alert tone="info" title="Example mode: switching plans is free here">
          Try a plan’s limits without paying. Real plan changes and invoices for Agency OS go
          through Razorpay once it’s connected.
        </Alert>
      ) : (
        <Alert tone="info" title="Paying for a plan isn’t set up yet">
          Plan changes go through Razorpay subscriptions, which aren’t connected yet.
        </Alert>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {o.offered.map((p) => (
          <Card
            key={p.id}
            title={p.name}
            description={planPrice(p.id)}
            actions={p.id === o.plan ? <Badge tone="brand">Your plan</Badge> : undefined}
          >
            <div className="grid gap-3">
              <p className="text-body-sm text-muted-foreground">
                {planSummary(p.id)}
                {PLAN_DETAILS[p.id].limits.invoices_per_month !== null
                  ? ` · ${PLAN_DETAILS[p.id].limits.invoices_per_month} quotes, proposals and invoices a month`
                  : ''}
                {PLAN_DETAILS[p.id].ownBranding
                  ? ' · your own branding'
                  : ' · “Powered by Agency OS” on the portal'}
              </p>
              {p.id !== o.plan && example ? (
                <LimitedActionButton
                  action={switchPlanAction.bind(null, workspace, p.id)}
                  slug={workspace}
                  variant="secondary"
                  size="sm"
                >
                  Switch to {p.name}
                </LimitedActionButton>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
