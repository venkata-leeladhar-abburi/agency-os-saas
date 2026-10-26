'use client';

import { workspaceDefaults } from '@agency-os/core';
import { Alert, Button, Checkbox, Input, Select, Switch } from '@agency-os/ui';
import { useActionState, useState } from 'react';
import { setUpWorkspace, type SetupState } from './actions';

const SERVICES = [
  'Website',
  'Landing page',
  'Brand identity',
  'UI/UX design',
  'Mobile app',
  'Web app or SaaS',
  'Online store',
  'SEO',
];

const COUNTRIES = [
  { value: 'IN', label: 'India' },
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'AE', label: 'United Arab Emirates' },
  { value: 'SG', label: 'Singapore' },
  { value: 'AU', label: 'Australia' },
  { value: 'CA', label: 'Canada' },
];

export function SetupForm() {
  const [state, action, pending] = useActionState<SetupState, FormData>(setUpWorkspace, {});
  const [step, setStep] = useState(state.field === 'gstin' ? 3 : 1);
  const [name, setName] = useState('');
  const [country, setCountry] = useState('IN');
  const [gst, setGst] = useState(true);
  const defaults = workspaceDefaults(country);
  const showGst = country === 'IN';
  const last = showGst ? 3 : 2;
  const nameTooShort = name.trim().length < 2;

  return (
    <form
      action={action}
      className="grid gap-6 rounded-xl border border-border bg-card p-6 shadow-xs"
    >
      <p className="text-overline-caps text-muted-foreground">
        Step {step} of {last}
      </p>

      <div hidden={step !== 1} className="grid gap-4">
        <h1 className="text-title-md">Name your workspace</h1>
        <Input
          label="Workspace name"
          name="name"
          required
          placeholder="e.g. One Stop Solutions"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={state.field === 'name' ? state.error : undefined}
        />
        <Select
          label="Country"
          name="country"
          options={COUNTRIES}
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Currency"
            value={defaults.currency}
            disabled
            hint="From the country."
            readOnly
          />
          <Input label="Time zone" value={defaults.timeZone} disabled readOnly />
        </div>
      </div>

      <div hidden={step !== 2} className="grid gap-4">
        <h1 className="text-title-md">Services you offer</h1>
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-body-sm font-medium">
            Pick any that apply{' '}
            <span className="font-normal text-muted-foreground">(Optional)</span>
          </legend>
          <div className="grid grid-cols-2 gap-2 max-sm:grid-cols-1">
            {SERVICES.map((svc) => (
              <Checkbox key={svc} name="services" value={svc} label={svc} />
            ))}
          </div>
        </fieldset>
      </div>

      <div hidden={step !== 3 || !showGst} className="grid gap-4">
        <h1 className="text-title-md">GST details</h1>
        <Switch label="My business is registered for GST" checked={gst} onCheckedChange={setGst} />
        {gst ? <input type="hidden" name="gstRegistered" value="on" /> : null}
        {gst ? (
          <>
            <Input
              label="GSTIN"
              name="gstin"
              placeholder="e.g. 37ABCDE1234F1ZZ"
              hint="We check it and fill your state."
              error={state.field === 'gstin' ? state.error : undefined}
            />
            <Input
              label="LUT ARN"
              name="lutArn"
              optional
              hint="Only if you bill clients outside India without IGST."
            />
          </>
        ) : null}
      </div>

      {state.error && !state.field ? (
        <Alert tone="danger" title="The workspace wasn’t created">
          {state.error}
        </Alert>
      ) : null}

      <div className="flex justify-between gap-2">
        {step === 1 ? (
          <span />
        ) : step === last ? (
          <Button type="submit" variant="ghost" name="skip" value="gst" disabled={pending}>
            Skip for now
          </Button>
        ) : (
          <Button type="button" variant="ghost" onClick={() => setStep(step + 1)}>
            Skip for now
          </Button>
        )}
        {step === last ? (
          <Button type="submit" variant="primary" loading={pending} disabled={nameTooShort}>
            Create workspace
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            disabled={step === 1 && nameTooShort}
            onClick={() => setStep(step + 1)}
          >
            Continue
          </Button>
        )}
      </div>
    </form>
  );
}
