'use client';

import { DEFAULT_SERVICES } from '@agency-os/core';
import { Alert, Card, Checkbox, Input, Textarea } from '@agency-os/ui';
import Link from 'next/link';
import { useActionState } from 'react';
import { FormMessage, Submit } from '@/components/workspace/form-bits';
import type { WorkspaceSettings } from '@/lib/data/types';
import { EMPTY_FORM } from '@/lib/form-state';
import { saveSettingsAction } from './actions';

export function SettingsForm({ slug, settings }: { slug: string; settings: WorkspaceSettings }) {
  const [state, action] = useActionState(saveSettingsAction.bind(null, slug), EMPTY_FORM);
  const v = state.values;
  const e = state.errors ?? {};
  const value = (key: keyof WorkspaceSettings) => v?.[key] ?? String(settings[key] ?? '');
  const bank = (key: keyof WorkspaceSettings['bank']) => v?.[key] ?? settings.bank[key] ?? '';
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} title="Settings weren’t saved" />
      {state.done ? (
        <Alert tone="success" title="Settings saved">
          New invoices use these details.
        </Alert>
      ) : null}
      <Card title="Workspace" description="Shown on proposals, invoices and the client portal.">
        <div className="grid gap-4">
          <Input
            label="Workspace name"
            name="name"
            autoComplete="organization"
            required
            defaultValue={value('name')}
            error={e.name}
          />
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-body-sm font-medium">
              Services you offer{' '}
              <span className="font-normal text-muted-foreground">(Optional)</span>
            </legend>
            <div className="grid grid-cols-2 gap-2 max-sm:grid-cols-1">
              {DEFAULT_SERVICES.map((svc) => (
                <Checkbox
                  key={svc}
                  name="services"
                  value={svc}
                  label={svc}
                  defaultChecked={settings.services.includes(svc)}
                />
              ))}
            </div>
          </fieldset>
          <Textarea
            label="Address"
            name="address"
            autoComplete="street-address"
            optional
            rows={2}
            defaultValue={value('address')}
            error={e.address}
            hint="Printed under your name on invoices and quotes. A tax invoice needs it."
          />
          <p className="text-body-sm text-muted-foreground">
            Your logo and brand colour are in{' '}
            <Link href={`/w/${slug}/settings/branding`}>Branding</Link>.
          </p>
        </div>
      </Card>
      <Card title="Tax and invoices" description="Used to work out GST and to number invoices.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="GSTIN"
            name="gstin"
            optional
            className="font-mono"
            defaultValue={value('gstin')}
            error={e.gstin}
            hint="Leave empty if you’re not registered. Invoices become bills of supply."
          />
          <Input
            label="LUT ARN"
            name="lutArn"
            optional
            className="font-mono"
            defaultValue={value('lutArn')}
            error={e.lutArn}
            hint="Bill clients outside India without IGST."
          />
          <Input
            label="Invoice prefix"
            name="invoicePrefix"
            required
            className="font-mono"
            defaultValue={value('invoicePrefix')}
            error={e.invoicePrefix}
            hint="Numbers look like OSS/26-27/017 and restart each April."
          />
          <Input
            label="Payment terms"
            name="paymentTermsDays"
            inputMode="numeric"
            suffix="days"
            defaultValue={value('paymentTermsDays')}
            error={e.paymentTermsDays}
            hint="The due date on new invoices."
          />
        </div>
      </Card>
      <Card
        title="Bank details"
        description="Printed at the foot of every invoice, so clients can pay by bank transfer."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Name on the account"
            name="accountName"
            optional
            defaultValue={bank('accountName')}
            error={e.accountName}
          />
          <Input
            label="Account number"
            name="accountNumber"
            optional
            inputMode="numeric"
            className="font-mono"
            defaultValue={bank('accountNumber')}
            error={e.accountNumber}
          />
          <Input
            label="IFSC"
            name="ifsc"
            optional
            className="font-mono"
            defaultValue={bank('ifsc')}
            error={e.ifsc}
          />
          <Input
            label="SWIFT code"
            name="swift"
            optional
            className="font-mono"
            defaultValue={bank('swift')}
            error={e.swift}
            hint="Shown only on invoices to clients outside India."
          />
          <Textarea
            label="Invoice footer"
            name="invoiceFooter"
            rows={2}
            containerClassName="sm:col-span-2"
            defaultValue={value('invoiceFooter')}
            error={e.invoiceFooter}
            hint="Leave it empty for “Thank you for your business.”"
          />
        </div>
      </Card>
      <div className="flex justify-end">
        <Submit>Save settings</Submit>
      </div>
    </form>
  );
}
