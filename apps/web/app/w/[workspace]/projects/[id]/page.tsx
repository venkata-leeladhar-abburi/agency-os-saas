import { CalendarBlank, Plus, UsersThree } from '@phosphor-icons/react/dist/ssr';
import { BLANK_TEMPLATE, formatDate, formatMoney, SEVEN_PHASES } from '@agency-os/core';
import {
  Alert,
  Badge,
  buttonVariants,
  Card,
  GateCard,
  PhaseStepper,
  Progress,
  RecordHeader,
} from '@agency-os/ui';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Thread } from '@/components/portal/portal-bits';
import { Activities } from '@/components/workspace/activity';
import { getProject, projectMessages } from '@/lib/data';
import { tasks } from '@/lib/data/tasks';
import { budgetUsed, relativeInSentence, relativeTime } from '@/lib/data/views';
import { RequestGateForm } from './request-gate';
import { TeamMessageForm } from './team-message';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const found = await getProject((await params).id);
  return { title: `${found?.project.name ?? 'Project'} · Agency OS` };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ workspace: string; id: string }>;
}) {
  const { workspace, id } = await params;
  const found = await getProject(id);
  if (!found) notFound();
  const { project, client, health } = found;
  const template = project.template === 'seven_phases' ? SEVEN_PHASES : BLANK_TEMPLATE;
  const phases = template.phases.map((p) => p.name);
  const gates = template.phases.flatMap((p, i) => (p.gate ? [i] : []));
  const current = template.phases[project.phase];
  const used = budgetUsed(project.usedMinor, project.budgetMinor);
  const projectTasks = await tasks({ projectId: project.id });
  const messages = await projectMessages(project.id);
  const lastDecision = project.gateHistory[0];

  return (
    <div className="grid gap-6">
      <Link href={`/w/${workspace}/projects`} className="text-body-sm text-muted-foreground">
        ← All projects
      </Link>
      <RecordHeader
        title={project.name}
        status={health}
        statusTone={health === 'On track' ? 'success' : health === 'Late' ? 'danger' : 'warning'}
        meta={[
          {
            icon: UsersThree,
            text: <Link href={`/w/${workspace}/clients/${client.id}`}>{client.name}</Link>,
          },
          { icon: CalendarBlank, text: `Due ${formatDate(project.dueOn)}` },
        ]}
      />
      <Card title="Phases">
        <PhaseStepper current={project.phase} phases={phases} gates={gates} />
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Now">
          <p className="text-body font-medium">{current?.name}</p>
          <p className="text-body-sm text-muted-foreground">{current?.clientLine}</p>
        </Card>
        <Card title="Budget">
          <Progress
            value={used}
            tone={used >= 90 ? 'danger' : 'default'}
            label={`${formatMoney(project.usedMinor, 'INR', { decimals: 0 })} of ${formatMoney(project.budgetMinor, 'INR', { decimals: 0 })} used`}
            showValue
          />
        </Card>
        <Card title="Team">
          <p className="text-body">Led by {project.lead}</p>
          <p className="text-body-sm text-muted-foreground">
            Started {formatDate(project.startOn)}
          </p>
        </Card>
      </div>
      {project.gate?.status === 'changes' ? (
        <Card
          title="Client sign-off"
          description={`${lastDecision?.by ?? client.contactName} asked for changes to “${project.gate.title}”.`}
        >
          <div className="grid gap-4">
            {lastDecision?.comment ? (
              <Alert tone="warning" title="What they asked for">
                “{lastDecision.comment}”
              </Alert>
            ) : null}
            <RequestGateForm
              slug={workspace}
              id={project.id}
              approver={client.contactName}
              suggestion={project.gate.title}
            />
          </div>
        </Card>
      ) : project.gate ? (
        <GateCard
          phase={`${current?.name ?? ''} gate`}
          title={project.gate.title}
          status={project.gate.status}
          approver={project.gate.approver}
          when={project.gate.sentAt ? `sent ${relativeInSentence(project.gate.sentAt)}` : undefined}
        />
      ) : current?.gate ? (
        <Card title="Client sign-off" description={`This phase ends with “${current.gate.title}”.`}>
          <RequestGateForm
            slug={workspace}
            id={project.id}
            approver={client.contactName}
            suggestion={current.gate.title}
          />
        </Card>
      ) : (
        <Alert tone="info" title="No sign-off in this phase">
          The next client approval comes in a later phase.
        </Alert>
      )}
      {project.gateHistory.length ? (
        <Card title="Client decisions">
          <ul className="grid gap-2 p-0">
            {project.gateHistory.map((g) => (
              <li key={g.at} className="grid gap-0.5 text-body">
                <span className="font-medium">
                  {g.by} {g.decision === 'approved' ? 'approved' : 'asked for changes'}: {g.title}
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
      <Card
        title="Messages"
        description={`With ${client.contactName}. They read and reply in their portal.`}
        id="messages"
      >
        <div className="grid gap-4">
          <Thread
            you="You"
            messages={messages.map((m) => ({
              id: m.id,
              who: m.who,
              mine: !m.fromClient,
              text: m.text,
              when: relativeTime(m.at),
            }))}
          />
          <TeamMessageForm slug={workspace} id={project.id} />
        </div>
      </Card>
      <Card
        title="Tasks"
        description={
          projectTasks.length
            ? `${projectTasks.filter((t) => t.status !== 'Done').length} open`
            : 'No tasks yet.'
        }
        actions={
          <Link
            href={`/w/${workspace}/tasks/new?project=${project.id}`}
            className={buttonVariants({ size: 'sm' })}
          >
            <Plus size={16} aria-hidden="true" /> Add task
          </Link>
        }
      >
        <ul className="grid gap-1 p-0">
          {projectTasks.map((t) => (
            <li key={t.id}>
              <Link
                href={`/w/${workspace}/tasks/${t.id}`}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md px-2 py-2 text-foreground no-underline hover:bg-accent"
              >
                <span className="min-w-0 truncate font-medium">{t.title}</span>
                <span
                  className={
                    t.overdue ? 'text-body-sm text-danger' : 'text-body-sm text-muted-foreground'
                  }
                >
                  {t.due}
                </span>
                <Badge size="sm" tone={t.status === 'Done' ? 'success' : 'neutral'}>
                  {t.status}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Activity">
        <Activities items={project.activities} />
      </Card>
    </div>
  );
}
