import { CalendarBlank, Plus, Receipt, UsersThree } from '@phosphor-icons/react/dist/ssr';
import { formatDate, formatMoney } from '@agency-os/core';
import { Alert, Badge, buttonVariants, Card, RecordHeader, type BadgeProps } from '@agency-os/ui';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LimitedActionButton } from '@/components/workspace/limited-action';
import { formatPhone } from '@/lib/auth/helpers';
import { exampleMode, getClient } from '@/lib/data';
import { inviteToPortalAction } from '../actions';

const PORTAL: Record<string, { text: string; tone: BadgeProps['tone'] }> = {
  active: { text: 'Portal active', tone: 'success' },
  invited: { text: 'Portal invite sent', tone: 'warning' },
  not_invited: { text: 'Not on the portal', tone: 'neutral' },
};

const STATUS_TONE: Record<string, BadgeProps['tone']> = {
  draft: 'neutral',
  due: 'warning',
  overdue: 'danger',
  paid: 'success',
  partially_paid: 'info',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ workspace: string; id: string }>;
}) {
  const { workspace, id } = await params;
  const found = await getClient(id, workspace);
  return { title: `${found?.client.name ?? 'Client'} · Agency OS` };
}

export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string; id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const [{ workspace, id }, { from }] = await Promise.all([params, searchParams]);
  const found = await getClient(id, workspace);
  if (!found) notFound();
  const { client, money, projects, invoices } = found;
  const ws = (p: string) => `/w/${workspace}${p}`;
  const portal = PORTAL[client.portal]!;
  const example = exampleMode();

  return (
    <div className="grid gap-6">
      <Link href={ws('/clients')} className="text-body-sm text-muted-foreground">
        ← All clients
      </Link>
      <RecordHeader
        title={client.name}
        avatar
        status={portal.text}
        statusTone={portal.tone}
        meta={[
          { icon: UsersThree, text: client.contactName },
          {
            icon: CalendarBlank,
            text: `Client since ${formatDate(client.createdAt, { year: true })}`,
          },
        ]}
        actions={
          <>
            {example && client.portal !== 'not_invited' ? (
              <a
                href={`/p/${workspace}/as/${client.id}`}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({})}
              >
                See their portal
              </a>
            ) : null}
            <Link
              href={`${ws('/invoices/new')}?client=${client.id}`}
              className={buttonVariants({})}
            >
              <Receipt size={16} aria-hidden="true" /> New invoice
            </Link>
            <Link
              href={`${ws('/projects/new')}?client=${client.id}`}
              className={buttonVariants({ variant: 'primary' })}
            >
              <Plus size={16} aria-hidden="true" /> New project
            </Link>
          </>
        }
      />
      {from === 'lead' ? (
        <Alert tone="success" title={`${client.name} is now a client`}>
          The lead is marked won. Start their project when you’re ready.
        </Alert>
      ) : null}
      {client.portal === 'not_invited' && client.email ? (
        <Alert
          tone="info"
          title="Invite them to the client portal"
          action={
            <LimitedActionButton
              action={inviteToPortalAction.bind(null, workspace, client.id)}
              slug={workspace}
              size="sm"
              variant="secondary"
              icon="invite"
            >
              Send invite
            </LimitedActionButton>
          }
        >
          They approve work, pay invoices and message you there. No password needed.
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Contact">
          <dl className="grid grid-cols-[72px_1fr] gap-x-3 gap-y-1.5 text-body-sm">
            <dt className="text-muted-foreground">Name</dt>
            <dd>{client.contactName}</dd>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="break-words">{client.email ?? '—'}</dd>
            <dt className="text-muted-foreground">Phone</dt>
            <dd>{client.phone ? formatPhone(client.phone) : '—'}</dd>
            <dt className="text-muted-foreground">City</dt>
            <dd>{client.city ?? '—'}</dd>
          </dl>
        </Card>
        <Card title="Billing">
          <dl className="grid grid-cols-[72px_1fr] gap-x-3 gap-y-1.5 text-body-sm">
            <dt className="text-muted-foreground">GSTIN</dt>
            <dd className="font-mono text-mono-sm">{client.gstin ?? '—'}</dd>
            <dt className="text-muted-foreground">State</dt>
            <dd>
              {client.country === 'IN' ? (client.stateCode ?? '—') : 'Outside India · export'}
            </dd>
            <dt className="text-muted-foreground">Currency</dt>
            <dd>{client.currency}</dd>
          </dl>
        </Card>
        <Card title="Money">
          <dl className="grid gap-2 text-body">
            {[
              ['Invoiced', money.billed],
              ['Outstanding', money.outstanding],
              ['In drafts', money.drafts],
            ].map(([k, v]) => (
              <div key={k as string} className="flex justify-between">
                <dt className="text-muted-foreground">{k as string}</dt>
                <dd className="tabular-nums">{formatMoney(v as bigint, client.currency)}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Projects" description={projects.length ? undefined : 'No projects yet.'}>
          <ul className="grid gap-1 p-0">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={ws(`/projects/${p.id}`)}
                  className="flex items-center justify-between gap-3 rounded-md px-2 py-2 text-foreground no-underline hover:bg-accent"
                >
                  <span className="font-medium">{p.name}</span>
                  <Badge
                    size="sm"
                    dot
                    tone={
                      p.health === 'On track'
                        ? 'success'
                        : p.health === 'Late'
                          ? 'danger'
                          : 'warning'
                    }
                  >
                    {p.health}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Invoices" description={invoices.length ? undefined : 'No invoices yet.'}>
          <ul className="grid gap-1 p-0">
            {invoices.map((i) => (
              <li key={i.id}>
                <Link
                  href={ws(`/invoices/${i.id}`)}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md px-2 py-2 text-foreground no-underline hover:bg-accent"
                >
                  <span className="font-mono text-mono-sm">{i.number}</span>
                  <span className="tabular-nums">{i.amount}</span>
                  <Badge size="sm" dot tone={STATUS_TONE[i.status]}>
                    {i.statusText}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      {client.notes ? (
        <Card title="Notes">
          <p className="text-body">{client.notes}</p>
        </Card>
      ) : null}
    </div>
  );
}
