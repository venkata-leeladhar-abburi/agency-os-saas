import { formatDate } from '@agency-os/core';
import { Alert, Card, PhaseStepper, Progress } from '@agency-os/ui';
import { notFound } from 'next/navigation';
import { GateDecision, PortalMessageForm, Thread } from '@/components/portal/portal-bits';
import { portalProject } from '@/lib/data/portal';
import { relativeTime } from '@/lib/data/views';
import { currentPortal } from '@/lib/portal-session';

export const metadata = { title: 'Your project' };

export default async function PortalProjectPage({
  params,
}: {
  params: Promise<{ workspace: string; id: string }>;
}) {
  const { workspace, id } = await params;
  const session = (await currentPortal(workspace))!;
  const found = await portalProject(session, id);
  if (!found) notFound();
  const { project: p, phases, current, percent, phaseName, messages } = found;
  const now = new Date();
  return (
    <>
      <div>
        <p className="text-overline-caps text-muted-foreground">Now: {phaseName}</p>
        <h1 className="text-title-lg">{p.name}</h1>
      </div>
      <Card title="Progress" as="h2">
        <div className="grid gap-4">
          <PhaseStepper current={current} phases={phases} compact />
          <Progress value={percent} label="Overall" showValue />
        </div>
      </Card>
      {p.gate?.status === 'waiting' ? (
        <GateDecision
          slug={workspace}
          projectId={p.id}
          phase={phaseName}
          title={p.gate.title}
          approver={session.contact}
          when={p.gate.sentAt ? `shared ${formatDate(p.gate.sentAt, { year: false })}` : ''}
          lead={p.lead}
        />
      ) : p.gate?.status === 'changes' ? (
        <Alert tone="info" title={`You asked for changes: ${p.gate.title}`}>
          {p.lead} is working on them and will ask you to approve again.
        </Alert>
      ) : null}
      {p.gateHistory.length ? (
        <Card title="Your approvals" as="h2">
          <ul className="grid gap-2 p-0">
            {p.gateHistory.map((g) => (
              <li key={g.at} className="grid gap-0.5 text-body">
                <span className="font-medium">
                  {g.decision === 'approved' ? 'Approved' : 'Asked for changes'}: {g.title}
                </span>
                <span className="text-caption font-normal text-muted-foreground">
                  {g.phase} · {formatDate(g.at)}
                  {g.comment ? ` · “${g.comment}”` : ''}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      <Card title="Messages" as="h2" id="messages">
        <div className="grid gap-4">
          <Thread
            you="You"
            messages={messages.map((m) => ({
              id: m.id,
              who: m.who,
              mine: m.fromClient,
              text: m.text,
              when: relativeTime(m.at, now),
            }))}
          />
          <PortalMessageForm slug={workspace} projectId={p.id} />
        </div>
      </Card>
    </>
  );
}
