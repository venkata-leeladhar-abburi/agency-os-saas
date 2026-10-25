'use client';

import {
  Bell,
  ChartLineUp,
  Envelope,
  FunnelSimple,
  GoogleLogo,
  Phone,
  Plus,
  Receipt,
  UploadSimple,
  UserPlus,
} from '@phosphor-icons/react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Checklist,
  CommandMenu,
  Dialog,
  DialogContent,
  EmptyState,
  Input,
  Logo,
  PageHeader,
  Select,
  Skeleton,
  Switch,
} from '@agency-os/ui';
import { Go, List, Row, StateView } from './kit';
import { LeadsBoard } from './parts';
import { NO_EMPTY, PUBLIC, STANDARD, type ScreenDef } from './types';

function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-sm gap-6 rounded-xl border border-border bg-card p-6 shadow-xs">
      <Logo />
      {children}
    </div>
  );
}

export const R0_SCREENS: ScreenDef[] = [
  {
    id: 'S01',
    slug: 's01-sign-in',
    name: 'Sign up and sign in',
    release: 'R0',
    priority: 'P1',
    who: 'Everyone',
    frame: 'bare',
    purpose:
      'Get in with Google or an email link in two screens. Primary: Email me a sign-in link.',
    states: [...PUBLIC, { id: 'otp', label: 'Phone code' }, { id: 'sent', label: 'Link sent' }],
    render: ({ state }) => (
      <AuthCard>
        {state === 'sent' ? (
          <div className="grid gap-2">
            <h1 className="text-title-md">Check your email</h1>
            <p className="text-body text-muted-foreground">
              We sent a sign-in link to kiran@onestop.in. It works for 10 minutes.
            </p>
            <Button variant="link">Send it again</Button>
          </div>
        ) : state === 'otp' ? (
          <form className="grid gap-4">
            <h1 className="text-title-md">Enter the code</h1>
            <p className="text-body text-muted-foreground">
              We sent a 6-digit code to +91 90149 52056.
            </p>
            <Input
              label="Code"
              inputMode="numeric"
              size="xl"
              error="That code doesn’t match. You have 4 tries left."
            />
            <Go to="s02-workspace-setup" variant="primary" size="lg" block>
              Sign in
            </Go>
          </form>
        ) : (
          <form className="grid gap-4">
            <div>
              <h1 className="text-title-md">Sign in or create an account</h1>
              <p className="text-body text-muted-foreground">
                Run your agency from lead to paid invoice.
              </p>
            </div>
            {state === 'error' ? (
              <Alert tone="danger" title="This sign-in link has expired">
                Links work for 10 minutes. Send a new one below.
              </Alert>
            ) : null}
            <Button icon={GoogleLogo} size="lg" block>
              Continue with Google
            </Button>
            <div className="flex items-center gap-3 text-caption text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>
            <Input label="Email" type="email" placeholder="you@agency.in" />
            <Go
              to="s01-sign-in"
              state="sent"
              variant="primary"
              size="lg"
              block
              icon={Envelope}
              loading={state === 'loading'}
            >
              Email me a sign-in link
            </Go>
            <Button variant="link" icon={Phone}>
              Use my phone number
            </Button>
            <p className="text-caption font-normal text-muted-foreground">
              By continuing you agree to the terms and privacy policy.
            </p>
          </form>
        )}
      </AuthCard>
    ),
  },
  {
    id: 'S02',
    slug: 's02-workspace-setup',
    name: 'Workspace setup',
    release: 'R0',
    priority: 'P1',
    who: 'Owner',
    frame: 'bare',
    purpose: 'Three short steps; everything but the name can be skipped. Primary: Continue.',
    states: [
      ...PUBLIC,
      { id: 'step-2', label: 'Step 2' },
      { id: 'step-3', label: 'Step 3' },
      { id: 'other-country', label: 'Not India' },
    ],
    render: ({ state }) => (
      <div className="mx-auto grid w-full max-w-lg gap-6 rounded-xl border border-border bg-card p-6 shadow-xs">
        <p className="text-overline-caps text-muted-foreground">
          Step {state === 'step-2' ? 2 : state === 'step-3' ? 3 : 1} of 3
        </p>
        {state === 'step-2' ? (
          <div className="grid gap-4">
            <h1 className="text-title-md">Your logo and services</h1>
            <div className="flex items-center gap-4">
              <span className="grid size-16 place-items-center rounded-lg border-2 border-dashed border-border-strong text-muted-foreground">
                <UploadSimple size={22} aria-hidden="true" />
              </span>
              <span className="grid gap-1">
                <Button size="sm" className="justify-self-start">
                  Upload logo
                </Button>
                <span className="text-caption font-normal text-muted-foreground">
                  PNG or SVG. Shown on proposals, invoices and the portal.
                </span>
              </span>
            </div>
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-body-sm font-medium">Services you offer</legend>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'Website',
                  'Landing page',
                  'Brand identity',
                  'UI/UX design',
                  'Mobile app',
                  'Web app or SaaS',
                  'Online store',
                  'SEO',
                ].map((svc, k) => (
                  <Checkbox key={svc} label={svc} defaultChecked={k < 3 || k === 4} />
                ))}
              </div>
            </fieldset>
          </div>
        ) : state === 'step-3' ? (
          <div className="grid gap-4">
            <h1 className="text-title-md">GST details</h1>
            <Switch label="My business is registered for GST" defaultChecked />
            <Input
              label="GSTIN"
              placeholder="37ABCDE1234F1ZZ"
              hint="We check it and fill your state."
            />
            <Input
              label="LUT ARN"
              optional
              hint="Only if you bill clients outside India without IGST."
            />
          </div>
        ) : (
          <div className="grid gap-4">
            <h1 className="text-title-md">Name your workspace</h1>
            <Input label="Workspace name" required placeholder="One Stop Solutions" />
            <Select
              label="Country"
              options={[
                'India',
                'United States',
                'United Kingdom',
                'United Arab Emirates',
                'Singapore',
              ]}
              defaultValue={state === 'other-country' ? 'United Kingdom' : 'India'}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Currency"
                defaultValue={state === 'other-country' ? 'GBP' : 'INR'}
                disabled
                hint="From the country."
              />
              <Input
                label="Time zone"
                defaultValue={state === 'other-country' ? 'Europe/London' : 'Asia/Kolkata (IST)'}
                disabled
              />
            </div>
            {state === 'error' ? (
              <Alert tone="danger" title="The workspace wasn’t created">
                Check your connection and try again.
              </Alert>
            ) : null}
          </div>
        )}
        <div className="flex justify-between gap-2">
          <Button variant="ghost">Skip for now</Button>
          <Go
            to={state === 'step-3' ? 's03-onboarding' : 's02-workspace-setup'}
            state={state === 'step-3' ? undefined : state === 'step-2' ? 'step-3' : 'step-2'}
            variant="primary"
            loading={state === 'loading'}
          >
            Continue
          </Go>
        </div>
      </div>
    ),
  },
  {
    id: 'S03',
    slug: 's03-onboarding',
    name: 'Onboarding checklist and sample data',
    release: 'R0',
    priority: 'P1',
    who: 'Owner',
    frame: 'app',
    role: 'owner',
    active: 'today',
    crumbs: ['Today'],
    pagePrimary: true,
    purpose:
      'Get a new workspace to its first quote; offer example data. Primary: the next step’s action.',
    states: [...NO_EMPTY, { id: 'example', label: 'Example data on' }],
    render: ({ state }) => (
      <StateView state={state} copy={{ area: 'Today' }}>
        <PageHeader title="Welcome, Kiran" subtitle="Five steps to your first paid invoice" />
        <div className="grid gap-4">
          {state === 'example' ? (
            <Alert
              tone="brand"
              title="You’re looking at example data"
              action={<Button size="sm">Remove it</Button>}
            >
              Only the example records are removed.
            </Alert>
          ) : null}
          <Checklist
            title="Get started"
            onDismiss={() => {}}
            items={[
              {
                id: '1',
                label: 'Add your logo and services',
                hint: 'Clients see them on proposals, invoices and the portal.',
                done: true,
              },
              {
                id: '2',
                label: 'Add your first lead',
                hint: 'Or load example data to look around.',
                action: (
                  <Go to="s15-new-lead" size="sm" variant="primary">
                    Add lead
                  </Go>
                ),
              },
              { id: '3', label: 'Send a quote', hint: 'GST is added for you.' },
              {
                id: '4',
                label: 'Invite a client to the portal',
                hint: 'They can approve work and pay from their phone.',
              },
              { id: '5', label: 'Create an invoice', hint: 'With a UPI and card payment link.' },
            ]}
          />
          {state === 'example' ? null : (
            <Card
              title="Look around first"
              description="Load example leads, a client, a project and invoices. Remove them in one click."
            >
              <Button>Load example data</Button>
            </Card>
          )}
        </div>
      </StateView>
    ),
  },
  {
    id: 'S04',
    slug: 's04-app-shell',
    name: 'App shell',
    release: 'R0',
    priority: 'P1',
    who: 'Everyone inside the agency',
    frame: 'app',
    role: 'owner',
    active: 'dashboard',
    crumbs: ['Dashboard'],
    purpose:
      'Where am I and where can I go: sidebar per role, top bar with search, New and notifications. On phones the sidebar is a drawer.',
    states: [
      { id: 'default', label: 'Owner' },
      { id: 'lead', label: 'Project lead' },
      { id: 'member', label: 'Member' },
      { id: 'finance', label: 'Finance' },
    ],
    render: () => (
      <>
        <PageHeader
          greeting
          title="Good morning, Kiran"
          subtitle="Sunday 25 Oct · the shell around every agency page"
        />
        <div className="grid gap-4 md:grid-cols-3">
          <Card title="Sidebar">
            <p className="text-body text-muted-foreground">
              Grouped by how you work. Collapses to icons on smaller screens and becomes a menu on
              phones.
            </p>
          </Card>
          <Card title="Top bar">
            <p className="text-body text-muted-foreground">
              Where you are, search with Ctrl K, notifications and New.
            </p>
          </Card>
          <Card title="Roles">
            <p className="text-body text-muted-foreground">
              Owner, Project lead, Member and Finance each see only their own items. Switch with the
              state control.
            </p>
          </Card>
        </div>
      </>
    ),
  },
  {
    id: 'S05',
    slug: 's05-command-palette',
    name: 'Command palette',
    release: 'R0',
    priority: 'P1',
    who: 'Everyone inside the agency',
    frame: 'app',
    role: 'owner',
    active: 'dashboard',
    crumbs: ['Dashboard'],
    purpose: 'Ctrl/Cmd+K: jump to any record or run an action from the keyboard.',
    states: [
      { id: 'default', label: 'Recent' },
      { id: 'results', label: 'Results' },
      { id: 'empty', label: 'No results' },
    ],
    render: ({ state }) => (
      <div className="grid justify-items-center pt-6">
        <CommandMenu
          key={state}
          defaultQuery={state === 'results' ? 'kite' : state === 'empty' ? 'zebra' : ''}
          labels={{
            empty:
              'No matches for “zebra”. Check the spelling or search by client, invoice number or phone.',
          }}
          groups={[
            {
              label: state === 'default' ? 'Recent' : 'Leads and clients',
              items: [
                {
                  id: 'l1',
                  icon: FunnelSimple,
                  label: 'Kite & Co',
                  meta: 'Lead · Proposal sent · ₹80,000',
                },
                {
                  id: 'i1',
                  icon: Receipt,
                  label: 'OSS/26-27/014',
                  meta: 'Invoice · Northwind · overdue',
                },
              ],
            },
            {
              label: 'Actions',
              items: [
                { id: 'a1', icon: Plus, label: 'New lead', kbd: 'N L' },
                { id: 'a2', icon: Receipt, label: 'Create invoice', kbd: 'N I' },
                { id: 'a3', icon: ChartLineUp, label: 'Go to dashboard', kbd: 'G D' },
              ],
            },
          ]}
        />
      </div>
    ),
  },
  {
    id: 'S06',
    slug: 's06-notifications',
    name: 'Notifications panel',
    release: 'R0',
    priority: 'P2',
    who: 'Everyone',
    frame: 'app',
    role: 'owner',
    active: 'dashboard',
    crumbs: ['Dashboard'],
    purpose:
      'What happened since you last looked; each item opens its record. Primary: none (Mark all read is secondary).',
    states: [
      { id: 'default', label: 'Unread' },
      { id: 'empty', label: 'Empty' },
      { id: 'loading', label: 'Loading' },
    ],
    render: ({ state }) => (
      <div className="ml-auto grid w-full max-w-md gap-3">
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-title-md">
            <Bell size={20} aria-hidden="true" /> Notifications
          </h1>
          <Button size="sm" variant="ghost">
            Mark all read
          </Button>
        </div>
        {state === 'empty' ? (
          <div className="rounded-lg border border-border bg-card">
            <EmptyState compact icon={Bell} title="No notifications yet">
              New enquiries, signed proposals, approvals and payments show up here.
            </EmptyState>
          </div>
        ) : state === 'loading' ? (
          <div
            role="status"
            aria-label="Loading"
            className="grid gap-2 rounded-lg border border-border bg-card p-3"
          >
            {[0, 1, 2, 3].map((k) => (
              <span key={k} className="grid gap-1.5 py-1">
                <Skeleton width="70%" />
                <Skeleton width="30%" height={10} />
              </span>
            ))}
          </div>
        ) : (
          <List>
            <Row
              label="New enquiry from Mitra Clinic"
              meta="Website form · 10 min ago"
              right={
                <Badge tone="brand" dot size="sm">
                  New
                </Badge>
              }
            />
            <Row
              label="Kite & Co viewed your proposal"
              meta="2 h ago"
              right={
                <Badge tone="brand" dot size="sm">
                  New
                </Badge>
              }
            />
            <Row label="Payment received: ₹47,200 for OSS/26-27/012" meta="Yesterday" />
            <Row label="Srinivas Beere approved PRD and timeline" meta="14 Oct" />
          </List>
        )}
        <Button variant="link" size="sm">
          Notification settings
        </Button>
      </div>
    ),
  },
  {
    id: 'S07',
    slug: 's07-settings',
    name: 'Settings',
    release: 'R0',
    priority: 'P1',
    who: 'Owner, admin',
    frame: 'app',
    role: 'owner',
    active: 'settings',
    crumbs: ['Settings', 'Members and roles'],
    pagePrimary: true,
    purpose:
      'Workspace, branding, members and roles, tax and invoices, plan and billing, notifications, data export, audit log. Primary on this tab: Invite member.',
    states: [...STANDARD, { id: 'limit', label: 'Plan limit reached' }],
    render: ({ state }) => (
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav aria-label="Settings" className="min-w-0">
          <ul className="grid gap-0.5 p-0 max-lg:flex max-lg:overflow-x-auto">
            {[
              'Workspace',
              'Branding',
              'Members and roles',
              'Tax and invoices',
              'Plan and billing',
              'Notifications',
              'Data export',
              'Audit log',
            ].map((item) => (
              <li key={item}>
                <a
                  href="#settings"
                  aria-current={item === 'Members and roles' ? 'page' : undefined}
                  className="block rounded-sm px-2.5 py-1.5 text-body-medium whitespace-nowrap text-muted-foreground no-underline hover:bg-accent aria-[current=page]:bg-card aria-[current=page]:text-foreground aria-[current=page]:shadow-xs"
                >
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="grid min-w-0 content-start gap-4">
          <PageHeader
            title="Members and roles"
            subtitle="3 of 5 members on Agency Starter"
            actions={
              <Button variant="primary" icon={UserPlus}>
                Invite member
              </Button>
            }
            className="mb-0"
          />
          <StateView
            state={state}
            copy={{
              empty: {
                title: 'Only you so far',
                text: 'Invite your team. Each person gets a role that decides what they see.',
                action: 'Invite member',
                icon: UserPlus,
              },
              area: 'Settings',
            }}
          >
            {state === 'limit' ? (
              <Alert
                tone="warning"
                title="Your plan has 5 members, and all are in use"
                action={<Button size="sm">See plans</Button>}
              >
                Upgrade to Agency Growth for up to 20 members. Existing members keep working.
              </Alert>
            ) : null}
            <List label="Members">
              <Row
                label="Kiran Rao"
                meta="kiran@onestop.in"
                right={<Badge size="sm">Owner</Badge>}
              />
              <Row
                label="Ananya Iyer"
                meta="Designer"
                right={<Badge size="sm">Project lead</Badge>}
              />
              <Row label="Arjun Mehta" meta="Developer" right={<Badge size="sm">Member</Badge>} />
              <Row
                label="meera@onestop.in"
                meta="Invited 2 days ago · expires in 5 days"
                right={
                  <Badge size="sm" tone="warning" dot>
                    Invite pending
                  </Badge>
                }
              />
            </List>
            <Card title="What each role can see" flush>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-body-sm">
                  <caption className="sr-only">Roles and permissions</caption>
                  <thead>
                    <tr className="bg-muted text-caption text-muted-foreground">
                      {['Area', 'Owner', 'Project lead', 'Member', 'Finance'].map((h) => (
                        <th key={h} scope="col" className="px-3 py-2 text-left font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Leads, quotes, proposals', 'Edit', 'View', '—', 'View'],
                      ['Projects and gates', 'Edit, approve', 'Edit own', 'View own', 'View'],
                      ['Invoices and payments', 'Edit', 'View own projects', '—', 'Edit'],
                      ['Settings and billing', 'Edit', '—', '—', '—'],
                    ].map((r) => (
                      <tr key={r[0]} className="border-t border-border">
                        {r.map((c, k) => (
                          <td
                            key={k}
                            className={
                              k === 0 ? 'px-3 py-2 font-medium' : 'px-3 py-2 text-muted-foreground'
                            }
                          >
                            {c}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </StateView>
        </div>
      </div>
    ),
  },
  {
    id: 'S08',
    slug: 's08-invite',
    name: 'Invite acceptance',
    release: 'R0',
    priority: 'P1',
    who: 'Invited member or client',
    frame: 'bare',
    purpose: 'Join a workspace from an invite link. Primary: Accept invite.',
    states: [
      { id: 'default', label: 'Default' },
      { id: 'expired', label: 'Expired' },
      { id: 'member', label: 'Already a member' },
    ],
    render: ({ state }) => (
      <AuthCard>
        {state === 'expired' ? (
          <div className="grid gap-3">
            <h1 className="text-title-md">This invite has expired</h1>
            <p className="text-body text-muted-foreground">
              Invites work for 7 days. Ask Kiran Rao to send a new one.
            </p>
            <Button>Email Kiran</Button>
          </div>
        ) : state === 'member' ? (
          <div className="grid gap-3">
            <h1 className="text-title-md">You’re already in One Stop Solutions</h1>
            <p className="text-body text-muted-foreground">Open the workspace to carry on.</p>
            <Go to="s10-today" variant="primary">
              Open workspace
            </Go>
          </div>
        ) : (
          <div className="grid gap-4">
            <h1 className="text-title-md">Kiran Rao invited you to One Stop Solutions</h1>
            <p className="text-body text-muted-foreground">You’ll join as a Project lead.</p>
            <Input label="Your name" required />
            <Go to="s10-today" variant="primary" size="lg" block>
              Accept invite
            </Go>
          </div>
        )}
      </AuthCard>
    ),
  },
  {
    id: 'S09',
    slug: 's09-plan-limit',
    name: 'Upgrade and plan limit',
    release: 'R0',
    priority: 'P2',
    who: 'Owner',
    frame: 'app',
    role: 'owner',
    active: 'leads',
    crumbs: ['Leads'],
    purpose:
      'Shown only at a limit, never before. Viewing and exporting are never blocked. Primary: See plans.',
    states: [{ id: 'default', label: 'Default' }],
    render: () => (
      <>
        <LeadsBoard />
        <Dialog defaultOpen>
          <DialogContent
            icon={ChartLineUp}
            title="You’ve reached 25 open leads on the Free plan"
            description="Win or close a lead, or upgrade to add more. Your leads stay viewable and exportable."
            footer={
              <>
                <Button>Not now</Button>
                <Go to="s07-settings" state="limit" variant="primary">
                  See plans
                </Go>
              </>
            }
          >
            <div className="grid gap-2">
              {[
                [
                  'Agency Starter',
                  '₹1,499 a month',
                  '5 members · 10 clients with a portal · unlimited leads',
                ],
                ['Agency Growth', '₹3,499 a month', '20 members · unlimited clients and leads'],
              ].map(([plan, price, detail]) => (
                <div
                  key={plan}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <span className="grid">
                    <span className="text-body-medium">{plan}</span>
                    <span className="text-caption font-normal text-muted-foreground">{detail}</span>
                  </span>
                  <span className="text-body font-semibold tabular-nums">{price}</span>
                </div>
              ))}
              <p className="text-caption font-normal text-muted-foreground">
                Prices are proposals until the founder confirms them (open question 5).
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </>
    ),
  },
];
