import {
  CalendarBlank,
  ChatCircleDots,
  CurrencyInr,
  Eye,
  FunnelSimple,
  MapPin,
  PaperPlaneTilt,
  Plus,
  Receipt,
  SealCheck,
  Trash,
  UploadSimple,
  User,
  UsersThree,
  WhatsappLogo,
} from '@phosphor-icons/react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from '../components/badge';
import { Button } from '../components/button';
import { EmptyState } from '../components/empty-state';
import {
  EXPORT_INVOICE,
  FOOTER_NAV,
  LEADS,
  LUT_ARN,
  METRICS,
  OWNER_NAV,
  PEOPLE,
  PIPELINE,
  TAX_INVOICE,
  WORKSPACE,
} from '../example/data';
import { ActivityFeed } from './activity-feed';
import { Checklist } from './checklist';
import { CommandMenu } from './command-palette';
import { CellMain, DataTable, type ColumnDef } from './data-table';
import { GateCard } from './gate-card';
import { InvoiceSummary } from './invoice-summary';
import { Logo } from './logo';
import { MetricCard } from './metric-card';
import { PhaseStepper } from './phase-stepper';
import { PipelineBoard } from './pipeline-board';
import { RecordHeader } from './record-header';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

const meta = { title: 'Patterns' } satisfies Meta;
export default meta;

export const Navigation: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div className="flex h-[760px] gap-6">
        <Sidebar
          workspace={WORKSPACE}
          groups={OWNER_NAV}
          footerItems={FOOTER_NAV}
          active="leads"
          user={{ name: PEOPLE.owner, role: 'Owner' }}
        />
        <Sidebar
          workspace={WORKSPACE}
          groups={OWNER_NAV}
          footerItems={FOOTER_NAV}
          active="dashboard"
          user={{ name: PEOPLE.owner, role: 'Owner' }}
          collapsed
        />
        <div className="flex flex-1 flex-col gap-6">
          <div className="overflow-hidden rounded-lg border border-border">
            <Topbar
              crumbs={[{ label: WORKSPACE.name, href: '#' }, { label: 'Leads' }]}
              actions={
                <Button variant="primary" icon={Plus}>
                  New
                </Button>
              }
            />
          </div>
          <Logo />
        </div>
      </div>
    </div>
  ),
};

export const Command: StoryObj = {
  name: 'Command palette',
  render: () => (
    <CommandMenu
      defaultQuery="kite"
      groups={[
        {
          label: 'Leads and clients',
          items: [
            {
              id: 'lead-kite',
              icon: FunnelSimple,
              label: 'Kite & Co',
              meta: 'Lead · Proposal sent · ₹80,000',
            },
            {
              id: 'client-kite',
              icon: UsersThree,
              label: 'Kite Studios',
              meta: 'Client · 2 projects',
            },
          ],
        },
        {
          label: 'Actions',
          items: [
            { id: 'new-lead', icon: Plus, label: 'New lead', kbd: 'N L', keywords: ['kite'] },
            {
              id: 'new-invoice',
              icon: Receipt,
              label: 'Create invoice',
              kbd: 'N I',
              keywords: ['kite'],
            },
            { id: 'send', icon: PaperPlaneTilt, label: 'Send proposal to Kite & Co' },
          ],
        },
      ]}
    />
  ),
};

type ClientRow = {
  id: string;
  name: string;
  contact: string;
  projects: number;
  billedMinor: bigint;
  status: string;
};
const clientRows: ClientRow[] = [
  {
    id: 'acme',
    name: 'Acme Labs',
    contact: PEOPLE.client,
    projects: 2,
    billedMinor: 4_720_000n,
    status: 'Active',
  },
  {
    id: 'northwind',
    name: 'Northwind',
    contact: PEOPLE.intlClient,
    projects: 1,
    billedMinor: 24_000_000n,
    status: 'Active',
  },
  {
    id: 'saffron',
    name: 'Saffron Stays',
    contact: PEOPLE.pm,
    projects: 1,
    billedMinor: 9_000_000n,
    status: 'Onboarding',
  },
  {
    id: 'mitra',
    name: 'Mitra Clinic',
    contact: PEOPLE.designer,
    projects: 0,
    billedMinor: 0n,
    status: 'Paused',
  },
];
const clientColumns: ColumnDef<ClientRow, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Client',
    meta: { label: 'Client' },
    cell: ({ row }) => <CellMain title={row.original.name} subtitle={row.original.contact} />,
  },
  { accessorKey: 'projects', header: 'Projects', meta: { align: 'right', label: 'Projects' } },
  {
    accessorKey: 'billedMinor',
    header: 'Billed',
    meta: { align: 'right', label: 'Billed' },
    sortingFn: (a, b) => Number(a.original.billedMinor - b.original.billedMinor),
    cell: ({ row }) =>
      new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(Number(row.original.billedMinor / 100n)),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    meta: { label: 'Status' },
    cell: ({ row }) => (
      <Badge
        size="sm"
        tone={
          row.original.status === 'Active'
            ? 'success'
            : row.original.status === 'Paused'
              ? 'neutral'
              : 'brand'
        }
        dot
      >
        {row.original.status}
      </Badge>
    ),
  },
  {
    id: 'invoice',
    header: 'Last invoice',
    meta: { mono: true, label: 'Last invoice' },
    cell: () => 'OSS/26-27/014',
  },
];

export const Table: StoryObj = {
  name: 'Data table',
  render: () => (
    <div className="flex max-w-content flex-col gap-8">
      <DataTable
        caption="Clients"
        columns={clientColumns}
        data={clientRows}
        getRowId={(r) => r.id}
        selectable
        columnPicker
        bulkActions={() => (
          <Button size="sm" variant="secondary" icon={Trash}>
            Archive
          </Button>
        )}
        footer={<span>Showing 4 of 4 clients</span>}
      />
      <DataTable
        caption="Clients loading"
        columns={clientColumns}
        data={[]}
        getRowId={(r) => r.id}
        loading
        density="compact"
      />
      <DataTable
        caption="No clients"
        columns={clientColumns}
        data={[]}
        getRowId={(r) => r.id}
        empty={
          <EmptyState
            compact
            as="h3"
            icon={UsersThree}
            title="No clients yet"
            action={<Button variant="primary">Add client</Button>}
          >
            Win a lead or add a client you already work with.
          </EmptyState>
        }
      />
    </div>
  ),
};

export const Board: StoryObj = {
  name: 'Pipeline board',
  render: () => <PipelineBoard columns={PIPELINE} onAddLead={() => {}} onOpen={() => {}} />,
};

export const Record: StoryObj = {
  name: 'Record header and activity',
  render: () => (
    <div className="flex max-w-content flex-col gap-6">
      <RecordHeader
        title="Northwind"
        avatar
        status="Proposal"
        statusTone="brand"
        meta={[
          { icon: User, text: PEOPLE.owner },
          { icon: CurrencyInr, text: LEADS.northwind.value },
          { icon: CalendarBlank, text: 'Follow up 28 Oct' },
          { icon: MapPin, text: 'London · GMT' },
        ]}
        actions={
          <>
            <Button icon={WhatsappLogo}>WhatsApp</Button>
            <Button variant="primary" icon={SealCheck}>
              Mark as won
            </Button>
          </>
        }
      />
      <div className="max-w-xl">
        <ActivityFeed
          items={[
            {
              id: '1',
              icon: Eye,
              tone: 'brand',
              who: 'Northwind',
              text: 'viewed the proposal',
              when: '2 h ago',
            },
            {
              id: '2',
              icon: PaperPlaneTilt,
              tone: 'brand',
              who: 'Kiran',
              text: 'sent the proposal',
              when: 'Fri',
            },
            { id: '3', icon: ChatCircleDots, who: 'Kiran', text: 'logged a call', when: 'Thu' },
            {
              id: '4',
              icon: UploadSimple,
              tone: 'success',
              who: 'Ananya',
              text: 'shared 3 screens',
              when: '14 Oct',
            },
          ]}
        />
      </div>
    </div>
  ),
};

export const Metrics: StoryObj = {
  render: () => (
    <div className="grid max-w-content gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard {...METRICS.revenue} icon={CurrencyInr} href="#invoices" />
      <MetricCard {...METRICS.pending} icon={Receipt} href="#pending" />
      <MetricCard {...METRICS.overdue} icon={Receipt} tone="danger" inverse href="#overdue" />
      <MetricCard {...METRICS.pipeline} icon={FunnelSimple} href="#leads" />
    </div>
  ),
};

export const Phases: StoryObj = {
  name: 'Phase stepper',
  render: () => (
    <div className="flex max-w-3xl flex-col gap-10">
      <PhaseStepper current={3} />
      <PhaseStepper current={4} skipped={[1, 2, 3]} compact />
      <div className="max-w-sm">
        <PhaseStepper current={3} compact />
      </div>
    </div>
  ),
};

export const Gates: StoryObj = {
  name: 'Gate cards',
  render: () => (
    <div className="grid max-w-content gap-4 md:grid-cols-2">
      <GateCard
        phase="Design gate"
        title="Approve the homepage design"
        view="client"
        status="waiting"
        description="Desktop and phone versions, with the Telugu headline you asked for."
        files={['Homepage v3.fig', 'Mobile.pdf']}
        approver={PEOPLE.client}
        when="sent 2 h ago"
      />
      <GateCard
        phase="Define gate"
        title="PRD and timeline"
        status="approved"
        approver={PEOPLE.client}
        when="14 Oct 2026"
      />
      <GateCard
        phase="Build gate"
        title="Acceptance testing on staging"
        status="waiting"
        approver={PEOPLE.client}
        when="sent yesterday"
      />
      <GateCard phase="Launch gate" title="Handover kit" status="draft" approver={PEOPLE.client} />
      <GateCard
        phase="Design gate"
        title="Approve the app icons"
        status="changes"
        approver={PEOPLE.client}
        when="12 Oct 2026"
      />
    </div>
  ),
};

export const Invoices: StoryObj = {
  name: 'Invoice summary',
  render: () => (
    <div className="grid max-w-content items-start gap-4 md:grid-cols-2">
      <InvoiceSummary
        type="Tax invoice"
        number="OSS/26-27/015"
        status="due"
        statusText="Due 2 Nov"
        totals={TAX_INVOICE}
      />
      <InvoiceSummary
        type="Export invoice"
        number="OSS/26-27/016"
        status="due"
        statusText="Due 5 Nov"
        totals={EXPORT_INVOICE}
        exchangeRate="84.20"
        lutArn={LUT_ARN}
      />
    </div>
  ),
};

export const Onboarding: StoryObj = {
  name: 'Checklist',
  render: () => (
    <div className="max-w-xl">
      <Checklist
        title="Get started"
        onDismiss={() => {}}
        items={[
          { id: 'workspace', label: 'Create your workspace', done: true },
          { id: 'brand', label: 'Add your logo and GSTIN', done: true },
          { id: 'lead', label: 'Add your first lead', done: true },
          {
            id: 'proposal',
            label: 'Send a proposal',
            hint: 'Use the website template; it takes about five minutes.',
            action: (
              <Button size="sm" variant="primary">
                Create proposal
              </Button>
            ),
          },
          { id: 'invite', label: 'Invite your team' },
        ]}
      />
    </div>
  ),
};
