import { UserPlus } from '@phosphor-icons/react/dist/ssr';
import { Avatar, Badge, buttonVariants, Card, PageHeader } from '@agency-os/ui';
import Link from 'next/link';
import { dailyUpdates, team } from '@/lib/data/team';
import { DailyUpdateForm } from './daily-update-form';

export const metadata = { title: 'Team · Agency OS' };

export default async function TeamPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const [{ members, invites }, updates] = await Promise.all([team(), dailyUpdates()]);
  return (
    <>
      <PageHeader
        title="Team"
        subtitle={`${members.length} ${members.length === 1 ? 'member' : 'members'} · ${updates.posted.length} ${updates.posted.length === 1 ? 'update' : 'updates'} today`}
        actions={
          <Link
            href={`/w/${workspace}/settings/members`}
            className={buttonVariants({ variant: 'primary' })}
          >
            <UserPlus size={16} aria-hidden="true" /> Invite member
          </Link>
        }
        className="mb-4"
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-4">
          <Card title="Members" flush>
            <ul className="grid p-0">
              {members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-3 border-t border-border px-5 py-3 first:border-t-0"
                >
                  <Avatar name={m.name} />
                  <span className="grid min-w-0 flex-1">
                    <span className="truncate text-body font-medium">{m.name}</span>
                    <span className="truncate text-caption font-normal text-muted-foreground">
                      {m.title} · {m.projects} {m.projects === 1 ? 'project' : 'projects'} ·{' '}
                      {m.openTasks} open {m.openTasks === 1 ? 'task' : 'tasks'}
                    </span>
                  </span>
                  <Badge size="sm">{m.roleLabel}</Badge>
                </li>
              ))}
              {invites.map((i) => (
                <li key={i.id} className="flex items-center gap-3 border-t border-border px-5 py-3">
                  <Avatar name={i.email} />
                  <span className="grid min-w-0 flex-1">
                    <span className="truncate text-body font-medium">{i.email}</span>
                    <span className="text-caption font-normal text-muted-foreground">
                      Invited {i.sent}
                    </span>
                  </span>
                  <Badge size="sm" tone={i.state === 'expired' ? 'danger' : 'warning'} dot>
                    {i.state === 'expired' ? 'Invite expired' : 'Invite pending'}
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>
          <Card
            title="Your update for today"
            description="What you did, what’s next, anything in the way."
          >
            <DailyUpdateForm
              slug={workspace}
              values={{
                done: updates.mine?.done ?? '',
                next: updates.mine?.next ?? '',
                blockers: updates.mine?.blockers ?? '',
              }}
            />
          </Card>
        </div>
        <Card title="Daily updates · today">
          <div className="grid gap-3">
            {updates.posted.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">No updates yet today.</p>
            ) : (
              updates.posted.map((d) => (
                <article key={d.id} className="grid gap-2 rounded-lg border border-border p-3">
                  <header className="flex items-center gap-2">
                    <Avatar name={d.member} size="sm" />
                    <h3 className="text-body-medium">{d.member}</h3>
                  </header>
                  <dl className="grid grid-cols-[72px_1fr] gap-x-3 gap-y-1 text-body-sm">
                    {d.done ? (
                      <>
                        <dt className="text-muted-foreground">Done</dt>
                        <dd>{d.done}</dd>
                      </>
                    ) : null}
                    {d.next ? (
                      <>
                        <dt className="text-muted-foreground">Next</dt>
                        <dd>{d.next}</dd>
                      </>
                    ) : null}
                    {d.blockers ? (
                      <>
                        <dt className="text-muted-foreground">Blockers</dt>
                        <dd className="text-danger">{d.blockers}</dd>
                      </>
                    ) : null}
                  </dl>
                </article>
              ))
            )}
            {updates.waiting.length ? (
              <p className="rounded-lg border border-dashed border-border-strong px-3 py-2 text-body-sm text-muted-foreground">
                Not posted yet: {updates.waiting.join(', ')}
              </p>
            ) : null}
          </div>
        </Card>
      </div>
    </>
  );
}
