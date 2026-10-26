'use client';

import {
  CalendarBlank,
  ChatCircleDots,
  CheckSquareOffset,
  Flag,
  FolderSimple,
  Kanban,
  ListBullets,
  Paperclip,
  Plus,
  UploadSimple,
  UsersThree,
} from '@phosphor-icons/react';
import { SEVEN_PHASES } from '@agency-os/core';
import {
  ActivityFeed,
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  DialogContent,
  GateCard,
  Input,
  PageHeader,
  PhaseStepper,
  Progress,
  RecordHeader,
  Segmented,
  Select,
  Sheet,
  SheetContent,
  TabLinks,
  Textarea,
  DEFAULT_PHASES,
} from '@agency-os/ui';
import { Go, List, Row, StateView } from './kit';
import {
  DailyUpdate,
  FileList,
  MessageThread,
  ProjectsTable,
  TaskBoard,
  TaskCalendar,
  TaskTable,
  TeamTable,
} from './parts2';
import { NO_EMPTY, STANDARD, type ScreenDef } from './types';

const projectTabs = (active: string) => (
  <TabLinks
    label="Project"
    items={[
      { href: '/prototype/s26-project-overview', label: 'Overview', active: active === 'overview' },
      {
        href: '/prototype/s27-phases',
        label: 'Phases and gates',
        count: 7,
        active: active === 'phases',
      },
      { href: '/prototype/s28-tasks', label: 'Tasks', count: 24, active: active === 'tasks' },
      { href: '/prototype/s30-files', label: 'Files', active: active === 'files' },
      { href: '/prototype/s31-messages', label: 'Messages', active: active === 'messages' },
      {
        href: '/prototype/s32-invoices',
        label: 'Invoices',
        count: 2,
        active: active === 'invoices',
      },
    ]}
  />
);

const PROJECT_ACTIVITY = [
  {
    id: 'a1',
    icon: UploadSimple,
    tone: 'brand' as const,
    who: 'Ananya',
    text: 'shared Homepage v3.fig with the client',
    when: '23 Oct',
  },
  {
    id: 'a2',
    icon: Flag,
    tone: 'warning' as const,
    who: 'Ananya',
    text: 'asked Srinivas to approve the homepage design',
    when: '23 Oct',
  },
  {
    id: 'a3',
    icon: CheckSquareOffset,
    tone: 'success' as const,
    who: 'Arjun',
    text: 'finished Prepare staging',
    when: '22 Oct',
  },
];

const GATE_HISTORY = [
  {
    id: 'g1',
    icon: Flag,
    tone: 'warning' as const,
    who: 'Ananya',
    text: 'sent Design sign-off to Srinivas Beere',
    when: '23 Oct',
  },
  {
    id: 'g2',
    icon: CheckSquareOffset,
    tone: 'success' as const,
    who: 'Srinivas Beere',
    text: 'approved Strategy and scope',
    when: '14 Oct',
  },
  {
    id: 'g3',
    icon: CheckSquareOffset,
    tone: 'success' as const,
    who: 'Srinivas Beere',
    text: 'accepted the proposal (signed)',
    when: '1 Oct',
  },
];

const PHASE_LINES = [
  'We learn your business and agree the plan. Signed proposal.',
  'Skipped for this project: the client shared their own research.',
  'Personas, user flows, sitemap and scope. Approved 14 Oct.',
  '',
  'Weekly demos on staging, QA on browsers and phones.',
  'Deploy, accounts in the client’s name, training video.',
  'Monthly report, updates and backups.',
];

/** The Design phase's checklist from the Seven phases template; the first 6 are done. */
const DESIGN_CHECKLIST = SEVEN_PHASES.phases[3]?.checklist ?? [];
const DESIGN_DONE = 6;

const PROJECT_HEADER = (actions: React.ReactNode) => (
  <RecordHeader
    title="Acme Labs website"
    icon={FolderSimple}
    status="At risk"
    statusTone="danger"
    meta={[
      { icon: UsersThree, text: 'Acme Labs · lead Ananya Iyer' },
      { icon: CalendarBlank, text: '1 Oct to 20 Dec 2026' },
    ]}
    actions={actions}
  />
);

export const DELIVER_SCREENS: ScreenDef[] = [
  {
    id: 'S24',
    slug: 's24-projects',
    name: 'Projects list',
    release: 'R1',
    priority: 'P1',
    who: 'Owner, project lead',
    frame: 'app',
    role: 'owner',
    active: 'projects',
    crumbs: ['Projects'],
    pagePrimary: true,
    purpose: 'Which projects are on track. Primary: New project.',
    states: STANDARD,
    render: ({ state }) => (
      <>
        <PageHeader
          title="Projects"
          subtitle="9 active · 2 at risk"
          actions={
            <Go to="s25-new-project" variant="primary" icon={Plus}>
              New project
            </Go>
          }
        />
        <StateView
          state={state}
          copy={{
            empty: {
              title: 'No projects yet',
              text: 'Start one from the seven-phase template or a blank project.',
              action: 'New project',
              icon: FolderSimple,
            },
            area: 'Projects',
          }}
        >
          <div className="mb-3 flex flex-wrap gap-2">
            <Button size="sm">Status: Active</Button>
            <Button size="sm">Lead: Anyone</Button>
            <Button size="sm">Health: All</Button>
          </div>
          <ProjectsTable />
        </StateView>
      </>
    ),
  },
  {
    id: 'S25',
    slug: 's25-new-project',
    name: 'New project',
    release: 'R1',
    priority: 'P1',
    who: 'Owner, project lead',
    frame: 'app',
    role: 'owner',
    active: 'projects',
    crumbs: ['Projects', 'New project'],
    pagePrimary: true,
    purpose: 'Start from the usual process in under three minutes. Primary: Create project.',
    states: [
      { id: 'default', label: 'Default' },
      { id: 'error', label: 'Validation' },
    ],
    render: ({ state }) => (
      <div className="mx-auto grid max-w-3xl gap-6">
        <PageHeader title="New project" className="mb-0" />
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="mb-2 text-title-sm">Template</legend>
          <label className="grid cursor-pointer gap-1 rounded-lg border-2 border-primary bg-card p-4">
            <span className="flex items-center gap-2 text-body font-semibold">
              <input type="radio" name="template" defaultChecked className="accent-(--primary)" />{' '}
              Seven phases
              <Badge size="sm" tone="brand">
                Default
              </Badge>
            </span>
            <span className="text-body-sm text-muted-foreground">
              Connect, Discover, Define, Design, Build, Launch, Grow, with five client sign-offs.
            </span>
          </label>
          <label className="grid cursor-pointer gap-1 rounded-lg border border-border bg-card p-4">
            <span className="flex items-center gap-2 text-body font-semibold">
              <input type="radio" name="template" className="accent-(--primary)" /> Blank
            </span>
            <span className="text-body-sm text-muted-foreground">
              One phase, no sign-offs. Add your own.
            </span>
          </label>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Project name"
            required
            defaultValue={state === 'error' ? '' : 'Kite & Co website'}
            error={state === 'error' ? 'Give the project a name.' : undefined}
          />
          <Select label="Client" options={['Kite & Co', 'Acme Labs']} defaultValue="Kite & Co" />
          <Select label="Type" options={['One-off', 'Retainer']} defaultValue="One-off" />
          <Input label="Budget" prefix="₹" defaultValue="80,000" />
          <Input label="Start" defaultValue="2 Nov 2026" />
          <Input label="Due" defaultValue="20 Dec 2026" />
          <Select
            label="Project lead"
            options={['Ananya Iyer', 'Kiran Rao']}
            defaultValue="Ananya Iyer"
          />
          <Input label="Members" optional placeholder="Arjun Mehta, Meera Pillai" />
        </div>
        <div className="flex justify-end gap-2">
          <Button>Cancel</Button>
          <Go to="s26-project-overview" variant="primary">
            Create project
          </Go>
        </div>
      </div>
    ),
  },
  {
    id: 'S26',
    slug: 's26-project-overview',
    name: 'Project overview',
    release: 'R1',
    priority: 'P1',
    who: 'Owner, project lead, member',
    frame: 'app',
    role: 'owner',
    active: 'projects',
    crumbs: ['Projects', 'Acme Labs website'],
    pagePrimary: true,
    purpose:
      'Is this project healthy and what’s the next gate. Primary: Request approval (when a gate is ready).',
    states: NO_EMPTY,
    render: ({ state }) => (
      <StateView state={state} copy={{ area: 'this project' }}>
        <div className="grid gap-6">
          {PROJECT_HEADER(
            <>
              <Button icon={ChatCircleDots}>Message client</Button>
              <Go to="s27-phases" state="request" variant="primary">
                Request approval
              </Go>
            </>,
          )}
          {projectTabs('overview')}
          <Card title="Phases">
            <PhaseStepper current={3} />
          </Card>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card title="Health">
              <Alert tone="danger" title="Design gate 2 days late">
                Waiting for the client since 23 Oct.
              </Alert>
            </Card>
            <Card title="Budget">
              <Progress value={62} label="₹49,600 of ₹80,000 used" showValue />
            </Card>
            <Card title="Tasks">
              <dl className="grid gap-2 text-body">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Open</dt>
                  <dd className="tabular-nums">14</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Due this week</dt>
                  <dd className="tabular-nums">5</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Overdue</dt>
                  <dd className="text-danger tabular-nums">1</dd>
                </div>
              </dl>
            </Card>
          </div>
          <GateCard
            phase="Design gate"
            title="Approve the homepage design"
            status="waiting"
            approver="Srinivas Beere"
            when="sent 2 days ago"
            files={['Homepage v3.fig', 'Mobile.pdf']}
          />
          <Card title="Activity">
            <ActivityFeed items={PROJECT_ACTIVITY} />
          </Card>
        </div>
      </StateView>
    ),
  },
  {
    id: 'S27',
    slug: 's27-phases',
    name: 'Phases and gates',
    release: 'R1',
    priority: 'P1',
    who: 'Owner, project lead',
    frame: 'app',
    role: 'lead',
    active: 'approvals',
    crumbs: ['Projects', 'Acme Labs website', 'Phases and gates'],
    pagePrimary: true,
    purpose: 'Run the project phase by phase; send a gate for sign-off. Primary: Request approval.',
    states: [...NO_EMPTY, { id: 'request', label: 'Request approval dialog' }],
    render: ({ state }) => (
      <StateView state={state} copy={{ area: 'this project' }}>
        <div className="grid gap-6">
          {PROJECT_HEADER(
            <Go to="s27-phases" state="request" variant="primary">
              Request approval
            </Go>,
          )}
          {projectTabs('phases')}
          <ol className="grid gap-3 p-0">
            {DEFAULT_PHASES.map((phase, i) => (
              <li key={phase}>
                <Card
                  title={`${i + 1}. ${phase}`}
                  description={
                    i === 1
                      ? 'Skipped'
                      : i < 3
                        ? 'Done'
                        : i === 3
                          ? `In progress · ${DESIGN_DONE} of ${DESIGN_CHECKLIST.length} checklist items`
                          : i === 4
                            ? 'Not started · starts once Design sign-off is approved'
                            : 'Not started'
                  }
                  actions={
                    i === 1 ? (
                      <Badge size="sm">Skipped</Badge>
                    ) : [0, 2, 3, 4, 5].includes(i) ? (
                      <Badge
                        size="sm"
                        tone={i < 3 ? 'success' : i === 3 ? 'warning' : 'neutral'}
                        dot
                      >
                        {i < 3 ? 'Approved' : i === 3 ? 'Waiting for client' : 'Gate'}
                      </Badge>
                    ) : null
                  }
                >
                  {i === 3 ? (
                    <ul className="grid gap-2 p-0">
                      {DESIGN_CHECKLIST.map((label, k) => (
                        <li key={label}>
                          <Checkbox label={label} defaultChecked={k < DESIGN_DONE} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-body-sm text-muted-foreground">{PHASE_LINES[i]}</p>
                  )}
                </Card>
              </li>
            ))}
          </ol>
          <Card title="Gate history">
            <ActivityFeed items={GATE_HISTORY} />
          </Card>
        </div>
        {state === 'request' ? (
          <Dialog defaultOpen>
            <DialogContent
              title="Ask Srinivas to approve the design"
              description="He gets an email and sees it on the portal home."
              footer={
                <>
                  <Button>Cancel</Button>
                  <Go to="s27-phases" variant="primary">
                    Send for approval
                  </Go>
                </>
              }
            >
              <div className="grid gap-4">
                <Input label="What to approve" defaultValue="Approve the homepage design" />
                <Select
                  label="Who approves"
                  options={['Srinivas Beere (client)', 'Kiran Rao (internal)']}
                  defaultValue="Srinivas Beere (client)"
                  hint="A client sign-off is approved in the portal. The next phase can’t finish until it is."
                />
                <Textarea
                  label="Message"
                  defaultValue="Desktop and phone versions are ready, with the Telugu headline you asked for."
                />
                <div className="grid gap-1.5">
                  <span className="text-body-sm font-medium">Files</span>
                  <span className="flex flex-wrap gap-1.5">
                    {['Homepage v3.fig', 'Mobile.pdf'].map((f) => (
                      <Badge key={f} tone="outline" icon={Paperclip}>
                        {f}
                      </Badge>
                    ))}
                    <Button size="sm" variant="ghost" icon={Plus}>
                      Attach
                    </Button>
                  </span>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        ) : null}
      </StateView>
    ),
  },
  {
    id: 'S28',
    slug: 's28-tasks',
    name: 'Tasks: board, list, calendar',
    release: 'R1',
    priority: 'P1',
    who: 'Project lead, member',
    frame: 'app',
    role: 'lead',
    active: 'tasks',
    crumbs: ['Tasks'],
    pagePrimary: true,
    purpose: 'Plan and move the work. Primary: Add task.',
    states: [
      ...STANDARD,
      { id: 'list', label: 'List view' },
      { id: 'calendar', label: 'Calendar view' },
    ],
    render: ({ state }) => (
      <>
        <PageHeader
          title="Tasks"
          subtitle="24 open · 3 due today"
          actions={
            <>
              <Segmented
                label="View"
                defaultValue={
                  state === 'list' ? 'list' : state === 'calendar' ? 'calendar' : 'board'
                }
                items={[
                  { value: 'board', label: 'Board', icon: Kanban },
                  { value: 'list', label: 'List', icon: ListBullets },
                  { value: 'calendar', label: 'Calendar', icon: CalendarBlank },
                ]}
              />
              <Button variant="primary" icon={Plus}>
                Add task
              </Button>
            </>
          }
        />
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Input
            aria-label="Quick add a task"
            placeholder="Quick add: Homepage copy @Ananya Fri"
            containerClassName="w-full max-w-md"
          />
          <Button size="sm">Mine</Button>
          <Button size="sm">Project: All</Button>
          <Button size="sm">Due: This week</Button>
        </div>
        <StateView
          state={state}
          copy={{
            empty: {
              title: 'Nothing due',
              text: 'Tasks assigned to you show up here.',
              icon: CheckSquareOffset,
            },
            area: 'Tasks',
          }}
        >
          {state === 'list' ? (
            <TaskTable />
          ) : state === 'calendar' ? (
            <TaskCalendar />
          ) : (
            <TaskBoard />
          )}
        </StateView>
      </>
    ),
  },
  {
    id: 'S29',
    slug: 's29-task-detail',
    name: 'Task detail',
    release: 'R1',
    priority: 'P1',
    who: 'Project lead, member',
    frame: 'app',
    role: 'member',
    active: 'tasks',
    crumbs: ['My tasks', 'Homepage hero copy'],
    purpose: 'Everything about one task without leaving the board. Primary: Mark done.',
    states: [{ id: 'default', label: 'Default' }],
    render: () => (
      <>
        <TaskBoard />
        <Sheet defaultOpen modal={false}>
          <SheetContent
            title="Homepage hero copy"
            description="Acme Labs website · Design"
            footer={
              <>
                <Button>Add comment</Button>
                <Go to="s28-tasks" variant="primary">
                  Mark done
                </Go>
              </>
            }
          >
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Assignee"
                  options={['Ananya Iyer', 'Arjun Mehta']}
                  defaultValue="Ananya Iyer"
                />
                <Input label="Due" defaultValue="Fri 30 Oct" />
                <Select label="Priority" options={['Low', 'Normal', 'High']} defaultValue="High" />
                <Select label="Phase" options={DEFAULT_PHASES} defaultValue="Design" />
              </div>
              <Textarea
                label="Description"
                defaultValue="Two options for the headline, one in Telugu."
              />
              <fieldset className="grid gap-2">
                <legend className="mb-1 text-body-sm font-medium">Subtasks</legend>
                <Checkbox label="Draft English headline" defaultChecked />
                <Checkbox label="Telugu translation" />
              </fieldset>
              <div className="grid gap-1.5">
                <span className="text-body-sm font-medium">Files</span>
                <Badge tone="outline" icon={Paperclip} className="justify-self-start">
                  Headline options.pdf
                </Badge>
              </div>
              <div className="grid gap-3">
                <span className="text-body-sm font-medium">Comments</span>
                <ActivityFeed
                  items={[
                    {
                      id: 'c1',
                      icon: ChatCircleDots,
                      who: 'Kiran',
                      text: '@Ananya can we keep it under 8 words?',
                      when: 'Yesterday',
                    },
                    {
                      id: 'c2',
                      icon: ChatCircleDots,
                      tone: 'brand',
                      who: 'Ananya',
                      text: 'Yes, both options are 7 words.',
                      when: 'Today',
                    },
                  ]}
                />
                <Textarea
                  aria-label="Write a comment"
                  placeholder="Write a comment, @ to mention"
                  rows={2}
                />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </>
    ),
  },
  {
    id: 'S30',
    slug: 's30-files',
    name: 'Project files',
    release: 'R1',
    priority: 'P2',
    who: 'Everyone on the project',
    frame: 'app',
    role: 'lead',
    active: 'projects',
    crumbs: ['Projects', 'Acme Labs website', 'Files'],
    pagePrimary: true,
    purpose: 'Share files with the team and the client. Primary: Upload files.',
    states: [...STANDARD, { id: 'uploading', label: 'Uploading' }],
    render: ({ state }) => (
      <div className="grid gap-6">
        {PROJECT_HEADER(
          <Button variant="primary" icon={UploadSimple}>
            Upload files
          </Button>,
        )}
        {projectTabs('files')}
        <StateView
          state={state}
          copy={{
            empty: {
              title: 'No files yet',
              text: 'Upload designs, documents and assets. Choose which ones the client sees.',
              action: 'Upload files',
              icon: UploadSimple,
            },
            area: 'files',
          }}
        >
          {state === 'uploading' ? (
            <Progress value={64} label="Uploading Homepage v4.fig (16 of 25 MB)" showValue />
          ) : null}
          <div className="flex flex-wrap items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border-strong bg-card px-4 py-6 text-body text-muted-foreground">
            <UploadSimple size={20} aria-hidden="true" />
            Drop files here, up to 25 MB each
            <Button size="sm">Choose files</Button>
          </div>
          <FileList />
        </StateView>
      </div>
    ),
  },
  {
    id: 'S31',
    slug: 's31-messages',
    name: 'Messages',
    release: 'R1',
    priority: 'P1',
    who: 'Agency team and client',
    frame: 'app',
    role: 'lead',
    active: 'messages',
    crumbs: ['Messages', 'Acme Labs website'],
    purpose: 'One thread per project with the client. Primary: Send.',
    states: STANDARD,
    render: ({ state }) => (
      <StateView
        state={state}
        copy={{
          empty: {
            title: 'No messages yet',
            text: 'Start the conversation with Acme Labs. They get an email and see it on their portal.',
            icon: ChatCircleDots,
          },
          area: 'Messages',
        }}
      >
        <div className="grid h-[calc(100dvh-160px)] min-h-120 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <List label="Projects">
            <Row
              label="Acme Labs website"
              meta="Srinivas: Looks good…"
              right={
                <Badge size="sm" tone="brand">
                  2
                </Badge>
              }
            />
            <Row label="Northwind mobile app" meta="You: Staging is ready" />
            <Row label="Mitra Clinic booking app" meta="Meera: Content by Fri?" />
          </List>
          <section
            aria-label="Acme Labs website"
            className="flex min-h-0 flex-col rounded-lg border border-border bg-card"
          >
            <div className="flex-1 overflow-y-auto p-4">
              <MessageThread />
            </div>
            <form className="flex items-end gap-2 border-t border-border p-3">
              <Button aria-label="Attach a file" icon={Paperclip} />
              <Textarea
                aria-label="Message"
                rows={1}
                containerClassName="flex-1"
                placeholder="Write to Srinivas"
              />
              <Button variant="primary">Send</Button>
            </form>
          </section>
        </div>
      </StateView>
    ),
  },
  {
    id: 'S36',
    slug: 's36-team',
    name: 'Team and daily updates',
    release: 'R1',
    priority: 'P2',
    who: 'Owner, project lead',
    frame: 'app',
    role: 'owner',
    active: 'team',
    crumbs: ['Team'],
    pagePrimary: true,
    purpose: 'Who is on what and how today went. Primary: Invite member.',
    states: STANDARD,
    render: ({ state }) => (
      <>
        <PageHeader
          title="Team"
          subtitle="4 members · 3 updates today"
          actions={
            <Button variant="primary" icon={Plus}>
              Invite member
            </Button>
          }
        />
        <StateView
          state={state}
          copy={{
            empty: {
              title: 'Only you so far',
              text: 'Invite your team to share projects, tasks and daily updates.',
              action: 'Invite member',
              icon: UsersThree,
            },
            area: 'Team',
          }}
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <TeamTable />
            <Card title="Daily updates · today">
              <div className="grid gap-3">
                <DailyUpdate
                  who="Ananya Iyer"
                  done="Homepage hero, both options"
                  next="Mobile layouts for Acme Labs"
                />
                <DailyUpdate
                  who="Arjun Mehta"
                  done="Checkout API fix"
                  next="QA on Android"
                  blockers="Waiting for Northwind’s payment keys"
                />
                <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border-strong px-3 py-2 text-body-sm text-muted-foreground">
                  Meera Pillai hasn’t posted yet
                  <Button size="sm">Remind</Button>
                </div>
              </div>
            </Card>
          </div>
        </StateView>
      </>
    ),
  },
  {
    id: 'S37',
    slug: 's37-my-day',
    name: 'My day and daily update',
    release: 'R1',
    priority: 'P2',
    who: 'Member (phone)',
    frame: 'app',
    role: 'member',
    active: 'today',
    crumbs: ['My day'],
    pagePrimary: true,
    purpose: 'What I do today and a one-minute update. Primary: Post update.',
    states: [
      { id: 'default', label: 'Default' },
      { id: 'posted', label: 'Posted' },
    ],
    render: ({ state }) => (
      <div className="mx-auto grid max-w-prose gap-4">
        <PageHeader
          greeting
          title="Good morning, Arjun"
          subtitle="3 tasks due today"
          className="mb-0"
        />
        <List label="Due today">
          <Row
            label="Fix checkout bug"
            meta="Northwind · Build"
            right={<Checkbox aria-label="Mark Fix checkout bug done" />}
          />
          <Row
            label="QA on Android"
            meta="Northwind · Build"
            right={<Checkbox aria-label="Mark QA on Android done" />}
          />
          <Row
            label="Prepare staging"
            meta="Acme Labs · Build"
            right={<Checkbox aria-label="Mark Prepare staging done" defaultChecked />}
          />
        </List>
        {state === 'posted' ? (
          <Alert tone="success" title="Update posted">
            Ananya sees it on the Team page.
          </Alert>
        ) : (
          <Card title="Daily update">
            <form className="grid gap-4">
              <Textarea label="Done" rows={2} />
              <Textarea label="Next" rows={2} />
              <Textarea label="Blockers" optional rows={2} />
              <Go to="s37-my-day" state="posted" variant="primary" size="xl" block>
                Post update
              </Go>
            </form>
          </Card>
        )}
      </div>
    ),
  },
];
