'use client';

import { Alert, Button, Checkbox, Input, Select, Switch } from '@agency-os/ui';
import { useActionState, useState } from 'react';
import {
  createWorkspaceStep,
  finishSetup,
  saveGstStep,
  saveServicesStep,
  type StepState,
} from './actions';

const COUNTRIES = [
  { value: 'IN', label: 'India', currency: 'INR', zone: 'Asia/Kolkata (IST)' },
  { value: 'US', label: 'United States', currency: 'USD', zone: 'America/New_York' },
  { value: 'GB', label: 'United Kingdom', currency: 'GBP', zone: 'Europe/London' },
  { value: 'AE', label: 'United Arab Emirates', currency: 'AED', zone: 'Asia/Dubai' },
  { value: 'SG', label: 'Singapore', currency: 'SGD', zone: 'Asia/Singapore' },
  { value: 'AU', label: 'Australia', currency: 'AUD', zone: 'Australia/Sydney' },
  { value: 'CA', label: 'Canada', currency: 'CAD', zone: 'America/Toronto' },
];

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

const none: StepState = {};

export function SetupForm({ existingWorkspaceId }: { existingWorkspaceId?: string }) {
  const [workspaceId, setWorkspaceId] = useState(existingWorkspaceId);
  const [step, setStep] = useState(existingWorkspaceId ? 2 : 1);
  const [country, setCountry] = useState('IN');
  const [registered, setRegistered] = useState(true);
  const picked = COUNTRIES.find((c) => c.value === country) ?? COUNTRIES[0]!;

  const [s1, act1, pending1] = useActionState(async (prev: StepState, form: FormData) => {
    const next = await createWorkspaceStep(prev, form);
    if (next.workspaceId) {
      setWorkspaceId(next.workspaceId);
      setStep(2);
    }
    return next;
  }, none);
  const [s2, act2, pending2] = useActionState(async (prev: StepState, form: FormData) => {
    const next = await saveServicesStep(prev, form);
    if (!next.error) setStep(3);
    return next;
  }, none);
  const [s3, act3, pending3] = useActionState(saveGstStep, none);

  return (
    <div className="mx-auto grid w-full max-w-lg gap-6 rounded-xl border border-border bg-card p-6 shadow-xs">
      <p className="text-overline-caps text-muted-foreground">Step {step} of 3</p>

      {step === 1 ? (
        <form action={act1} className="grid gap-4">
          <h1 className="text-title-md">Name your workspace</h1>
          <Input
            label="Workspace name"
            name="name"
            required
            placeholder="One Stop Solutions"
            error={s1.fieldErrors?.name}
          />
          <Select
            label="Country"
            name="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            options={COUNTRIES.map(({ value, label }) => ({ value, label }))}
            error={s1.fieldErrors?.country}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Currency"
              value={picked.currency}
              disabled
              readOnly
              hint="From the country."
            />
            <Input label="Time zone" value={picked.zone} disabled readOnly />
          </div>
          {s1.error ? (
            <Alert tone="danger" title="The workspace wasn’t created">
              {s1.error}
            </Alert>
          ) : null}
          <div className="flex justify-end">
            <Button type="submit" variant="primary" loading={pending1}>
              Continue
            </Button>
          </div>
        </form>
      ) : null}

      {step === 2 ? (
        <form action={act2} className="grid gap-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <h1 className="text-title-md">Services you offer</h1>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-body-sm font-medium">Pick any that apply</legend>
            <div className="grid grid-cols-2 gap-2">
              {SERVICES.map((service) => (
                <Checkbox key={service} name="services" value={service} label={service} />
              ))}
            </div>
          </fieldset>
          {s2.error ? (
            <Alert tone="danger" title="Your services weren’t saved">
              {s2.error}
            </Alert>
          ) : null}
          <div className="flex justify-between gap-2">
            <Button type="button" variant="ghost" onClick={() => setStep(3)}>
              Skip for now
            </Button>
            <Button type="submit" variant="primary" loading={pending2}>
              Continue
            </Button>
          </div>
        </form>
      ) : null}

      {step === 3 ? (
        <form action={act3} className="grid gap-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <h1 className="text-title-md">GST details</h1>
          <Switch
            label="My business is registered for GST"
            name="registered"
            checked={registered}
            onCheckedChange={setRegistered}
          />
          {registered ? (
            <Input
              label="GSTIN"
              name="gstin"
              placeholder="37ABCDE1234F1ZZ"
              hint="We check it and fill your state."
              error={s3.fieldErrors?.gstin}
            />
          ) : null}
          <Input
            label="LUT ARN"
            name="lutArn"
            optional
            hint="Only if you bill clients outside India without IGST."
          />
          {s3.error ? (
            <Alert tone="danger" title="Your GST details weren’t saved">
              {s3.error}
            </Alert>
          ) : null}
          <div className="flex justify-between gap-2">
            <Button type="submit" variant="ghost" formAction={finishSetup} formNoValidate>
              Skip for now
            </Button>
            <Button type="submit" variant="primary" loading={pending3}>
              Continue
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
