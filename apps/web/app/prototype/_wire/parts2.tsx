'use client';

import {
  DotsThree,
  FilePdf,
  FileImage,
  FileText,
  Paperclip,
  WarningCircle,
} from '@phosphor-icons/react';
import {
  Avatar,
  Badge,
  CellMain,
  DataTable,
  GateCard,
  IconButton,
  Select,
  Progress,
  type BadgeProps,
  type ColumnDef,
} from '@agency-os/ui';
import { DEFAULT_PHASES } from '@agency-os/ui';
import {
  INVOICES,
  MEMBERS,
  PROJECTS,
  TASKS,
  type ExampleInvoice,
  type ExampleProject,
  type ExampleTask,
} from '@agency-os/ui/example';
import { useRouter } from 'next/navigation';

const PRIORITY: Record<ExampleTask['priority'], BadgeProps['tone']> = {
  Low: 'neutral',
  Normal: 'info',
  High: 'warning',
};

function TaskCard({ task }: { task: ExampleTask }) {
  const router = useRouter();
  return (
    <li className="list-none">
      <button
        type="button"
        onClick={() => router.push('/prototype/s29-task-detail')}
        className="grid w-full cursor-pointer gap-1.5 rounded-md border border-border bg-card px-3 py-2.5 text-left shadow-xs transition-[box-shadow,border-color] duration-150 hover:border-border-strong hover:shadow-md"
      >
        <span className="flex items-start justify-between gap-2">
          <span
            className={`text-body font-semibold ${task.status === 'Done' ? 'text-muted-foreground line-through' : ''}`}
          >
            {task.title}
          </span>
          <Avatar name={task.assignee} size="sm" />
        </span>
        <span className="text-caption font-normal text-muted-foreground">{task.project}</span>
        <span className="flex items-center justify-between gap-2">
          <span
            className={`flex items-center gap-1 text-caption ${task.overdue ? 'font-medium text-danger' : 'font-normal text-muted-foreground'}`}
          >
            {task.overdue ? <WarningCircle size={13} aria-hidden="true" /> : null}
            {task.due}
          </span>
          <Badge size="sm" tone={PRIORITY[task.priority]}>
            {task.priority}
          </Badge>
        </span>
      </button>
    </li>
  );
}

export function TaskBoard() {
  return (
    <div
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be reachable by keyboard (WCAG 2.1.1)
      tabIndex={0}
      role="region"
      aria-label="Task board"
      className="grid auto-cols-[minmax(220px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2"
    >
      {(['To do', 'In progress', 'In review', 'Done'] as const).map((col) => {
        const tasks = TASKS.filter((t) => t.status === col);
        return (
          <section
            key={col}
            aria-label={col}
            className="grid content-start gap-2 rounded-lg bg-muted p-2"
          >
            <header className="flex items-center gap-1.5 px-1.5 pt-1 text-body-sm font-semibold">
              {col}
              <span className="rounded-full bg-card px-1.5 text-caption leading-4.5 text-muted-foreground">
                {tasks.length}
              </span>
            </header>
            <ul className="grid gap-2 p-0">
              {tasks.map((t) => (
                <TaskCard key={t.id} task={t} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

const taskColumns: ColumnDef<ExampleTask, unknown>[] = [
  {
    accessorKey: 'title',
    header: 'Task',
    meta: { label: 'Task' },
    cell: ({ row }) => <CellMain title={row.original.title} subtitle={row.original.project} />,
  },
  {
    accessorKey: 'assignee',
    header: 'Assignee',
    meta: { label: 'Assignee' },
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-2">
        <Avatar name={row.original.assignee} size="xs" />
        {row.original.assignee}
      </span>
    ),
  },
  {
    accessorKey: 'due',
    header: 'Due',
    meta: { label: 'Due' },
    cell: ({ row }) => (
      <span className={row.original.overdue ? 'font-medium text-danger' : undefined}>
        {row.original.due}
      </span>
    ),
  },
  {
    accessorKey: 'priority',
    header: 'Priority',
    meta: { label: 'Priority' },
    cell: ({ row }) => (
      <Badge size="sm" tone={PRIORITY[row.original.priority]}>
        {row.original.priority}
      </Badge>
    ),
  },
  { accessorKey: 'status', header: 'Status', meta: { label: 'Status' } },
];

export function TaskTable() {
  const router = useRouter();
  return (
    <DataTable
      caption="Tasks"
      columns={taskColumns}
      data={TASKS}
      getRowId={(r) => r.id}
      selectable
      onRowClick={() => router.push('/prototype/s29-task-detail')}
    />
  );
}

/** A month view with tasks on their due dates. */
export function TaskCalendar() {
  const days = Array.from({ length: 35 }, (_, i) => i - 3);
  const onDay: Record<number, ExampleTask[]> = {
    25: [TASKS[1]!, TASKS[2]!],
    26: [TASKS[5]!],
    28: [TASKS[4]!],
    29: [TASKS[3]!],
    30: [TASKS[0]!],
  };
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-180 table-fixed border-collapse text-body-sm">
        <caption className="sr-only">October 2026</caption>
        <thead>
          <tr className="bg-muted text-caption text-muted-foreground">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <th key={d} scope="col" className="px-2 py-2 text-left font-medium">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }, (_, w) => (
            <tr key={w}>
              {days.slice(w * 7, w * 7 + 7).map((d) => (
                <td
                  key={d}
                  className="h-24 border-t border-l border-border px-2 py-1.5 align-top first:border-l-0"
                >
                  <span
                    className={`text-caption ${d === 25 ? 'rounded-full bg-primary px-1.5 text-primary-foreground' : 'text-muted-foreground'}`}
                  >
                    {d < 1 ? 30 + d : d > 31 ? d - 31 : d}
                  </span>
                  <ul className="mt-1 grid gap-1 p-0">
                    {(onDay[d] ?? []).map((t) => (
                      <li
                        key={t.id}
                        className="truncate rounded-xs bg-brand-soft px-1.5 py-0.5 text-caption text-brand-soft-foreground"
                      >
                        {t.title}
                      </li>
                    ))}
                  </ul>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const projectColumns: ColumnDef<ExampleProject, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Project',
    meta: { label: 'Project' },
    cell: ({ row }) => <CellMain title={row.original.name} subtitle={row.original.client} />,
  },
  {
    accessorKey: 'phase',
    header: 'Phase',
    meta: { label: 'Phase' },
    cell: ({ row }) => DEFAULT_PHASES[row.original.phase],
  },
  {
    accessorKey: 'health',
    header: 'Health',
    meta: { label: 'Health' },
    cell: ({ row }) => (
      <Badge size="sm" dot tone={row.original.health === 'On track' ? 'success' : 'danger'}>
        {row.original.health}
      </Badge>
    ),
  },
  { accessorKey: 'nextGate', header: 'Next gate', meta: { label: 'Next gate' } },
  { accessorKey: 'due', header: 'Due', meta: { label: 'Due' } },
  {
    accessorKey: 'progress',
    header: 'Progress',
    meta: { label: 'Progress' },
    cell: ({ row }) => (
      <Progress
        value={row.original.progress}
        className="w-28"
        aria-label={`${row.original.name} progress`}
      />
    ),
  },
];

export function ProjectsTable() {
  const router = useRouter();
  return (
    <DataTable
      caption="Projects"
      columns={projectColumns}
      data={PROJECTS}
      getRowId={(r) => r.id}
      columnPicker
      initialColumnVisibility={{ due: false }}
      onRowClick={() => router.push('/prototype/s26-project-overview')}
      footer={<span>Showing 5 of 9 active projects</span>}
    />
  );
}

const INVOICE_TONE: Record<ExampleInvoice['status'], BadgeProps['tone']> = {
  draft: 'neutral',
  due: 'warning',
  overdue: 'danger',
  paid: 'success',
  partially_paid: 'info',
};

const invoiceColumns: ColumnDef<ExampleInvoice, unknown>[] = [
  { accessorKey: 'number', header: 'Number', meta: { mono: true, label: 'Number' } },
  { accessorKey: 'client', header: 'Client', meta: { label: 'Client' } },
  { accessorKey: 'amount', header: 'Amount', meta: { align: 'right', label: 'Amount' } },
  { accessorKey: 'issued', header: 'Issued', meta: { label: 'Issued' } },
  { accessorKey: 'due', header: 'Due', meta: { label: 'Due' } },
  {
    accessorKey: 'statusText',
    header: 'Status',
    meta: { label: 'Status' },
    cell: ({ row }) => (
      <Badge size="sm" dot tone={INVOICE_TONE[row.original.status]}>
        {row.original.statusText}
      </Badge>
    ),
  },
];

export function InvoicesTable() {
  const router = useRouter();
  return (
    <DataTable
      caption="Invoices"
      columns={invoiceColumns}
      data={INVOICES}
      getRowId={(r) => r.id}
      selectable
      columnPicker
      bulkActions={() => null}
      onRowClick={(r) =>
        router.push(
          r.status === 'partially_paid'
            ? '/prototype/s35-record-payment'
            : '/prototype/s34-invoice-pay',
        )
      }
      footer={<span>Showing 6 invoices this financial year</span>}
    />
  );
}

type Member = (typeof MEMBERS)[number];
const memberColumns: ColumnDef<Member, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Member',
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-2.5">
        <Avatar name={row.original.name} />
        <CellMain title={row.original.name} subtitle={row.original.email} />
      </span>
    ),
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => <Badge size="sm">{row.original.role}</Badge>,
  },
  { accessorKey: 'projects', header: 'Projects', meta: { align: 'right' } },
  { accessorKey: 'openTasks', header: 'Open tasks', meta: { align: 'right' } },
  {
    id: 'actions',
    header: () => <span className="sr-only">Actions</span>,
    enableSorting: false,
    cell: ({ row }) => (
      <IconButton
        icon={DotsThree}
        size="sm"
        label={`Actions for ${row.original.name}`}
        tooltip={false}
      />
    ),
  },
];

export function TeamTable() {
  return (
    <DataTable
      caption="Team members"
      columns={memberColumns}
      data={MEMBERS}
      getRowId={(r) => r.email}
    />
  );
}

const FILES = [
  {
    name: 'Homepage v3.fig',
    icon: FileImage,
    size: '12.4 MB',
    who: 'Ananya Iyer',
    when: '23 Oct',
    shared: true,
  },
  {
    name: 'Mobile.pdf',
    icon: FilePdf,
    size: '3.1 MB',
    who: 'Ananya Iyer',
    when: '23 Oct',
    shared: true,
  },
  {
    name: 'Brand guidelines.pdf',
    icon: FilePdf,
    size: '8.0 MB',
    who: 'Srinivas Beere',
    when: '5 Oct',
    shared: true,
  },
  {
    name: 'Sitemap notes.txt',
    icon: FileText,
    size: '4 KB',
    who: 'Meera Pillai',
    when: '12 Oct',
    shared: false,
  },
];

export function FileList({ clientView }: { clientView?: boolean }) {
  const files = clientView ? FILES.filter((f) => f.shared) : FILES;
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card p-0">
      {files.map(({ name, icon: IconComponent, size, who, when, shared }) => (
        <li key={name} className="flex min-h-row-default items-center gap-3 px-3 py-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
            <IconComponent size={18} aria-hidden="true" />
          </span>
          <span className="grid min-w-0 flex-1">
            <a
              href="#file"
              className="truncate text-body font-medium text-foreground no-underline hover:underline"
            >
              {name}
            </a>
            <span className="text-caption font-normal text-muted-foreground">
              {who} · {when} · {size}
            </span>
          </span>
          {clientView ? null : (
            <Badge size="sm" tone={shared ? 'brand' : 'neutral'}>
              {shared ? 'Shared with client' : 'Team only'}
            </Badge>
          )}
        </li>
      ))}
    </ul>
  );
}

const THREAD = [
  {
    who: 'Ananya Iyer',
    mine: false,
    when: 'Mon 10:12 am',
    text: 'Hi Srinivas, the dashboard designs are ready. Desktop and phone are in the files.',
    file: 'Dashboard v2.pdf',
  },
  {
    who: 'Srinivas Beere',
    mine: false,
    when: 'Mon 6:40 pm',
    text: 'Looks good. Can the headline be in Telugu as well?',
  },
  {
    who: 'Kiran Rao',
    mine: true,
    when: 'Today 9:05 am',
    text: 'Yes. Ananya has added it; please approve when you’re happy.',
  },
];

/** A project thread; `asClient` flips whose messages sit on the right. */
export function MessageThread({ asClient }: { asClient?: boolean }) {
  return (
    <ol className="grid gap-4 p-0">
      {THREAD.map((m) => {
        const mine = asClient ? m.who === 'Srinivas Beere' : m.mine;
        return (
          <li key={m.when} className={`flex gap-2.5 ${mine ? 'flex-row-reverse' : ''}`}>
            <Avatar name={m.who} size="sm" />
            <div className={`grid max-w-[80%] gap-1 ${mine ? 'justify-items-end' : ''}`}>
              <span className="text-caption font-normal text-muted-foreground">
                {asClient && m.who === 'Srinivas Beere' ? 'You' : m.who} · {m.when}
              </span>
              <p
                className={`rounded-lg px-3 py-2 text-body ${mine ? 'bg-brand-soft text-foreground' : 'bg-muted'}`}
              >
                {m.text}
              </p>
              {m.file ? (
                <span className="inline-flex items-center gap-1 rounded-sm border border-border px-2 py-1 text-caption font-normal text-muted-foreground">
                  <Paperclip size={12} aria-hidden="true" /> {m.file}
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function DailyUpdate({
  who,
  done,
  next,
  blockers,
}: {
  who: string;
  done: string;
  next: string;
  blockers?: string;
}) {
  return (
    <article className="grid gap-2 rounded-lg border border-border p-3">
      <header className="flex items-center gap-2">
        <Avatar name={who} size="sm" />
        <span className="text-body-medium">{who}</span>
        <span className="ml-auto text-caption font-normal text-muted-foreground">Today</span>
      </header>
      <dl className="grid grid-cols-[72px_1fr] gap-x-3 gap-y-1 text-body-sm">
        <dt className="text-muted-foreground">Done</dt>
        <dd>{done}</dd>
        <dt className="text-muted-foreground">Next</dt>
        <dd>{next}</dd>
        {blockers ? (
          <>
            <dt className="text-muted-foreground">Blockers</dt>
            <dd className="text-danger">{blockers}</dd>
          </>
        ) : null}
      </dl>
    </article>
  );
}

/** The client's approval card, wired so Approve and Ask for changes move the prototype on. */
export function PortalGate({ approved }: { approved?: boolean }) {
  const router = useRouter();
  return (
    <GateCard
      phase="Design"
      title="Approve the dashboard design"
      view="client"
      status={approved ? 'approved' : 'waiting'}
      description="Desktop and phone versions. After you approve, Ananya starts building the pages."
      files={['Dashboard v2.pdf', 'Phone.pdf']}
      approver="Srinivas Beere"
      when={approved ? '25 Oct 2026' : 'shared today'}
      onApprove={() => router.push('/prototype/s39-portal-project?state=approved')}
      onAskForChanges={() => router.push('/prototype/s39-portal-project?state=changes')}
    />
  );
}

/** Choosing the invoice type switches the builder between its states. */
export function InvoiceTypeSelect({ value }: { value: string }) {
  const router = useRouter();
  return (
    <Select
      label="Type"
      options={['Tax invoice', 'Bill of supply', 'Export under LUT', 'Proforma or advance']}
      value={value}
      onChange={(e) =>
        router.push(
          `/prototype/s33-invoice-builder${e.target.value === 'Export under LUT' ? '?state=export' : ''}`,
        )
      }
    />
  );
}
