import { ChartLineUp, Funnel, Plus, UploadSimple } from '@phosphor-icons/react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Alert } from './alert';
import { Button } from './button';
import { Card } from './card';
import { EmptyState } from './empty-state';
import { ToastCard } from './toast';

const meta = { title: 'Components/Surfaces' } satisfies Meta;
export default meta;

export const Cards: StoryObj = {
  render: () => (
    <div className="grid max-w-content gap-5 md:grid-cols-2">
      <Card
        title="Projects at risk"
        description="Due within 7 days and behind schedule"
        icon={ChartLineUp}
        actions={<Button size="sm">View all</Button>}
      >
        <p className="text-body text-muted-foreground">Two projects need attention this week.</p>
      </Card>
      <Card title="Pipeline" icon={Funnel} flush>
        <ul className="divide-y divide-border border-t border-border">
          {['Kite & Co · ₹80,000', 'Saffron Stays · ₹1,20,000', 'Northwind · $4,800'].map((row) => (
            <li key={row} className="px-5 py-3 text-body tabular-nums">
              {row}
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <p className="text-body">A card with no header.</p>
      </Card>
    </div>
  ),
};

export const Alerts: StoryObj = {
  render: () => (
    <div className="grid max-w-3xl gap-3">
      <Alert tone="info" title="Invoices use the new financial year">
        Numbers start again at 001 from 1 Apr 2027.
      </Alert>
      <Alert tone="success" title="Razorpay is connected">
        Clients can pay by UPI, card and net banking.
      </Alert>
      <Alert
        tone="warning"
        title="Two invoices are due this week"
        action={<Button size="sm">Send reminders</Button>}
      >
        ₹1,42,000 is waiting from 2 clients.
      </Alert>
      <Alert tone="danger" title="The payment link expired">
        Create a new link and send it to the client.
      </Alert>
      <Alert tone="brand" title="Tip" onDismiss={() => {}}>
        Press Ctrl K to jump to any lead, client or invoice.
      </Alert>
    </div>
  ),
};

export const Toasts: StoryObj = {
  render: () => (
    <div className="grid gap-3">
      <ToastCard
        title="Proposal sent"
        description="Kite & Co will get an email and a WhatsApp link."
        action={{ label: 'Undo', onClick: () => {} }}
        onClose={() => {}}
      />
      <ToastCard tone="info" title="Invoice saved as draft" onClose={() => {}} />
      <ToastCard
        tone="danger"
        title="Payment link not created"
        description="Razorpay did not answer. Try again in a minute."
        action={{ label: 'Try again', onClick: () => {} }}
      />
    </div>
  ),
};

export const EmptyStates: StoryObj = {
  name: 'Empty states',
  render: () => (
    <div className="grid max-w-content gap-5 md:grid-cols-2">
      <Card>
        <EmptyState
          icon={Funnel}
          title="No leads yet"
          action={
            <Button variant="primary" icon={Plus}>
              Add lead
            </Button>
          }
          secondary={<Button icon={UploadSimple}>Import CSV</Button>}
        >
          Add your first lead or import a CSV. Every enquiry lands here.
        </EmptyState>
      </Card>
      <Card title="Invoices">
        <EmptyState
          compact
          as="h3"
          icon={ChartLineUp}
          title="Nothing due"
          action={<Button size="sm">Create invoice</Button>}
        >
          Invoices you send show up here with their status.
        </EmptyState>
      </Card>
    </div>
  ),
};
