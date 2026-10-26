'use client';

import {
  calculateInvoice,
  formatQuoteNumber,
  LEAD_SOURCE_LABELS,
  LOST_REASON_LABELS,
  PROPOSAL_VALIDITY_DAYS,
} from '@agency-os/core';
import {
  ArrowRight,
  CurrencyInr,
  Envelope,
  Receipt,
  CalendarBlank,
  ChatCircleDots,
  CheckCircle,
  Funnel,
  FunnelSimple,
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
  Avatar,
  BrandTile,
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
import { METRICS, PIPELINE_SUMMARY } from '@agency-os/ui/example';
import { Go, List, Row, StateView } from './kit';
import {
  ClientsTable,
  LeadsBoard,
  LeadsTable,
  ProposalDoc,
  RiskTable,
  TeamLoad,
  TodayList,
  ViewSwitch,
} from './parts';
import { NO_EMPTY, PUBLIC, STANDARD, type ScreenDef } from './types';

const LEADS_HEADER = (
  <PageHeader
    title="Leads"
    subtitle="7 open · ₹7.75 L in the pipeline · win rate 38%"
    actions={
      <>
        <ViewSwitch />
        <Go to="s16-csv-import" icon={UploadSimple}>
          Import CSV
        </Go>
        <Go to="s15-new-lead" variant="primary" icon={Plus}>
          Add lead
        </Go>
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

const QUOTE_NUMBER = formatQuoteNumber('OSS', '2026-10-25', 18);
const LOST_REASONS = Object.values(LOST_REASON_LABELS);

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
            <MetricCard {...METRICS.revenue} icon={CurrencyInr} href="/prototype/s32-invoices" />
            <MetricCard {...METRICS.pending} icon={Receipt} href="/prototype/s32-invoices" />
            <MetricCard
              {...METRICS.overdue}
              icon={Receipt}
              tone="danger"
              inverse
              href="/prototype/s32-invoices"
            />
            <MetricCard
              {...METRICS.pipeline}
              icon={FunnelSimple}
              href="/prototype/s12-leads-board"
            />
          </div>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <div className="grid min-w-0 content-start gap-4">
              <Card
                title="Leads pipeline"
                description="By stage, this quarter"
                actions={
                  <Go to="s12-leads-board" variant="ghost" size="sm" iconRight={ArrowRight}>
                    Open pipeline
                  </Go>
                }
              >
                <LeadsBoard columns={PIPELINE_SUMMARY} size="sm" />
              </Card>
              <Card title="Projects at risk" description="3 of 9 active" flush>
                <RiskTable />
              </Card>
            </div>
            <div className="grid min-w-0 content-start gap-4">
              <Card
                title="Today"
                description="Sun 25 Oct"
                actions={
                  <Go to="s10-today" variant="ghost" size="sm" iconRight={ArrowRight}>
                    Open Today
                  </Go>
                }
              >
                <TodayList />
              </Card>
              <Card title="Team load" description="Open tasks this week">
                <TeamLoad />
              </Card>
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
          <LeadsBoard />
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
          <LeadsTable
            bulk={
              <>
                <Button size="sm">Change stage</Button>
                <Button size="sm">Assign</Button>
                <Button size="sm">Export</Button>
              </>
            }
          />
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
      { id: 'lost-other', label: 'Lost: Other, no note' },
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
            <Go to="s21-convert-lead" variant="highlight" icon={SealCheck}>
              Mark as won
            </Go>
          </div>
          <dl className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-2 text-body">
            {[
              ['Contact', 'Sarah Lewis, Head of product'],
              ['Email', 'sarah@northwind.example'],
              ['Phone', '+44 20 7946 0958'],
              ['Value', '₹2,40,000'],
              ['Service', 'Mobile app'],
              ['Source', 'Marketplace'],
              ['Owner', 'Kiran Rao'],
            ].map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted-foreground">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
            <span className="grid">
              <span className="text-body-medium">Follow up: Fri 30 Oct, 11:00</span>
              <span className="text-caption font-normal text-muted-foreground">
                Call about the proposal
              </span>
            </span>
            <span className="flex gap-2">
              <Button size="sm">Change</Button>
              <Button size="sm" icon={CheckCircle}>
                Done
              </Button>
            </span>
          </div>
          <Textarea
            label="Add a note"
            placeholder="Called Sarah, she’ll confirm the budget by Friday"
            rows={2}
          />
          <div className="flex gap-2">
            <Go to="s18-quote-builder" icon={Receipt}>
              Create quote
            </Go>
            <Go to="s19-proposal-builder" icon={Signature}>
              Open proposal
            </Go>
            <Go to="s14-lead-record" state="lost">
              Mark as lost
            </Go>
          </div>
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
          <LeadsBoard />
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
          {state === 'lost' || state === 'lost-other' ? (
            <Dialog defaultOpen>
              <DialogContent
                title="Why was Northwind lost?"
                description="The reason helps you see patterns in lost deals."
                footer={
                  <>
                    <Button>Cancel</Button>
                    <Go to="s12-leads-board" variant="primary">
                      Mark as lost
                    </Go>
                  </>
                }
              >
                <div className="grid gap-4">
                  <Select
                    label="Reason"
                    required
                    placeholder="Choose a reason"
                    defaultValue={state === 'lost-other' ? 'Other' : ''}
                    options={LOST_REASONS}
                  />
                  <Textarea
                    label="Note"
                    optional={state !== 'lost-other'}
                    required={state === 'lost-other'}
                    hint={state === 'lost-other' ? undefined : 'Needed when the reason is Other.'}
                    error={
                      state === 'lost-other'
                        ? 'Add a note that says why. It’s needed when the reason is Other.'
                        : undefined
                    }
                  />
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
        <LeadsBoard />
        <Dialog defaultOpen>
          <DialogContent
            title="New lead"
            footer={
              <>
                <Button>Cancel</Button>
                <Go to="s12-leads-board" variant="primary">
                  Add lead
                </Go>
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
                options={Object.values(LEAD_SOURCE_LABELS)}
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
          <div className="grid justify-items-center gap-3 rounded-lg border-2 border-dashed border-border-strong bg-card px-6 py-12 text-center">
            <UploadSimple size={32} weight="duotone" aria-hidden="true" className="text-primary" />
            <p className="text-title-sm">Drop your CSV here</p>
            <p className="text-body text-muted-foreground">
              Up to 5,000 rows. The first row should have column names.
            </p>
            <div className="flex gap-2">
              <Button variant="primary">Choose a file</Button>
              <Button variant="link">Download the template</Button>
            </div>
          </div>
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
            <Go to="s13-leads-table" variant="primary">
              Open leads
            </Go>
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
            <Card
              title="Preview"
              description="The first 3 of 240 rows, as they will be imported"
              flush
            >
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-body-sm">
                  <caption className="sr-only">Import preview</caption>
                  <thead>
                    <tr className="bg-muted text-caption text-muted-foreground">
                      {['Name', 'Company', 'Phone', 'Value', 'Source'].map((h) => (
                        <th key={h} scope="col" className="px-3 py-2 text-left font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Priya Shah', 'Priya Stores', '+91 98480 22331', '₹40,000', 'Referral'],
                      ['Rohan Das', 'Das & Sons', '+91 99490 11022', '₹1,20,000', 'Website'],
                      ['Meghna Rao', 'Studio M', '+91 90000 55443', '₹65,000', 'Instagram'],
                    ].map((r) => (
                      <tr key={r[0]} className="border-t border-border">
                        {r.map((c, k) => (
                          <td key={k} className="px-3 py-2">
                            {c}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <div className="flex justify-end gap-2">
              <Button>Back</Button>
              <Go to="s16-csv-import" state="result" variant="primary">
                Import 240 leads
              </Go>
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
        <span className="flex items-center gap-2.5 text-body font-semibold">
          <BrandTile />
          One Stop Solutions
        </span>
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
          subtitle={`Draft · saved just now · number ${QUOTE_NUMBER} is given when you send it`}
          actions={
            <>
              <Button>Preview</Button>
              <Go to="s19-proposal-builder" state="send" variant="primary">
                Save and send
              </Go>
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
              <Go to="s19-proposal-builder" state="send" variant="primary">
                Send proposal
              </Go>
            </>
          }
        />
        <StateView state={state} copy={{ area: 'proposals' }}>
          <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
            <nav aria-label="Blocks" className="max-lg:hidden">
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
              <ProposalDoc editable />
            </div>
          </div>
        </StateView>
        {state === 'send' ? (
          <Dialog defaultOpen>
            <DialogContent
              title="Send the proposal to Kite & Co"
              description={`They get a link to read and sign it on any device. It works for ${PROPOSAL_VALIDITY_DAYS} days.`}
              footer={
                <>
                  <Button icon={WhatsappLogo}>Copy WhatsApp link</Button>
                  <Go to="s14-lead-record" variant="primary">
                    Send proposal
                  </Go>
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
            A signed copy was emailed to you, with the time and the exact proposal you accepted. One
            Stop Solutions will be in touch to start.
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
          <ProposalDoc />
        </article>
        {state === 'sign' ? (
          <section
            className="grid gap-4 rounded-xl border border-border bg-card p-6"
            aria-label="Accept and sign"
          >
            <h2 className="text-title-md">Accept and sign</h2>
            <Input label="Your full name" required size="xl" />
            <Input
              label="Signature"
              hint="Type your name; it’s recorded with the time and your email code."
              size="xl"
              className="font-mono"
            />
            <div className="grid gap-2">
              <Button size="xl" icon={Envelope}>
                Email me a code
              </Button>
              <Input
                label="Code from your email"
                inputMode="numeric"
                size="xl"
                hint="We send a 6-digit code to kiran@kiteandco.in. It works for 10 minutes."
              />
            </div>
            <Go to="s20-proposal-view" state="signed" variant="primary" size="xl" block>
              Accept proposal
            </Go>
          </section>
        ) : state === 'default' ? (
          <div className="sticky bottom-0 flex gap-2 border-t border-border bg-background py-3">
            <Button size="xl">Ask a question</Button>
            <Go to="s20-proposal-view" state="sign" variant="primary" size="xl" className="flex-1">
              Accept proposal
            </Go>
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
        <LeadsBoard />
        <Dialog defaultOpen>
          <DialogContent
            icon={SealCheck}
            title="Make Kite & Co a client"
            description="Their details, contacts and quote come with them."
            footer={
              <>
                <Button>Cancel</Button>
                <Go to="s23-client-record" state="invite" variant="primary">
                  Create client
                </Go>
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
          <ClientsTable />
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
                <Go to="s25-new-project" variant="primary" icon={Plus}>
                  New project
                </Go>
              </>
            }
          />
          {state === 'invite' ? (
            <Alert
              tone="warning"
              title="Portal invite not accepted yet"
              action={<Button size="sm">Resend invite</Button>}
            >
              Sent to kiran@kiteandco.in 3 days ago. Kiran gets in by signing in with that email;
              changing the email or revoking access stops it.
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
            <Card title="Contacts">
              <ul className="grid gap-3 p-0">
                <li className="flex items-center gap-3">
                  <Avatar name="Kiran Kumar" />
                  <span className="grid">
                    <span className="flex items-center gap-2 text-body-medium">
                      Kiran Kumar · Founder
                      <Badge size="sm" tone="brand">
                        Primary
                      </Badge>
                    </span>
                    <span className="text-caption font-normal text-muted-foreground">
                      kiran@kiteandco.in · +91 98450 12345 · prefers WhatsApp
                    </span>
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <Avatar name="Divya Nair" />
                  <span className="grid">
                    <span className="text-body-medium">Divya Nair · Accounts</span>
                    <span className="text-caption font-normal text-muted-foreground">
                      accounts@kiteandco.in · prefers email
                    </span>
                  </span>
                </li>
              </ul>
            </Card>
            <Card title="Billing">
              <dl className="grid grid-cols-[96px_1fr] gap-x-3 gap-y-1.5 text-body-sm">
                <dt className="text-muted-foreground">GSTIN</dt>
                <dd className="font-mono text-mono-sm">29ABCDE1234F1ZW</dd>
                <dt className="text-muted-foreground">Address</dt>
                <dd>12 Church Street, Bengaluru</dd>
                <dt className="text-muted-foreground">State</dt>
                <dd>Karnataka (29) · IGST applies</dd>
                <dt className="text-muted-foreground">Currency</dt>
                <dd>INR · IST</dd>
              </dl>
            </Card>
            <Card title="Money">
              <dl className="grid gap-2 text-body">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Quoted</dt>
                  <dd className="tabular-nums">₹94,400</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Invoiced</dt>
                  <dd className="tabular-nums">₹0</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Outstanding</dt>
                  <dd className="tabular-nums">₹0</dd>
                </div>
              </dl>
            </Card>
          </div>
          <Textarea
            label="Notes"
            defaultValue="Met at the Bengaluru design meetup. Wants the site live before the Diwali sale."
            rows={2}
          />
        </div>
      </StateView>
    ),
  },
];
