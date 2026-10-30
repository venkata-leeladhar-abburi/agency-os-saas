import { CheckCircle, ChatCircleDots, CurrencyInr } from '@phosphor-icons/react/dist/ssr';
import { ActivityFeed, Alert, Card, EmptyState, PhaseStepper, Progress } from '@agency-os/ui';
import Link from 'next/link';
import { NeedsYouList } from '@/components/portal/portal-bits';
import { markPortalVisited, portalHome } from '@/lib/data/portal';
import { currentPortal } from '@/lib/portal-session';

export const metadata = { title: 'Your projects' };

export default async function PortalHome({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const session = (await currentPortal(workspace))!;
  const home = (await portalHome(session, workspace))!;
  if (session.firstVisit) await markPortalVisited(session);
  return (
    <>
      <div>
        <p className="text-overline-caps text-muted-foreground">
          {session.company}
          {session.choices.length > 1 ? (
            <>
              {' · '}
              <Link href={`/p/${workspace}/account`} className="normal-case">
                Switch company
              </Link>
            </>
          ) : null}
        </p>
        <h1 className="text-title-xl">Namaste, {session.contact.split(' ')[0]}</h1>
      </div>
      {session.firstVisit ? (
        <Alert tone="brand" title={`Welcome to your projects with ${session.agency}`}>
          Approve work, pay invoices and message the team here. No password needed.
        </Alert>
      ) : null}
      {home.needs.length ? (
        <section aria-labelledby="needs" className="grid gap-2">
          <h2 id="needs" className="text-overline-caps text-muted-foreground">
            Needs you · {home.needs.length}
          </h2>
          <NeedsYouList items={home.needs} />
        </section>
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState compact icon={CheckCircle} title="Nothing needs you right now" as="h2">
            We’ll let you know when there’s something to approve or pay.
          </EmptyState>
        </div>
      )}
      {home.projects.map((p) => (
        <Card key={p.id} title={p.name} as="h2">
          <div className="grid gap-4">
            <PhaseStepper current={p.current} phases={p.phases} compact />
            <Progress value={p.percent} label="Overall" showValue />
            <Link
              href={`/p/${workspace}/projects/${p.id}`}
              className="inline-flex min-h-control-xl items-center text-body-medium"
            >
              Open the project
            </Link>
          </div>
        </Card>
      ))}
      {home.latest.length ? (
        <Card title="Latest" as="h2">
          <ActivityFeed
            items={home.latest.map((x) => ({
              id: x.id,
              icon: x.text.startsWith('paid')
                ? CurrencyInr
                : x.text.startsWith('sent')
                  ? ChatCircleDots
                  : CheckCircle,
              tone:
                x.text.startsWith('approved') || x.text.startsWith('paid') ? 'success' : 'brand',
              who: x.who,
              text: x.text,
              when: x.when,
              dateTime: x.at,
            }))}
          />
        </Card>
      ) : null}
      <Link
        href={`/p/${workspace}/account`}
        className="inline-flex min-h-control-xl items-center justify-self-start text-body-medium"
      >
        Your account
      </Link>
    </>
  );
}
