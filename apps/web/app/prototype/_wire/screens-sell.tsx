'use client';

import { calculateInvoice } from '@agency-os/core';
import {
  CalendarBlank,
  ChatCircleDots,
  CheckCircle,
  Funnel,
  FunnelSimple,
  Kanban,
  ListBullets,
  Phone,
  Plus,
  SealCheck,
  Signature,
  Sun,
  UploadSimple,
  UsersThree,
  WhatsappLogo,
} from '@phosphor-icons/react';
import {
  ActivityFeed,
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  DialogContent,
  Input,
  InvoiceSummary,
  MetricCard,
  PageHeader,
  RecordHeader,
  Segmented,
  Select,
  Sheet,
  SheetContent,
  TabLinks,
  Textarea,
} from '@agency-os/ui';
import { Bars, List, Ph, Row, StateView } from './kit';
import { NO_EMPTY, PUBLIC, STANDARD, type ScreenDef } from './types';

const STAGES = ['New', 'Contacted', 'Proposal', 'Won', 'Lost'];

function BoardWire({ withDrawer = false }: { withDrawer?: boolean }) {
  return (
    <div
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be reachable by keyboard (WCAG 2.1.1)
      tabIndex={0}
      role="region"
      aria-label="Pipeline"
      className="grid auto-cols-[minmax(200px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2"
    >
      {STAGES.map((stage, i) => (
        <section
          key={stage}
          aria-label={stage}
          className="grid content-start gap-2 rounded-lg bg-muted p-2"
        >
          <header className="flex items-center justify-between px-1.5 text-body-sm font-semibold">
            {stage}
            <span className="text-caption font-normal text-muted-foreground">count · total</span>
          </header>
          {Array.from({ length: [3, 2, 1, 1, 0][i] ?? 0 }, (_, j) => (
            <Ph
              key={j}
              label="Lead card: name · service · value · source · owner · follow-up"
              h={withDrawer ? 72 : 88}
              className="bg-card"
            />
          ))}
          <Ph label="+ Add lead" h={32} className="py-1.5" />
        </section>
      ))}
    </div>
  );
}

const LEADS_HEADER = (
  <PageHeader
    title="Leads"
    subtitle="7 open · ₹7.75 L in the pipeline · win rate 38%"
    actions={
      <>
        <Segmented
          label="View"
          defaultValue="board"
          items={[
            { value: 'board', label: 'Board', icon: Kanban },
            { value: 'table', label: 'Table', icon: ListBullets },
          ]}
        />
        <Button icon={UploadSimple}>Import CSV</Button>
        <Button variant="primary" icon={Plus}>
          Add lead
        </Button>
      </>
    }
    className="mb-4"
  />
);

const LEADS_FILTERS = (
  <div className="mb-4 flex flex-wrap items-center gap-2">
    <Button size="sm" icon={Funnel}>
      Source: All
    </Button>
    <Button size="sm">Owner: Anyone</Button>
    <Button size="sm">Saved views</Button>
    <Button size="sm" variant="link">
      Follow-ups due · 3
    </Button>
  </div>
);

const LEADS_EMPTY = {
  title: 'No leads yet',
  text: 'Add your first lead, share your enquiry form, or import a CSV.',
  action: 'Add lead',
  icon: FunnelSimple,
};

const quote = calculateInvoice({
  currency: 'INR',
  supplierStateCode: '37',
  placeOfSupply: { kind: 'india', stateCode: '29' },
  lines: [
    {
      description: 'Website, 5 pages',
      sac: '998314',
      quantity: 1,
      rateMinor: 6_000_000n,
      taxRateBp: 1800,
    },
    {
      description: 'Copywriting',
      sac: '998314',
      quantity: 5,
      rateMinor: 400_000n,
      taxRateBp: 1800,
    },
  ],
});

export const SELL_SCREENS: ScreenDef[] = [
  {
    id: 'S10',
    slug: 's10-today',
    name: 'Today',
    release: 'R1',
    priority: 'P1',
    who: 'Owner, project lead, member',
    frame: 'app',
    role: 'owner',
    active: 'today',
    crumbs: ['Today'],
    purpose:
      'Everything due today in one list: follow-ups, tasks, approvals, dues, meetings. Each row opens its record.',
    states: STANDARD,
    render: ({ state }) => (
      <>
        <PageHeader
          greeting
          title="Good morning, Kiran"
          subtitle="Sunday 25 Oct · 6 things today"
        />
        <StateView
          state={state}
          copy={{
            empty: {
              title: 'You’re all caught up',
              text: 'Follow-ups, tasks, approvals and dues for today appear here.',
              icon: Sun,
            },
            area: 'Today',
          }}
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="grid content-start gap-4">
              <List label="Follow-ups due · 3">
                <Row
                  label="Call Kite & Co"
                  meta="Lead · Proposal sent"
                  right={<Button size="sm">Done</Button>}
                />
                <Row
                  label="Follow up Lumen Foods"
                  meta="Overdue since Mon"
                  right={
                    <Badge tone="danger" size="sm" dot>
                      Overdue
                    </Badge>
                  }
                />
                <Row label="Send recap to Mitra Clinic" meta="Due 11:00" />
              </List>
              <List label="Tasks due · 2">
                <Row label="Homepage hero copy" meta="Acme Labs · Design" />
                <Row label="Fix checkout bug" meta="Northwind · Build" />
              </List>
            </div>
            <div className="grid content-start gap-4">
              <List label="Approvals waiting · 1">
                <Row
                  label="Design sign-off"
                  meta="Acme Labs · sent 2 days ago"
                  right={
                    <Button size="sm" icon={WhatsappLogo}>
                      Remind
                    </Button>
                  }
                />
              </List>
              <List label="Invoices due · 1">
                <Row label="OSS/26-27/014 · ₹29,500" meta="Northwind · due today" />
              </List>
              <Ph label="Meetings (Google Calendar, later)" h={72} />
            </div>
          </div>
        </StateView>
      </>
    ),
  },
  {
    id: 'S11',
    slug: 's11-dashboard',
    name: 'Owner dashboard',
    release: 'R1',
    priority: 'P1',
    who: 'Owner, finance',
    frame: 'app',
    role: 'owner',
    active: 'dashboard',
    crumbs: ['Dashboard'],
    purpose:
      'How is the agency doing: money in, money owed, pipeline, risk, load. Every number links to its list.',
    states: STANDARD,
    render: ({ state }) => (
      <>
        <PageHeader
          greeting
          title="Good morning, Kiran"
          subtitle="Sunday 25 Oct · 3 things need you today"
          actions={
            <Segmented
              label="Period"
              defaultValue="month"
              items={[
                { value: 'month', label: 'This month' },
                { value: 'quarter', label: 'Quarter' },
                { value: 'year', label: 'Year' },
              ]}
            />
          }
        />
        <StateView
          state={state}
          copy={{
            empty: {
              title: 'Your numbers start here',
              text: 'Send your first quote or invoice and this page fills in.',
              action: 'Finish setting up',
            },
            area: 'the dashboard',
          }}
        >
          <div className="mb-4 grid grid-cols-4 gap-3 max-xl:grid-cols-2 max-sm:grid-cols-1">
            <MetricCard
              label="Revenue this month (paid)"
              value="₹ —"
              note="vs last month"
              href="#"
            />
            <MetricCard label="Pending" value="₹ —" note="invoices sent, not due" href="#" />
            <MetricCard label="Overdue" value="₹ —" note="invoices past due" href="#" />
            <MetricCard label="Pipeline value" value="₹ —" note="win rate, last 90 days" href="#" />
          </div>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <div className="grid content-start gap-4">
              <Ph label="Leads pipeline by stage (compact board) → Open pipeline" h={260} />
              <Ph
                label="Projects at risk: project · why (gate late, budget used, tasks overdue) · progress"
                h={180}
              />
            </div>
            <div className="grid content-start gap-4">
              <Ph label="Today: next 5 items → Open Today" h={220} />
              <Ph label="Team load: open tasks per member this week" h={160} />
            </div>
          </div>
        </StateView>
      </>
    ),
  },
  {
    id: 'S12',
    slug: 's12-leads-board',
    name: 'Leads: pipeline board',
    release: 'R1',
    priority: 'P1',
    who: 'Owner',
    frame: 'app',
    role: 'owner',
    active: 'leads',
    crumbs: ['Leads'],
    pagePrimary: true,
    purpose: 'See every deal by stage and move it forward. Primary: Add lead.',
    states: STANDARD,
    render: ({ state }) => (
      <>
        {LEADS_HEADER}
        {LEADS_FILTERS}
        <StateView state={state} copy={{ empty: LEADS_EMPTY, area: 'Leads' }}>
          <BoardWire />
        </StateView>
      </>
    ),
  },
  {
    id: 'S13',
    slug: 's13-leads-table',
    name: 'Leads: table',
    release: 'R1',
    priority: 'P2',
    who: 'Owner',
    frame: 'app',
    role: 'owner',
    active: 'leads',
    crumbs: ['Leads'],
    pagePrimary: true,
    purpose: 'The same leads as rows, for sorting, bulk changes and export. Primary: Add lead.',
    states: [...STANDARD, { id: 'selected', label: 'Rows selected' }],
    render: ({ state }) => (
      <>
        {LEADS_HEADER}
        {LEADS_FILTERS}
        <StateView state={state} copy={{ empty: LEADS_EMPTY, area: 'Leads' }}>
          {state === 'selected' ? (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md bg-brand-soft px-3 py-2">
              <span className="text-body-medium">3 selected</span>
              <Button size="sm">Change stage</Button>
              <Button size="sm">Assign</Button>
              <Button size="sm">Export</Button>
            </div>
          ) : (
            <div className="mb-3 flex justify-end">
              <Button size="sm">Columns</Button>
            </div>
          )}
          <List label="☐ · Name and company · Stage · Value · Source · Owner · Follow-up">
            {[
              'Kite & Co',
              'Lumen Foods',
              'Orbit Fitness',
              'Mitra Clinic',
              'Tara Textiles',
              'Northwind',
            ].map((name, i) => (
              <Row
                key={name}
                label={name}
                meta="service · contact"
                right={
                  <span className="flex items-center gap-3">
                    <Checkbox
                      aria-label={`Select ${name}`}
                      checked={state === 'selected' && i < 3}
                    />
                    <Bars n={1} className="w-40" />
                  </span>
                }
              />
            ))}
          </List>
        </StateView>
      </>
    ),
  },
  {
    id: 'S14',
    slug: 's14-lead-record',
    name: 'Lead record',
    release: 'R1',
    priority: 'P1',
    who: 'Owner',
    frame: 'app',
    role: 'owner',
    active: 'leads',
    crumbs: ['Leads', 'Northwind'],
    purpose:
      'Open a lead without leaving the board: what happened, what’s next. Primary: the next step (Send proposal / Mark as won).',
    states: [
      { id: 'default', label: 'Drawer' },
      { id: 'page', label: 'Full page' },
      { id: 'lost', label: 'Lost reason' },
    ],
    render: ({ state }) => {
      const body = (
        <div className="grid gap-4">
          <Alert tone="brand" title="Proposal viewed 3 times">
            Last opened 2 hours ago. A good moment to call.
          </Alert>
          <div className="flex flex-wrap gap-2">
            <Button icon={Phone}>Call</Button>
            <Button icon={WhatsappLogo}>WhatsApp</Button>
            <Button variant="highlight" icon={SealCheck}>
              Mark as won
            </Button>
          </div>
          <Ph
            label="Details: contact, phone, email, value, service, source, owner (edit inline)"
            h={120}
          />
          <Ph label="Follow-up: Fri 11:00 · change · done" h={56} />
          <Ph label="Add a note or log a call" h={72} />
          <ActivityFeed
            items={[
              {
                id: '1',
                icon: ChatCircleDots,
                who: 'Northwind',
                text: 'viewed the proposal',
                when: '2 h ago',
              },
              {
                id: '2',
                icon: Signature,
                tone: 'brand',
                who: 'Kiran',
                text: 'sent the proposal',
                when: 'Fri',
              },
            ]}
          />
        </div>
      );
      if (state === 'page') {
        return (
          <div className="grid gap-6">
            <RecordHeader
              title="Northwind"
              avatar
              status="Proposal"
              statusTone="brand"
              meta={[
                { icon: UsersThree, text: 'Sarah Lewis' },
                { icon: CalendarBlank, text: 'Follow up Fri' },
              ]}
              actions={<Button>Mark as lost</Button>}
            />
            <div className="max-w-3xl">{body}</div>
          </div>
        );
      }
      return (
        <>
          <BoardWire withDrawer />
          <Sheet defaultOpen modal={false}>
            <SheetContent
              title="Northwind"
              description="Mobile app · ₹2,40,000 · Marketplace"
              actions={
                <Badge tone="brand" dot>
                  Proposal
                </Badge>
              }
            >
              {body}
            </SheetContent>
          </Sheet>
          {state === 'lost' ? (
            <Dialog defaultOpen>
              <DialogContent
                title="Why was Northwind lost?"
                description="The reason helps you see patterns in lost deals."
                footer={
                  <>
                    <Button>Cancel</Button>
                    <Button variant="primary">Mark as lost</Button>
                  </>
                }
              >
                <div className="grid gap-4">
                  <Select
                    label="Reason"
                    required
                    placeholder="Choose a reason"
                    defaultValue=""
                    options={[
                      'Price',
                      'Timing',
                      'Chose another provider',
                      'No reply',
                      'Not a fit',
                      'Budget cut',
                      'Other',
                    ]}
                  />
                  <Textarea label="Note" optional />
                </div>
              </DialogContent>
            </Dialog>
          ) : null}
        </>
      );
    },
  },
  {
    id: 'S15',
    slug: 's15-new-lead',
    name: 'New lead',
    release: 'R1',
    priority: 'P1',
    who: 'Owner',
    frame: 'app',
    role: 'owner',
    active: 'leads',
    crumbs: ['Leads'],
    purpose: 'Add a lead in under a minute. Primary: Add lead.',
    states: [
      { id: 'default', label: 'Default' },
      { id: 'error', label: 'Validation' },
    ],
    render: ({ state }) => (
      <>
        <BoardWire />
        <Dialog defaultOpen>
          <DialogContent
            title="New lead"
            footer={
              <>
                <Button>Cancel</Button>
                <Button variant="primary">Add lead</Button>
              </>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Name"
                required
                error={state === 'error' ? 'Add a name so you can find this lead.' : undefined}
                containerClassName="sm:col-span-2"
              />
              <Input label="Company" optional />
              <Input
                label="Phone or email"
                required
                error={state === 'error' ? 'Add a phone number or an email.' : undefined}
              />
              <Select
                label="Source"
                options={[
                  'Referral',
                  'Instagram',
                  'LinkedIn',
                  'Website',
                  'Marketplace',
                  'Ads',
                  'IndiaMART',
                  'WhatsApp',
                  'Other',
                ]}
                defaultValue="Instagram"
              />
              <Input label="Value" prefix="₹" inputMode="numeric" optional />
              <Select
                label="Service"
                options={[
                  'Website',
                  'Landing page',
                  'Brand identity',
                  'UI/UX design',
                  'Mobile app',
                ]}
                defaultValue="Website"
              />
              <Input
                label="Follow-up"
                defaultValue="Mon 26 Oct, 11:00"
                hint="The next working day by default."
              />
              <Textarea label="Notes" optional containerClassName="sm:col-span-2" rows={2} />
            </div>
          </DialogContent>
        </Dialog>
      </>
    ),
  },
  {
    id: 'S16',
    slug: 's16-csv-import',
    name: 'CSV import',
    release: 'R1',
    priority: 'P2',
    who: 'Owner',
    frame: 'app',
    role: 'owner',
    active: 'leads',
    crumbs: ['Leads', 'Import'],
    pagePrimary: true,
    purpose:
      'Bring leads from a spreadsheet: upload, map columns, preview, result. Primary: Import 240 leads.',
    states: [
      { id: 'default', label: 'Map columns' },
      { id: 'upload', label: 'Upload' },
      { id: 'loading', label: 'Importing' },
      { id: 'result', label: 'Result (partial)' },
    ],
    render: ({ state }) => (
      <div className="mx-auto grid max-w-3xl gap-4">
        <PageHeader title="Import leads" subtitle="Step 2 of 3 · Map columns" className="mb-0" />
        {state === 'upload' ? (
          <Ph
            label="Drop a CSV here or choose a file · up to 5,000 rows · download the template"
            h={220}
          />
        ) : state === 'loading' ? (
          <Alert tone="info" title="Importing 240 leads (120 done)">
            You can leave this page; we’ll tell you when it’s finished.
          </Alert>
        ) : state === 'result' ? (
          <>
            <Alert tone="warning" title="236 leads imported, 4 skipped">
              Fix these rows and import them again.
            </Alert>
            <List label="Skipped rows">
              <Row label="Row 14 · Priya Stores" meta="No phone or email" />
              <Row label="Row 52 · —" meta="Name is empty" />
              <Row label="Row 88 · Rao & Sons" meta="Value isn’t a number: “eighty thousand”" />
              <Row label="Row 190 · Kite & Co" meta="Already a lead (same email)" />
            </List>
            <Button variant="primary">Open leads</Button>
          </>
        ) : (
          <>
            <List label="Column in your file → field in Agency OS">
              {[
                'Client name → Name',
                'Org → Company',
                'Mobile → Phone',
                'Mail → Email',
                'Budget → Value',
                'Where from → Source',
              ].map((m) => (
                <Row
                  key={m}
                  label={m}
                  right={
                    <Select
                      aria-label={`Field for ${m.split(' →')[0]}`}
                      options={[
                        'Name',
                        'Company',
                        'Phone',
                        'Email',
                        'Value',
                        'Source',
                        'Skip this column',
                      ]}
                      defaultValue={m.split('→ ')[1]}
                      containerClassName="w-44"
                    />
                  }
                />
              ))}
            </List>
            <Ph label="Preview: first 5 rows as they will be imported" h={140} />
            <div className="flex justify-end gap-2">
              <Button>Back</Button>
              <Button variant="primary">Import 240 leads</Button>
            </div>
          </>
        )}
      </div>
    ),
  },
  {
    id: 'S17',
    slug: 's17-enquiry-form',
    name: 'Enquiry form (public page)',
    release: 'R1',
    priority: 'P2',
    who: 'Public visitor',
    frame: 'bare',
    purpose:
      'A prospect tells the agency what they need; it becomes a lead with source Website. Primary: Send enquiry.',
    states: [...PUBLIC, { id: 'sent', label: 'Submitted' }],
    render: ({ state }) => (
      <div className="mx-auto grid w-full max-w-md gap-5 rounded-xl border border-border bg-card p-6">
        <Ph label="Agency logo and name" h={40} />
        {state === 'sent' ? (
          <div className="grid gap-2 text-center">
            <CheckCircle
              size={36}
              weight="duotone"
              aria-hidden="true"
              className="mx-auto text-success"
            />
            <h1 className="text-title-md">Thanks, we’ve got your enquiry</h1>
            <p className="text-body text-muted-foreground">
              One Stop Solutions usually replies within a working day.
            </p>
          </div>
        ) : (
          <form className="grid gap-4">
            <h1 className="text-title-md">Tell us about your project</h1>
            {state === 'error' ? (
              <Alert tone="danger" title="Your enquiry wasn’t sent">
                Too many tries from this network. Wait a minute and send it again.
              </Alert>
            ) : null}
            <Input label="Your name" required size="xl" />
            <Input
              label="Email or phone"
              required
              size="xl"
              hint="We use it only to reply to you."
            />
            <Input label="Company" optional size="xl" />
            <Select
              label="What do you need?"
              size="xl"
              options={[
                'Website',
                'Landing page',
                'Brand identity',
                'Mobile app',
                'Something else',
              ]}
              defaultValue="Website"
            />
            <Select
              label="Budget"
              optional
              size="xl"
              placeholder="Choose a range"
              defaultValue=""
              options={['Under ₹50,000', '₹50,000 to ₹2 L', '₹2 L to ₹5 L', 'Over ₹5 L']}
            />
            <Textarea label="Message" required />
            <Checkbox label="You can contact me about this enquiry" />
            <Button variant="primary" size="xl" block loading={state === 'loading'}>
              Send enquiry
            </Button>
          </form>
        )}
      </div>
    ),
  },
  {
    id: 'S18',
    slug: 's18-quote-builder',
    name: 'Quote builder',
    release: 'R1',
    priority: 'P1',
    who: 'Owner',
    frame: 'app',
    role: 'owner',
    active: 'sales-docs',
    crumbs: ['Sales docs', 'Quote for Kite & Co'],
    pagePrimary: true,
    purpose: 'Price the work with GST worked out for you. Primary: Save and send.',
    states: [
      { id: 'default', label: 'Inter-state (IGST)' },
      { id: 'loading', label: 'Loading' },
      { id: 'error', label: 'Error' },
    ],
    render: ({ state }) => (
      <>
        <PageHeader
          title="Quote for Kite & Co"
          subtitle="Draft · saved just now"
          actions={
            <>
              <Button>Preview</Button>
              <Button variant="primary">Save and send</Button>
            </>
          }
        />
        <StateView state={state} copy={{ area: 'quotes' }}>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="grid content-start gap-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Select label="Client" options={['Kite & Co']} defaultValue="Kite & Co" />
                <Select label="Currency" options={['INR', 'USD', 'GBP']} defaultValue="INR" />
                <Input label="Valid until" defaultValue="8 Nov 2026" />
              </div>
              <Alert tone="info" title="IGST applies">
                Kite & Co is in Karnataka and you’re in Andhra Pradesh.
              </Alert>
              <List label="Service · Description · Qty · Rate · Tax">
                <Row label="Website, 5 pages" meta="SAC 998314 · 1 × ₹60,000 · GST 18%" />
                <Row label="Copywriting" meta="SAC 998314 · 5 × ₹4,000 · GST 18%" />
              </List>
              <div className="flex gap-2">
                <Button size="sm" icon={Plus}>
                  Add line
                </Button>
                <Button size="sm">Add discount</Button>
              </div>
            </div>
            <InvoiceSummary type="Quote" totals={quote} />
          </div>
        </StateView>
      </>
    ),
  },
  {
    id: 'S19',
    slug: 's19-proposal-builder',
    name: 'Proposal builder',
    release: 'R1',
    priority: 'P1',
    who: 'Owner',
    frame: 'app',
    role: 'owner',
    active: 'sales-docs',
    crumbs: ['Sales docs', 'Proposal for Kite & Co'],
    pagePrimary: true,
    purpose:
      'Win the work: blocks from the Standard proposal template, autosaved. Primary: Send proposal.',
    states: [
      { id: 'default', label: 'Editing' },
      { id: 'send', label: 'Send dialog' },
      { id: 'loading', label: 'Loading' },
      { id: 'error', label: 'Error' },
    ],
    render: ({ state }) => (
      <>
        <PageHeader
          title="Proposal for Kite & Co"
          subtitle="Draft · saved just now"
          actions={
            <>
              <Button>Preview</Button>
              <Button variant="primary">Send proposal</Button>
            </>
          }
        />
        <StateView state={state} copy={{ area: 'proposals' }}>
          <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
            <nav aria-label="Blocks">
              <ol className="grid gap-1 p-0">
                {[
                  'Cover',
                  'About us',
                  'Your goals',
                  'Scope',
                  'Phases and timeline',
                  'Price',
                  'Payment terms',
                  'Terms',
                  'Accept and sign',
                ].map((b, i) => (
                  <li
                    key={b}
                    className="flex items-center gap-2 rounded-sm border border-border bg-card px-2.5 py-1.5 text-body-sm"
                  >
                    <span className="font-mono text-mono-sm text-muted-foreground">{i + 1}</span>
                    {b}
                  </li>
                ))}
              </ol>
              <Button size="sm" variant="ghost" icon={Plus} className="mt-2">
                Add block
              </Button>
            </nav>
            <div className="grid content-start gap-4 rounded-lg border border-border bg-card p-6">
              <Ph
                label="Cover: logo · Proposal for Kite & Co · 25 Oct 2026 · Prepared by Kiran Rao"
                h={120}
              />
              <Ph label="About us: two or three sentences about your studio" h={88} />
              <Ph label="Scope: Included / Not included (from the quote)" h={120} />
              <Ph label="Price: the quote table with GST and the amount in words" h={120} />
            </div>
          </div>
        </StateView>
        {state === 'send' ? (
          <Dialog defaultOpen>
            <DialogContent
              title="Send the proposal to Kite & Co"
              description="They get a link to read and sign it on any device."
              footer={
                <>
                  <Button icon={WhatsappLogo}>Copy WhatsApp link</Button>
                  <Button variant="primary">Send proposal</Button>
                </>
              }
            >
              <div className="grid gap-4">
                <Input label="To" defaultValue="kiran@kiteandco.in" />
                <Textarea
                  label="Message"
                  defaultValue="Hi Kiran, here is our proposal for the new website."
                />
              </div>
            </DialogContent>
          </Dialog>
        ) : null}
      </>
    ),
  },
  {
    id: 'S20',
    slug: 's20-proposal-view',
    name: 'Proposal: client view and sign',
    release: 'R1',
    priority: 'P1',
    who: 'Client (phone first)',
    frame: 'bare',
    purpose:
      'Read the proposal and accept it with a name and an email code. Primary: Accept proposal.',
    states: [
      { id: 'default', label: 'Reading' },
      { id: 'sign', label: 'Signing' },
      { id: 'signed', label: 'Signed' },
      { id: 'declined', label: 'Declined' },
      { id: 'expired', label: 'Expired' },
    ],
    render: ({ state }) => (
      <div className="mx-auto grid w-full max-w-prose gap-4">
        {state === 'signed' ? (
          <Alert tone="success" title="You accepted this proposal on 25 Oct 2026">
            A signed copy was emailed to you. One Stop Solutions will be in touch to start.
          </Alert>
        ) : null}
        {state === 'declined' ? (
          <Alert tone="info" title="You declined this proposal">
            One Stop Solutions has been told. You can still ask them a question.
          </Alert>
        ) : null}
        {state === 'expired' ? (
          <Alert tone="warning" title="This proposal expired on 8 Nov 2026">
            Ask One Stop Solutions to send an updated one.
          </Alert>
        ) : null}
        <article className="grid gap-4 rounded-xl border border-border bg-card p-6">
          <Ph label="Cover: agency logo · Proposal for Kite & Co · date" h={120} />
          {[
            'Your goals',
            'Scope',
            'Phases and timeline (your sign-offs marked)',
            'Price with GST and amount in words',
            'Payment terms',
            'Terms',
          ].map((s) => (
            <Ph key={s} label={s} h={72} />
          ))}
        </article>
        {state === 'sign' ? (
          <section
            className="grid gap-4 rounded-xl border border-border bg-card p-6"
            aria-label="Accept and sign"
          >
            <h2 className="text-title-md">Accept and sign</h2>
            <Input label="Your full name" required size="xl" />
            <Ph label="Signature: type or draw" h={88} />
            <Input
              label="Code from your email"
              inputMode="numeric"
              size="xl"
              hint="We sent it to kiran@kiteandco.in."
            />
            <Button variant="primary" size="xl" block>
              Accept proposal
            </Button>
          </section>
        ) : state === 'default' ? (
          <div className="sticky bottom-0 flex gap-2 border-t border-border bg-background py-3">
            <Button size="xl">Ask a question</Button>
            <Button variant="primary" size="xl" className="flex-1">
              Accept proposal
            </Button>
          </div>
        ) : null}
      </div>
    ),
  },
  {
    id: 'S21',
    slug: 's21-convert-lead',
    name: 'Lead to client',
    release: 'R1',
    priority: 'P1',
    who: 'Owner',
    frame: 'app',
    role: 'owner',
    active: 'leads',
    crumbs: ['Leads'],
    purpose:
      'One click from won to client, project and advance invoice; nothing typed twice. Primary: Create client.',
    states: [{ id: 'default', label: 'Default' }],
    render: () => (
      <>
        <BoardWire />
        <Dialog defaultOpen>
          <DialogContent
            icon={SealCheck}
            title="Make Kite & Co a client"
            description="Their details, contacts and quote come with them."
            footer={
              <>
                <Button>Cancel</Button>
                <Button variant="primary">Create client</Button>
              </>
            }
          >
            <div className="grid gap-4">
              <p className="grid gap-0.5 text-body">
                <span className="font-medium">Creates the client</span>
                <span className="text-body-sm text-muted-foreground">
                  Kite & Co · Kiran (contact) · Karnataka · INR
                </span>
              </p>
              <Checkbox
                label="Start a project"
                description="From the Seven phases template, with the signed proposal’s dates"
                defaultChecked
              />
              <Checkbox
                label="Create the advance invoice"
                description="50% of the quote: ₹47,200 with GST, as a draft"
                defaultChecked
              />
              <Checkbox
                label="Invite Kiran to the client portal"
                description="By email, with a WhatsApp link to share"
                defaultChecked
              />
            </div>
          </DialogContent>
        </Dialog>
      </>
    ),
  },
  {
    id: 'S22',
    slug: 's22-clients',
    name: 'Clients list',
    release: 'R1',
    priority: 'P1',
    who: 'Owner',
    frame: 'app',
    role: 'owner',
    active: 'clients',
    crumbs: ['Clients'],
    pagePrimary: true,
    purpose: 'Every client and how they stand. Primary: Add client.',
    states: STANDARD,
    render: ({ state }) => (
      <>
        <PageHeader
          title="Clients"
          subtitle="12 clients · 9 active projects"
          actions={
            <Button variant="primary" icon={Plus}>
              Add client
            </Button>
          }
        />
        <StateView
          state={state}
          copy={{
            empty: {
              title: 'No clients yet',
              text: 'Clients appear here when you win a lead, or add one directly.',
              action: 'Add client',
              icon: UsersThree,
            },
            area: 'Clients',
          }}
        >
          <List label="Client and contact · Projects · Billed · Outstanding · Portal">
            {['Acme Labs', 'Northwind', 'Saffron Stays', 'Kite & Co', 'Mitra Clinic'].map((c) => (
              <Row
                key={c}
                label={c}
                meta="main contact · city"
                right={<Bars n={1} className="w-48" />}
              />
            ))}
          </List>
        </StateView>
      </>
    ),
  },
  {
    id: 'S23',
    slug: 's23-client-record',
    name: 'Client record',
    release: 'R1',
    priority: 'P1',
    who: 'Owner',
    frame: 'app',
    role: 'owner',
    active: 'clients',
    crumbs: ['Clients', 'Kite & Co'],
    pagePrimary: true,
    purpose:
      'Everything about one client: projects, invoices, files, activity. Primary: New project.',
    states: [...NO_EMPTY, { id: 'invite', label: 'Portal invite pending' }],
    render: ({ state }) => (
      <StateView state={state} copy={{ area: 'this client' }}>
        <div className="grid gap-6">
          <RecordHeader
            title="Kite & Co"
            avatar
            status="Active"
            statusTone="success"
            meta={[
              { icon: UsersThree, text: 'Kiran (contact)' },
              { icon: CalendarBlank, text: 'Client since Oct 2026' },
            ]}
            actions={
              <>
                <Button icon={WhatsappLogo}>WhatsApp</Button>
                <Button variant="primary" icon={Plus}>
                  New project
                </Button>
              </>
            }
          />
          {state === 'invite' ? (
            <Alert
              tone="warning"
              title="Portal invite not accepted yet"
              action={<Button size="sm">Resend invite</Button>}
            >
              Sent to kiran@kiteandco.in 3 days ago.
            </Alert>
          ) : null}
          <TabLinks
            label="Client"
            items={[
              { href: '/prototype/s23-client-record', label: 'Overview', active: true },
              { href: '/prototype/s24-projects', label: 'Projects', count: 1 },
              { href: '/prototype/s32-invoices', label: 'Invoices', count: 2 },
              { href: '/prototype/s30-files', label: 'Files' },
              { href: '/prototype/s14-lead-record', label: 'Activity' },
            ]}
          />
          <div className="grid gap-4 lg:grid-cols-3">
            <Ph label="Contacts: name · role · phone · email · preferred channel" h={140} />
            <Ph
              label="Billing: GSTIN (optional) · address · state · country · currency · time zone"
              h={140}
            />
            <Card title="Money">
              <Bars n={3} />
            </Card>
          </div>
          <Ph label="Notes" h={88} />
        </div>
      </StateView>
    ),
  },
];
