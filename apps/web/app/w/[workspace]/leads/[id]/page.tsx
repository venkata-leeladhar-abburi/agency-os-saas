import { CalendarBlank, Phone, UsersThree } from '@phosphor-icons/react/dist/ssr';
import { formatMoney, LEAD_SOURCE_LABELS, LOST_REASON_LABELS } from '@agency-os/core';
import {
  Alert,
  Badge,
  Button,
  buttonVariants,
  Card,
  RecordHeader,
  type BadgeProps,
} from '@agency-os/ui';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Activities } from '@/components/workspace/activity';
import { formatPhone } from '@/lib/auth/helpers';
import { Submit } from '@/components/workspace/form-bits';
import { getLead } from '@/lib/data';
import { docsFor } from '@/lib/data/sales';
import { STAGES } from '@/lib/data/types';
import { followUp, istDate, leadTitle, stageName } from '@/lib/data/views';
import { changeStageAction, winLeadAction } from '../actions';
import { FollowUpForm, LostDialog, NoteForm } from './lead-panels';

const TONE: Record<string, BadgeProps['tone']> = {
  new: 'neutral',
  contacted: 'info',
  proposal: 'brand',
  won: 'highlight',
  lost: 'outline',
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const lead = await getLead((await params).id);
  return { title: `${lead ? leadTitle(lead) : 'Lead'} · Agency OS` };
}

export default async function LeadPage({
  params,
}: {
  params: Promise<{ workspace: string; id: string }>;
}) {
  const { workspace, id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();
  const title = leadTitle(lead);
  const docs = await docsFor({ leadId: lead.id }, workspace);
  const f = followUp(lead.followUpAt);
  const open = lead.stage !== 'won' && lead.stage !== 'lost';

  return (
    <div className="grid gap-6">
      <Link href={`/w/${workspace}/leads`} className="text-body-sm text-muted-foreground">
        ← All leads
      </Link>
      <RecordHeader
        title={title}
        avatar
        status={stageName(lead.stage)}
        statusTone={TONE[lead.stage]}
        meta={[
          { icon: UsersThree, text: lead.name },
          ...(f ? [{ icon: CalendarBlank, text: `Follow up: ${f.text}` }] : []),
        ]}
        actions={
          open ? (
            <>
              <Suspense>
                <LostDialog slug={workspace} id={lead.id} name={title} />
              </Suspense>
              <Link
                href={`/w/${workspace}/sales/quotes/new?for=lead:${lead.id}`}
                className={buttonVariants({})}
              >
                Create quote
              </Link>
              <form action={winLeadAction.bind(null, workspace, lead.id)}>
                <Submit variant="highlight" icon="won">
                  Mark as won
                </Submit>
              </form>
            </>
          ) : lead.clientId ? (
            <Link
              href={`/w/${workspace}/clients/${lead.clientId}`}
              className={buttonVariants({ variant: 'primary' })}
            >
              Open client
            </Link>
          ) : null
        }
      />

      {f?.overdue && open ? (
        <Alert tone="warning" title="This follow-up is overdue">
          Call or message {lead.name}, then set the next follow-up.
        </Alert>
      ) : null}
      {lead.stage === 'lost' && lead.lostReason ? (
        <Alert tone="info" title={`Lost: ${LOST_REASON_LABELS[lead.lostReason]}`}>
          Move it back to an open stage if the conversation starts again.
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-4">
          <Card title="Activity">
            <div className="grid gap-4">
              <NoteForm slug={workspace} id={lead.id} />
              <Activities items={lead.activities} />
            </div>
          </Card>
        </div>
        <div className="grid content-start gap-4">
          {docs.length ? (
            <Card title="Quotes and proposals">
              <ul className="grid gap-1 p-0">
                {docs.map((d) => (
                  <li key={d.id}>
                    <Link
                      href={d.href}
                      className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md px-2 py-2 text-foreground no-underline hover:bg-accent"
                    >
                      <span className="grid min-w-0">
                        <span className="truncate font-medium">{d.title}</span>
                        <span className="text-caption font-normal text-muted-foreground">
                          {d.amount} · {d.status}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
          <Card title="Details">
            <dl className="grid grid-cols-[96px_1fr] gap-x-4 gap-y-2 text-body">
              {[
                ['Contact', lead.name],
                ['Email', lead.email ?? '—'],
                ['Phone', lead.phone ? formatPhone(lead.phone) : '—'],
                ['Value', formatMoney(lead.valueMinor, 'INR', { decimals: 0 })],
                ['Service', lead.service],
                ['Source', LEAD_SOURCE_LABELS[lead.source]],
                ['Owner', lead.owner],
              ].map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="min-w-0 break-words">{v}</dd>
                </div>
              ))}
            </dl>
            {lead.notes ? (
              <p className="mt-4 text-body text-muted-foreground">{lead.notes}</p>
            ) : null}
            {lead.phone ? (
              <a
                href={`tel:${lead.phone.replace(/\s/g, '')}`}
                className={`${buttonVariants({ size: 'sm' })} mt-4`}
              >
                <Phone size={16} aria-hidden="true" /> Call
              </a>
            ) : null}
          </Card>
          {open ? (
            <Card title="Next step">
              <div className="grid gap-4">
                <FollowUpForm
                  slug={workspace}
                  id={lead.id}
                  value={lead.followUpAt ? istDate(lead.followUpAt) : ''}
                />
                <form
                  action={changeStageAction.bind(null, workspace, lead.id)}
                  className="grid gap-2"
                >
                  <span className="text-body-sm font-medium">Stage</span>
                  <div className="flex flex-wrap gap-2">
                    {STAGES.filter((s) => s.id !== 'won' && s.id !== 'lost').map((s) => (
                      <Button
                        key={s.id}
                        type="submit"
                        name="stage"
                        value={s.id}
                        size="sm"
                        variant={s.id === lead.stage ? 'primary' : 'secondary'}
                        aria-pressed={s.id === lead.stage}
                      >
                        {s.name}
                      </Button>
                    ))}
                  </div>
                </form>
              </div>
            </Card>
          ) : (
            <Card title="Reopen">
              <form action={changeStageAction.bind(null, workspace, lead.id)}>
                <Button type="submit" name="stage" value="contacted">
                  Move back to Contacted
                </Button>
              </form>
            </Card>
          )}
          <Badge tone="outline" size="sm" className="justify-self-start">
            Added{' '}
            {new Date(lead.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Badge>
        </div>
      </div>
    </div>
  );
}
