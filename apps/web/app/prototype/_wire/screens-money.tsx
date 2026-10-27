'use client';

import { calculateInvoice, formatMoney } from '@agency-os/core';
import {
  Bank,
  ChatCircleDots,
  CheckCircle,
  CreditCard,
  Flag,
  Plus,
  QrCode,
  Receipt,
  UploadSimple,
  WarningOctagon,
} from '@phosphor-icons/react';
import {
  ActivityFeed,
  Alert,
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  EmptyState,
  Input,
  InvoiceSummary,
  NeedsYouItem,
  PageHeader,
  PhaseStepper,
  Progress,
  Select,
  Switch,
  Textarea,
} from '@agency-os/ui';
import { Go, List, Row, StateView } from './kit';
import { FileList, InvoicesTable, InvoiceTypeSelect, MessageThread, PortalGate } from './parts2';
import { PUBLIC, STANDARD, type ScreenDef } from './types';

const intra = calculateInvoice({
  currency: 'INR',
  supplierStateCode: '37',
  placeOfSupply: { kind: 'india', stateCode: '37' },
  lines: [
    {
      description: 'Website design and build',
      sac: '998314',
      quantity: 1,
      rateMinor: 3_500_000n,
      taxRateBp: 1800,
    },
    {
      description: 'CMS setup and training',
      sac: '998314',
      quantity: 1,
      rateMinor: 500_000n,
      taxRateBp: 1800,
    },
  ],
});

const exportLut = calculateInvoice({
  currency: 'USD',
  supplierStateCode: '37',
  placeOfSupply: { kind: 'export', country: 'US' },
  hasValidLut: true,
  exchangeRateToInr: '84.20',
  lines: [
    {
      description: 'Design sprint (5 days)',
      sac: '998391',
      quantity: 1,
      rateMinor: 200_000n,
      taxRateBp: 1800,
    },
  ],
});

const PAY_METHODS = (
  <fieldset className="grid gap-2">
    <legend className="mb-1 text-body-sm font-medium">Pay with</legend>
    {[
      { icon: QrCode, label: 'UPI', note: 'Any UPI app' },
      { icon: CreditCard, label: 'Card', note: 'Debit or credit' },
      { icon: Bank, label: 'Net banking', note: 'All major banks' },
    ].map(({ icon: IconComponent, label, note }, i) => (
      <label
        key={label}
        className="flex min-h-control-xl cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-3 has-checked:border-primary"
      >
        <input type="radio" name="method" defaultChecked={i === 0} className="accent-(--primary)" />
        <IconComponent size={20} aria-hidden="true" />
        <span className="grid">
          <span className="text-body-medium">{label}</span>
          <span className="text-caption font-normal text-muted-foreground">{note}</span>
        </span>
      </label>
    ))}
  </fieldset>
);

export const MONEY_SCREENS: ScreenDef[] = [
  {
    id: 'S32',
    slug: 's32-invoices',
    name: 'Invoices list',
    release: 'R1',
    priority: 'P1',
    who: 'Owner, finance',
    frame: 'app',
    role: 'owner',
    active: 'invoices',
    crumbs: ['Invoices'],
    pagePrimary: true,
    purpose: 'What has been billed, paid and is overdue. Primary: Create invoice.',
    states: STANDARD,
    render: ({ state }) => (
      <>
        <PageHeader
          title="Invoices"
          subtitle="₹1,20,000 pending · ₹38,500 overdue"
          actions={
            <Go to="s33-invoice-builder" variant="primary" icon={Plus}>
              Create invoice
            </Go>
          }
        />
        <StateView
          state={state}
          copy={{
            empty: {
              title: 'No invoices yet',
              text: 'Create an invoice with GST and a payment link.',
              action: 'Create invoice',
              icon: Receipt,
            },
            area: 'Invoices',
          }}
        >
          <div className="mb-3 flex flex-wrap gap-2">
            <Button size="sm">Status: All</Button>
            <Button size="sm">Client: All</Button>
            <Button size="sm">This financial year</Button>
          </div>
          <InvoicesTable />
        </StateView>
      </>
    ),
  },
  {
    id: 'S33',
    slug: 's33-invoice-builder',
    name: 'Invoice builder',
    release: 'R1',
    priority: 'P1',
    who: 'Owner, finance',
    frame: 'app',
    role: 'owner',
    active: 'invoices',
    crumbs: ['Invoices', 'New invoice'],
    pagePrimary: true,
    purpose: 'Bill correctly: type, tax, currency and numbering handled. Primary: Issue invoice.',
    states: [
      { id: 'default', label: 'Tax invoice' },
      { id: 'export', label: 'Export under LUT' },
      { id: 'no-lut', label: 'Export, no LUT' },
      { id: 'loading', label: 'Loading' },
      { id: 'error', label: 'Error' },
    ],
    render: ({ state }) => {
      const isExport = state === 'export' || state === 'no-lut';
      const totals =
        state === 'no-lut'
          ? calculateInvoice({
              currency: 'USD',
              supplierStateCode: '37',
              placeOfSupply: { kind: 'export', country: 'US' },
              lines: exportLut.lines,
            })
          : isExport
            ? exportLut
            : intra;
      return (
        <>
          <PageHeader
            title="New invoice"
            subtitle="Number OSS/26-27/017 is given when you issue it"
            actions={
              <>
                <Button>Preview PDF</Button>
                <Go to="s32-invoices" variant="primary">
                  Issue invoice
                </Go>
              </>
            }
          />
          <StateView state={state} copy={{ area: 'Invoices' }}>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <div className="grid content-start gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <InvoiceTypeSelect value={isExport ? 'Export under LUT' : 'Tax invoice'} />
                  <Select
                    label="Client"
                    options={['Acme Labs', 'Sarah Lewis']}
                    defaultValue={isExport ? 'Sarah Lewis' : 'Acme Labs'}
                  />
                  <Select
                    label="Currency"
                    options={['INR', 'USD']}
                    defaultValue={isExport ? 'USD' : 'INR'}
                  />
                  {isExport ? (
                    <Input
                      label="Exchange rate on invoice date"
                      prefix="1 USD = ₹"
                      defaultValue="84.20"
                    />
                  ) : (
                    <Input label="Due" defaultValue="In 7 days (2 Nov 2026)" />
                  )}
                </div>
                {state === 'no-lut' ? (
                  <Alert tone="warning" title="No valid LUT for this date. IGST is charged.">
                    Add your LUT in Settings, Tax and invoices, to bill exports without IGST.
                  </Alert>
                ) : null}
                <div className="grid gap-3 rounded-lg border border-border bg-card p-3">
                  {totals.lines.map((l) => (
                    <div
                      key={l.description}
                      className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_64px_minmax(0,1fr)] gap-2 max-sm:grid-cols-2"
                    >
                      <Input label="Item" defaultValue={l.description} />
                      <Input label="SAC" defaultValue={l.sac} className="font-mono" />
                      <Input label="Qty" defaultValue={String(l.quantity)} inputMode="decimal" />
                      <Input
                        label="Rate"
                        prefix={totals.currency === 'INR' ? '₹' : '$'}
                        defaultValue={formatMoney(l.rateMinor, totals.currency).replace(
                          /[^\d.,]/g,
                          '',
                        )}
                        inputMode="decimal"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" icon={Plus}>
                    Add line
                  </Button>
                  <Button size="sm">From quote</Button>
                  <Button size="sm">From milestone</Button>
                </div>
                <Switch label="Payment link (UPI, card, net banking)" defaultChecked />
                <Switch
                  label="Reminders: 3 days before, on the due date, 3 and 7 days after"
                  defaultChecked
                />
              </div>
              <InvoiceSummary
                type={isExport ? 'Export invoice' : 'Tax invoice'}
                totals={totals}
                exchangeRate={isExport ? '84.20' : undefined}
                lutArn={state === 'export' ? 'AD3609260012345' : undefined}
              />
            </div>
          </StateView>
        </>
      );
    },
  },
  {
    id: 'S34',
    slug: 's34-invoice-pay',
    name: 'Invoice view and payment page',
    release: 'R1',
    priority: 'P1',
    who: 'Client',
    frame: 'bare',
    purpose: 'See the invoice and pay it in a few taps. Primary: Pay ₹47,200.',
    states: [
      { id: 'default', label: 'Due' },
      { id: 'partly', label: 'Partly paid' },
      { id: 'overdue', label: 'Overdue' },
      { id: 'failed', label: 'Payment failed' },
      { id: 'paid', label: 'Paid' },
    ],
    render: ({ state }) => (
      <div className="mx-auto grid w-full max-w-xl gap-4">
        {state === 'paid' ? (
          <Alert tone="success" title="Paid on 25 Oct 2026">
            Thank you. A receipt was emailed to you.
          </Alert>
        ) : null}
        {state === 'overdue' ? (
          <Alert tone="warning" title="This invoice was due on 20 Oct">
            You can still pay it below.
          </Alert>
        ) : null}
        {state === 'failed' ? (
          <Alert tone="danger" title="The payment didn’t go through" icon={WarningOctagon}>
            No money was taken. Try again or choose another method.
          </Alert>
        ) : null}
        <InvoiceSummary
          type="Tax invoice"
          number="OSS/26-27/015"
          status={
            state === 'paid'
              ? 'paid'
              : state === 'overdue'
                ? 'overdue'
                : state === 'partly'
                  ? 'partially_paid'
                  : 'due'
          }
          statusText={
            state === 'paid'
              ? 'Paid'
              : state === 'overdue'
                ? '5 days overdue'
                : state === 'partly'
                  ? '₹27,200 due'
                  : 'Due 2 Nov'
          }
          totals={intra}
        />
        {state === 'paid' ? (
          <Button size="xl" block>
            Download PDF
          </Button>
        ) : (
          <Card title={state === 'partly' ? 'Pay the rest' : 'Pay now'}>
            <div className="grid gap-4">
              {state === 'partly' ? (
                <Progress value={42} label="₹20,000 of ₹47,200 paid" showValue />
              ) : null}
              {PAY_METHODS}
              <Go to="s34-invoice-pay" state="paid" variant="primary" size="xl" block>
                Pay {state === 'partly' ? '₹27,200' : '₹47,200'}
              </Go>
              <Button variant="link">Download PDF</Button>
            </div>
          </Card>
        )}
      </div>
    ),
  },
  {
    id: 'S35',
    slug: 's35-record-payment',
    name: 'Record a manual payment',
    release: 'R1',
    priority: 'P2',
    who: 'Finance',
    frame: 'app',
    role: 'finance',
    active: 'payments',
    crumbs: ['Invoices', 'OSS/26-27/016'],
    purpose:
      'Record money that came in outside Razorpay, with the FIRA for exports. Primary: Record payment.',
    states: [
      { id: 'default', label: 'Default' },
      { id: 'error', label: 'More than due' },
    ],
    render: ({ state }) => (
      <>
        <InvoiceSummary
          type="Export invoice"
          number="OSS/26-27/016"
          status="partially_paid"
          statusText="$1,200.00 due"
          totals={exportLut}
          exchangeRate="84.20"
          lutArn="AD3609260012345"
          className="max-w-xl"
        />
        <Dialog defaultOpen>
          <DialogContent
            title="Record a payment for OSS/26-27/016"
            footer={
              <>
                <Button>Cancel</Button>
                <Go to="s32-invoices" variant="primary">
                  Record payment
                </Go>
              </>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Amount"
                prefix="$"
                defaultValue={state === 'error' ? '1,500.00' : '1,200.00'}
                error={
                  state === 'error' ? 'This is more than the amount due ($1,200.00).' : undefined
                }
              />
              <Input label="Received on" defaultValue="25 Oct 2026" />
              <Select
                label="Method"
                options={['Bank transfer', 'Wise', 'PayPal', 'Cash', 'Other']}
                defaultValue="Wise"
              />
              <Input label="Reference" optional />
              <div className="grid gap-1.5 sm:col-span-2">
                <span className="text-body-sm font-medium">
                  FIRA or FIRC <span className="font-normal text-muted-foreground">Optional</span>
                </span>
                <div className="flex items-center gap-3 rounded-md border border-dashed border-border-strong px-3 py-3 text-body-sm text-muted-foreground">
                  <Button size="sm" icon={UploadSimple}>
                    Attach file
                  </Button>
                  PDF or image, for export payments
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    ),
  },
];

const welcome = (
  <Alert tone="brand" title="Welcome to your project with One Stop Solutions">
    Approve work, pay invoices and message the team here. No password needed.
  </Alert>
);

export const PORTAL_SCREENS: ScreenDef[] = [
  {
    id: 'S38',
    slug: 's38-portal-home',
    name: 'Client portal: home',
    release: 'R1',
    priority: 'P1',
    who: 'Client (phone)',
    frame: 'portal',
    active: 'home',
    purpose: 'What needs me, how far along we are, what I owe. Primary: the first Needs you item.',
    states: [
      ...PUBLIC.filter((s) => s.id !== 'error'),
      { id: 'empty', label: 'Nothing needs you' },
      { id: 'first', label: 'First visit' },
      { id: 'error', label: 'Error' },
    ],
    render: ({ state }) => (
      <StateView state={state === 'empty' ? 'default' : state} copy={{}}>
        <div>
          <p className="text-overline-caps text-muted-foreground">Beere Kesava ERP</p>
          <h1 className="text-title-xl">Namaste, Srinivas</h1>
        </div>
        {state === 'first' ? welcome : null}
        {state === 'empty' ? (
          <div className="rounded-xl border border-border bg-card">
            <EmptyState compact icon={CheckCircle} title="Nothing needs you right now">
              We’ll let you know when there’s something to approve or pay.
            </EmptyState>
          </div>
        ) : (
          <section aria-labelledby="needs" className="grid gap-2">
            <h2 id="needs" className="text-overline-caps text-muted-foreground">
              Needs you · 2
            </h2>
            <NeedsYouItem
              icon={Flag}
              title="Approve the dashboard design"
              detail="Shared today by Ananya"
              href="/prototype/s39-portal-project"
            />
            <NeedsYouItem
              icon={Receipt}
              tone="warning"
              title="Pay ₹47,200"
              detail="Milestone 2 · due 2 Nov · UPI or card"
              href="/prototype/s40-portal-invoices"
            />
          </section>
        )}
        <Card title="Progress" as="h2">
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
      </StateView>
    ),
  },
  {
    id: 'S39',
    slug: 's39-portal-project',
    name: 'Client portal: project and approval',
    release: 'R1',
    priority: 'P1',
    who: 'Client',
    frame: 'portal',
    active: 'project',
    purpose: 'Look at the work and approve it or ask for changes. Primary: Approve.',
    states: [
      { id: 'default', label: 'Waiting' },
      { id: 'changes', label: 'Ask for changes' },
      { id: 'approved', label: 'Approved' },
    ],
    render: ({ state }) => (
      <>
        <h1 className="text-title-lg">Beere Kesava ERP</h1>
        <PhaseStepper current={3} compact />
        <PortalGate approved={state === 'approved'} />
        <FileList clientView />
        {state === 'changes' ? (
          <Dialog defaultOpen>
            <DialogContent
              title="What should change?"
              description="Ananya sees your note and replies here."
              footer={
                <>
                  <Button>Cancel</Button>
                  <Go to="s39-portal-project" variant="primary">
                    Send
                  </Go>
                </>
              }
            >
              <Textarea
                label="Your changes"
                required
                rows={4}
                hint="Say what to change so the team can act on it."
              />
            </DialogContent>
          </Dialog>
        ) : null}
      </>
    ),
  },
  {
    id: 'S40',
    slug: 's40-portal-invoices',
    name: 'Client portal: invoices and pay',
    release: 'R1',
    priority: 'P1',
    who: 'Client',
    frame: 'portal',
    active: 'payments',
    purpose: 'See what I owe and pay it. Primary: Pay ₹47,200.',
    states: [
      { id: 'default', label: 'Due' },
      { id: 'paying', label: 'Choose method' },
      { id: 'success', label: 'Paid' },
      { id: 'empty', label: 'Nothing due' },
    ],
    render: ({ state }) => (
      <>
        <h1 className="text-title-lg">Payments</h1>
        {state === 'success' ? (
          <Alert tone="success" title="Payment received: ₹47,200">
            Thank you. One Stop Solutions has been told and your receipt is in your email.
          </Alert>
        ) : null}
        {state === 'empty' ? (
          <div className="rounded-xl border border-border bg-card">
            <EmptyState compact icon={CheckCircle} title="Nothing to pay">
              Invoices from One Stop Solutions show up here.
            </EmptyState>
          </div>
        ) : state === 'paying' ? (
          <Card title="Pay ₹47,200 for milestone 2">
            <div className="grid gap-4">
              {PAY_METHODS}
              <Go to="s40-portal-invoices" state="success" variant="primary" size="xl" block>
                Pay ₹47,200
              </Go>
            </div>
          </Card>
        ) : (
          <List>
            <Row
              label="Milestone 2 · OSS/26-27/015"
              meta="₹47,200 · due 2 Nov"
              right={
                state === 'success' ? (
                  <Badge size="sm" tone="success" dot>
                    Paid
                  </Badge>
                ) : (
                  <Go to="s40-portal-invoices" state="paying" variant="primary" size="sm">
                    Pay ₹47,200
                  </Go>
                )
              }
            />
            <Row
              label="Advance · OSS/26-27/009"
              meta="₹47,200 · paid 3 Oct"
              right={
                <Badge size="sm" tone="success" dot>
                  Paid
                </Badge>
              }
            />
          </List>
        )}
      </>
    ),
  },
  {
    id: 'S41',
    slug: 's41-portal-messages',
    name: 'Client portal: messages and files',
    release: 'R1',
    priority: 'P1',
    who: 'Client',
    frame: 'portal',
    active: 'messages',
    purpose: 'Talk to the team in one place. Primary: Send.',
    states: [
      { id: 'default', label: 'Thread' },
      { id: 'empty', label: 'No messages' },
    ],
    render: ({ state }) => (
      <>
        <h1 className="text-title-lg">Messages</h1>
        {state === 'empty' ? (
          <div className="rounded-xl border border-border bg-card">
            <EmptyState compact icon={ChatCircleDots} title="No messages yet">
              Ask the team anything. They see it straight away and get an email.
            </EmptyState>
          </div>
        ) : (
          <MessageThread asClient />
        )}
        <form className="grid gap-2">
          <Textarea label="Message" rows={3} />
          <div className="flex gap-2">
            <Button icon={UploadSimple} size="xl">
              Attach
            </Button>
            <Button variant="primary" size="xl" className="flex-1">
              Send
            </Button>
          </div>
        </form>
        <section aria-labelledby="files" className="grid gap-2">
          <h2 id="files" className="text-title-sm">
            Files
          </h2>
          <FileList clientView />
        </section>
      </>
    ),
  },
  {
    id: 'S42',
    slug: 's42-portal-account',
    name: 'Client portal: account',
    release: 'R1',
    priority: 'P2',
    who: 'Client',
    frame: 'portal',
    active: 'home',
    purpose: 'Contact details, an optional password, sign out. Primary: Save.',
    states: [
      { id: 'default', label: 'Default' },
      { id: 'error', label: 'Validation' },
    ],
    render: ({ state }) => (
      <>
        <h1 className="text-title-lg">Your account</h1>
        <Card title="Your details" as="h2">
          <form className="grid gap-4">
            <Input label="Name" defaultValue="Srinivas Beere" size="xl" />
            <Input
              label="Email"
              defaultValue="srinivas@beere.in"
              size="xl"
              error={
                state === 'error'
                  ? 'That email is missing an @. Check it and try again.'
                  : undefined
              }
            />
            <Input label="Phone" defaultValue="+91 90149 52056" size="xl" />
            <Input
              label="Password"
              type="password"
              optional
              size="xl"
              hint="Not needed: you can always sign in with a link."
            />
            <Select
              label="Language"
              size="xl"
              options={['English', 'हिन्दी (coming later)', 'తెలుగు (coming later)']}
              defaultValue="English"
              disabled
              hint="Hindi and Telugu come after launch."
            />
            <Button variant="primary" size="xl" block>
              Save
            </Button>
          </form>
        </Card>
        <Button size="xl" block>
          Sign out
        </Button>
      </>
    ),
  },
];
