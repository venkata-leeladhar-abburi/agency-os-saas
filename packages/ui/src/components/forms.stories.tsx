import { Globe, MagnifyingGlass } from '@phosphor-icons/react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack } from './_story';
import { Checkbox } from './checkbox';
import { Input } from './input';
import { Select } from './select';
import { Switch } from './switch';
import { Textarea } from './textarea';

const meta = { title: 'Components/Forms' } satisfies Meta;
export default meta;

export const Inputs: StoryObj = {
  render: () => (
    <div className="grid max-w-content gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <Input label="Client name" required placeholder="Kite & Co" />
      <Input
        label="Budget"
        prefix="₹"
        inputMode="numeric"
        placeholder="80,000"
        hint="Before GST."
      />
      <Input
        label="GSTIN"
        defaultValue="36ABCDE1234F1Z"
        error="A GSTIN has 15 characters. This one has 14."
        className="font-mono"
      />
      <Input label="Search" icon={MagnifyingGlass} placeholder="Leads, clients, invoices" />
      <Input label="Website" optional prefix="https://" placeholder="kiteandco.in" />
      <Input label="Invoice number" disabled defaultValue="OSS/26-27/014" />
      <Input label="Discount" suffix="%" inputMode="decimal" defaultValue="10" />
      <Input label="Email code" size="xl" inputMode="numeric" placeholder="6-digit code" />
      <Input label="Domain" icon={Globe} suffix=".in" defaultValue="kiteandco" />
    </div>
  ),
};

export const TextareaAndSelect: StoryObj = {
  name: 'Textarea and select',
  render: () => (
    <div className="grid max-w-content gap-5 sm:grid-cols-2">
      <Textarea
        label="Scope"
        placeholder="What the client gets, in plain words"
        hint="Shown on the proposal."
      />
      <Textarea label="Lost reason" error="Add a short reason so the team can learn from it." />
      <Select label="Currency" options={['INR', 'USD', 'GBP', 'EUR', 'AED']} defaultValue="INR" />
      <Select
        label="GST type"
        placeholder="Choose a GST type"
        defaultValue=""
        options={[
          { value: 'intra', label: 'CGST + SGST (same state)' },
          { value: 'inter', label: 'IGST (other state)' },
          { value: 'lut', label: 'Export under LUT (no GST)' },
        ]}
        hint="Set from the client's state when you pick a client."
      />
      <Select
        label="Lead source"
        options={['Website', 'Referral', 'Instagram']}
        disabled
        defaultValue="Referral"
      />
      <Select
        label="Owner"
        error="Choose who follows up on this lead."
        placeholder="Choose a person"
        defaultValue=""
        options={['Kiran Rao', 'Ananya Iyer']}
      />
    </div>
  ),
};

export const ChoiceControls: StoryObj = {
  name: 'Checkbox and switch',
  render: () => (
    <Stack>
      <div className="flex flex-col gap-4">
        <Checkbox label="Send a copy to me" defaultChecked />
        <Checkbox
          label="Export under LUT"
          description="No GST is charged. The invoice states the LUT number."
        />
        <Checkbox label="Select all leads" checked="indeterminate" />
        <Checkbox label="Archived (read only)" disabled defaultChecked />
        <Checkbox aria-label="Select row" />
      </div>
      <div className="flex flex-col gap-4">
        <Switch
          label="Payment reminders"
          description="Remind the client 3 days before and on the due date."
          defaultChecked
        />
        <Switch label="Show prices with GST" />
        <Switch label="Two-step sign-in (set by the owner)" disabled defaultChecked />
      </div>
    </Stack>
  ),
};
