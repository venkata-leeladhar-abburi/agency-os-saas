import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  ChatCircleDots,
  CheckCircle,
  CurrencyInr,
  Eye,
  Flag,
  Folder,
  FunnelSimple,
  House,
  MagnifyingGlass,
  PaperPlaneTilt,
  Phone,
  Plus,
  Receipt,
  SealCheck,
  Sparkle,
  UploadSimple,
  WhatsappLogo,
  X,
} from '@phosphor-icons/react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from '../components/badge';
import { Button } from '../components/button';
import { Card } from '../components/card';
import { IconButton } from '../components/icon-button';
import { Progress } from '../components/progress';
import { Segmented } from '../components/segmented';
import {
  AT_RISK,
  FOOTER_NAV,
  LEADS,
  METRICS,
  OWNER_NAV,
  PEOPLE,
  PIPELINE,
  PIPELINE_SUMMARY,
  TEAM_LOAD,
  TODAY,
  WORKSPACE,
} from '../example/data';
import { ActivityFeed } from './activity-feed';
import { AppShell, ExampleBadge, PageHeader } from './app-shell';
import { CellMain, DataTable, type ColumnDef } from './data-table';
import { MetricCard } from './metric-card';
import { PhaseStepper } from './phase-stepper';
import { PipelineBoard } from './pipeline-board';
import { NeedsYouItem, PortalShell } from './portal-shell';

const meta = { title: 'Screens', parameters: { layout: 'fullscreen', bare: true } } satisfies Meta;
export default meta;

const topActions = (
  <>
    <Button icon={MagnifyingGlass} kbd="Ctrl K" className="max-sm:hidden">
      Search
    </Button>
    <IconButton icon={Bell} label="Notifications" />
    <Button variant="primary" icon={Plus}>
      New
    </Button>
  </>
);

const sidebar = (active: string) => ({
  workspace: WORKSPACE,
  groups: OWNER_NAV,
  footerItems: FOOTER_NAV,
  active,
  user: { name: PEOPLE.owner, role: 'Owner' },
});

type RiskRow = (typeof AT_RISK)[number];
const riskColumns: ColumnDef<RiskRow, unknown>[] = [
  {
    accessorKey: 'client',
    header: 'Project',
    enableSorting: false,
    cell: ({ row }) => <CellMain title={row.original.client} subtitle={row.original.project} />,
  },
  {
    accessorKey: 'why',
    header: 'Why',
    enableSorting: false,
    cell: ({ row }) => (
      <Badge size="sm" tone="danger" dot>
        {row.original.why}
      </Badge>
    ),
  },
  {
    accessorKey: 'progress',
    header: 'Progress',
    enableSorting: false,
    cell: ({ row }) => (
      <Progress
        value={row.original.progress}
        tone={row.original.tone}
        className="w-36"
        valueText={`${row.original.progress}%`}
        aria-label={`${row.original.project} progress`}
      />
    ),
  },
];

function OwnerDashboard() {
  return (
    <AppShell
      sidebar={sidebar('dashboard')}
      topbar={{
        crumbs: [{ label: WORKSPACE.name, href: '#' }, { label: 'Dashboard' }],
        actions: topActions,
      }}
    >
      <PageHeader
        greeting
        title="Good morning, Kiran"
        subtitle="Sunday 25 Oct · 3 things need you today"
        actions={
          <>
            <ExampleBadge />
            <Segmented
              label="Period"
              defaultValue="month"
              items={[
                { value: 'month', label: 'This month' },
                { value: 'quarter', label: 'Quarter' },
                { value: 'year', label: 'Year' },
              ]}
            />
          </>
        }
      />
      <div className="mb-4 grid grid-cols-4 gap-3 max-xl:grid-cols-2 max-sm:grid-cols-1">
        <MetricCard {...METRICS.revenue} icon={CurrencyInr} href="#invoices" />
        <MetricCard {...METRICS.pending} icon={Receipt} href="#pending" />
        <MetricCard {...METRICS.overdue} icon={Receipt} tone="danger" inverse href="#overdue" />
        <MetricCard {...METRICS.pipeline} icon={FunnelSimple} href="#leads" />
      </div>
      <div className="grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] items-start gap-4 max-xl:grid-cols-1">
        <div className="grid min-w-0 gap-4">
          <Card
            title="Leads pipeline"
            description="By stage, this quarter"
            actions={
              <Button variant="ghost" size="sm" iconRight={ArrowRight}>
                Open pipeline
              </Button>
            }
          >
            <PipelineBoard columns={PIPELINE_SUMMARY} size="sm" onAddLead={() => {}} />
          </Card>
          <Card title="Projects at risk" description="3 of 9 active" flush>
            <DataTable
              caption="Projects at risk"
              columns={riskColumns}
              data={AT_RISK}
              getRowId={(r) => r.id}
              className="[&>div]:rounded-none [&>div]:border-x-0 [&>div]:border-b-0"
            />
          </Card>
        </div>
        <div className="grid min-w-0 gap-4">
          <Card title="Today" description="Sun 25 Oct">
            <ul className="grid gap-0.5 p-0">
              {TODAY.map((item) => (
                <li key={item.title}>
                  <a
                    href="#today"
                    className="grid grid-cols-[56px_1fr_auto] items-center gap-3 rounded-md px-2 py-2 text-foreground no-underline hover:bg-accent"
                  >
                    <span className="font-mono text-mono-sm text-muted-foreground">
                      {item.time}
                    </span>
                    <span className="min-w-0">
                      <span className="font-medium">{item.title}</span>
                      <span className="text-body-sm text-muted-foreground"> · {item.meta}</span>
                    </span>
                    <ArrowUpRight size={14} aria-hidden="true" className="text-muted-foreground" />
                  </a>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Team load" description="Open tasks this week">
            <div className="grid gap-3">
              {TEAM_LOAD.map((row) => (
                <div
                  key={row.team}
                  className="grid grid-cols-[96px_1fr_44px] items-center gap-3 text-body-sm"
                >
                  <span>{row.team}</span>
                  <Progress
                    value={row.load}
                    tone={row.load > 100 ? 'danger' : 'default'}
                    label={<span className="sr-only">{row.team}</span>}
                  />
                  <span className="text-right text-muted-foreground tabular-nums">{row.load}%</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function LeadDrawer() {
  return (
    <aside
      aria-label="Northwind"
      className="grid w-95 shrink-0 content-start gap-4 overflow-y-auto border-l border-border bg-popover p-5 shadow-lg max-lg:hidden"
    >
      <div className="flex items-start justify-between">
        <Badge tone="brand" dot>
          Proposal
        </Badge>
        <IconButton icon={X} label="Close lead" size="sm" />
      </div>
      <div>
        <h2 className="text-title-md">Northwind</h2>
        <p className="text-body text-muted-foreground">
          Mobile app · {LEADS.northwind.value} · Marketplace
        </p>
      </div>
      <div className="flex gap-3 rounded-lg bg-brand-soft p-4">
        <Sparkle size={20} aria-hidden="true" className="shrink-0 text-brand-soft-foreground" />
        <div>
          <p className="font-semibold">Proposal viewed 3 times</p>
          <p className="text-body">Last opened 2 hours ago. A good moment to call.</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button icon={Phone}>Call</Button>
        <Button icon={WhatsappLogo}>WhatsApp</Button>
        <Button variant="highlight" icon={SealCheck}>
          Mark as won
        </Button>
      </div>
      <ActivityFeed
        items={[
          { id: '1', icon: Eye, who: 'Northwind', text: 'viewed the proposal', when: '2 h ago' },
          {
            id: '2',
            icon: PaperPlaneTilt,
            tone: 'brand',
            who: 'Kiran',
            text: 'sent the proposal',
            when: 'Fri',
          },
          { id: '3', icon: ChatCircleDots, who: 'Kiran', text: 'logged a call', when: 'Thu' },
        ]}
      />
    </aside>
  );
}

function LeadsPipeline() {
  return (
    <AppShell
      sidebar={sidebar('leads')}
      topbar={{
        crumbs: [{ label: WORKSPACE.name, href: '#' }, { label: 'Leads' }],
        actions: (
          <>
            <IconButton icon={Bell} label="Notifications" />
            <Button variant="primary" icon={Plus}>
              New
            </Button>
          </>
        ),
      }}
      aside={<LeadDrawer />}
    >
      <PageHeader
        title="Leads"
        subtitle="7 open · ₹7.75 L in the pipeline · win rate 38%"
        actions={<ExampleBadge />}
        className="mb-4"
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone="outline">Source: All</Badge>
        <Badge tone="outline">Owner: Anyone</Badge>
        <Button variant="link" size="sm">
          Follow-ups due · 3
        </Button>
      </div>
      <PipelineBoard columns={PIPELINE} onAddLead={() => {}} onOpen={() => {}} />
    </AppShell>
  );
}

function ClientPortal() {
  return (
    <PortalShell
      agency={WORKSPACE.name}
      client={PEOPLE.client}
      active="home"
      tabs={[
        { value: 'home', label: 'Home', icon: House, href: '#home' },
        { value: 'project', label: 'Project', icon: Folder, href: '#project' },
        { value: 'payments', label: 'Payments', icon: Receipt, href: '#payments' },
        { value: 'messages', label: 'Messages', icon: ChatCircleDots, href: '#messages' },
      ]}
    >
      <div>
        <p className="text-overline-caps text-muted-foreground">Beere Kesava ERP</p>
        <h1 className="text-title-xl">Namaste, Srinivas</h1>
      </div>
      <section aria-labelledby="needs" className="grid gap-2">
        <h2 id="needs" className="text-overline-caps text-muted-foreground">
          Needs you · 2
        </h2>
        <NeedsYouItem
          icon={Flag}
          title="Approve the dashboard design"
          detail="Shared today by Ananya"
          href="#approve"
        />
        <NeedsYouItem
          icon={Receipt}
          tone="warning"
          title="Pay ₹47,200"
          detail="Milestone 2 · due 2 Nov · UPI or card"
          href="#pay"
        />
      </section>
      <Card
        title="Progress"
        actions={
          <Badge tone="brand" dot>
            Design
          </Badge>
        }
      >
        <div className="grid gap-4">
          <PhaseStepper current={3} compact />
          <Progress value={45} label="Overall" showValue />
        </div>
      </Card>
      <Card title="Latest" as="h2">
        <ActivityFeed
          items={[
            {
              id: '1',
              icon: CheckCircle,
              tone: 'success',
              who: 'You',
              text: 'approved the PRD',
              when: '14 Oct',
            },
            {
              id: '2',
              icon: UploadSimple,
              tone: 'brand',
              who: 'Ananya',
              text: 'shared 3 screens',
              when: 'Today',
            },
          ]}
        />
      </Card>
      <Button variant="primary" size="xl" block icon={SealCheck}>
        Review and approve
      </Button>
      <div className="flex justify-center">
        <ExampleBadge />
      </div>
    </PortalShell>
  );
}

export const Dashboard: StoryObj = { name: 'Owner dashboard', render: () => <OwnerDashboard /> };
export const Leads: StoryObj = { name: 'Leads pipeline', render: () => <LeadsPipeline /> };
export const Portal: StoryObj = { name: 'Client portal', render: () => <ClientPortal /> };
