import { ROLE_LABELS, ROLES, scopeOf, type Permission, type Role } from '@agency-os/core';
import { Avatar, Badge, Card, PageHeader } from '@agency-os/ui';
import { planOverview } from '@/lib/data/plan';
import { team } from '@/lib/data/team';
import { InviteActions, InviteForm, RemoveMember, RoleSelect } from './member-panels';

export const metadata = { title: 'Members and roles · Settings · Agency OS' };

/** The areas in the role table, each read from the permission matrix in packages/core. */
const AREAS: {
  label: string;
  read: Permission;
  write: Permission;
  extra?: [Permission, string];
}[] = [
  { label: 'Leads', read: 'leads.read', write: 'leads.write' },
  { label: 'Quotes and proposals', read: 'sales_docs.read', write: 'sales_docs.write' },
  { label: 'Clients', read: 'clients.read', write: 'clients.write' },
  {
    label: 'Projects',
    read: 'projects.read',
    write: 'projects.write',
    extra: ['gates.request', 'ask for sign-off'],
  },
  { label: 'Tasks', read: 'tasks.read', write: 'tasks.write' },
  { label: 'Invoices and payments', read: 'invoices.read', write: 'invoices.write' },
  { label: 'Team', read: 'members.read', write: 'members.write' },
  { label: 'Settings and billing', read: 'workspace.manage', write: 'billing.manage' },
  { label: 'Audit log and export', read: 'audit.read', write: 'data.export' },
];

function access(role: Role, area: (typeof AREAS)[number]): string {
  const write = scopeOf(role, area.write);
  const read = scopeOf(role, area.read);
  const extra = area.extra && scopeOf(role, area.extra[0]) ? `, ${area.extra[1]}` : '';
  if (area.label === 'Settings and billing')
    return [read && 'Settings', write && 'billing'].filter(Boolean).join(' and ') || '—';
  if (area.label === 'Audit log and export')
    return [read && 'Audit log', write && 'export'].filter(Boolean).join(' and ') || '—';
  if (write) return `Edit${write === 'own' ? ' own' : ''}${extra}`;
  if (read) return `View${read === 'own' ? ' own' : ''}`;
  return '—';
}

export default async function MembersPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const [{ members, invites }, plan] = await Promise.all([team(), planOverview()]);
  const seats = plan.rows.find((r) => r.resource === 'members')!;
  return (
    <>
      <PageHeader
        title="Members and roles"
        subtitle={`${seats.used} of ${seats.limit ?? 'unlimited'} members on ${plan.details.name}, counting open invites`}
        className="mb-0"
      />
      <Card
        title="Invite someone"
        description="They get a link to join with the role you pick. It works for 7 days."
      >
        <InviteForm slug={workspace} />
      </Card>
      <Card title="Members" flush>
        <ul className="grid p-0">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center gap-3 border-t border-border px-5 py-3 first:border-t-0"
            >
              <Avatar name={m.name} />
              <span className="grid min-w-0 flex-1">
                <span className="truncate text-body font-medium">
                  {m.name}
                  {m.you ? <span className="font-normal text-muted-foreground"> (you)</span> : null}
                </span>
                <span className="truncate text-caption font-normal text-muted-foreground">
                  {m.email} · {m.title}
                </span>
              </span>
              {m.you ? (
                <Badge>{m.roleLabel}</Badge>
              ) : (
                <>
                  <RoleSelect slug={workspace} memberId={m.id} name={m.name} role={m.role} />
                  <RemoveMember slug={workspace} memberId={m.id} name={m.name} />
                </>
              )}
            </li>
          ))}
        </ul>
      </Card>
      {invites.length ? (
        <Card title="Invites" flush>
          <ul className="grid p-0">
            {invites.map((i) => (
              <li
                key={i.id}
                className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3 first:border-t-0"
              >
                <span className="grid">
                  <span className="text-body font-medium">{i.email}</span>
                  <span className="text-caption font-normal text-muted-foreground">
                    {ROLE_LABELS[i.role]} · sent {i.sent} ·{' '}
                    {i.state === 'expired' ? 'expired' : `expires ${i.expires}`}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <Badge size="sm" tone={i.state === 'expired' ? 'danger' : 'warning'} dot>
                    {i.state === 'expired' ? 'Expired' : 'Invite pending'}
                  </Badge>
                  <InviteActions slug={workspace} id={i.id} />
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      <Card title="What each role can do" flush>
        <div
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be reachable by keyboard (WCAG 2.1.1)
          tabIndex={0}
          role="region"
          aria-label="Roles and permissions"
          className="overflow-x-auto"
        >
          <table className="w-full border-collapse text-body-sm">
            <caption className="sr-only">Roles and permissions</caption>
            <thead>
              <tr className="bg-muted text-caption text-muted-foreground">
                <th scope="col" className="px-3 py-2 text-left font-medium">
                  Area
                </th>
                {ROLES.map((r) => (
                  <th
                    key={r}
                    scope="col"
                    className="px-3 py-2 text-left font-medium whitespace-nowrap"
                  >
                    {ROLE_LABELS[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AREAS.map((a) => (
                <tr key={a.label} className="border-t border-border">
                  <th scope="row" className="px-3 py-2 text-left font-medium">
                    {a.label}
                  </th>
                  {ROLES.map((r) => (
                    <td key={r} className="px-3 py-2 text-muted-foreground">
                      {access(r, a)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
