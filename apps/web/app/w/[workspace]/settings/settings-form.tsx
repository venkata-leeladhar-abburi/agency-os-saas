'use client';

import { Alert, Card, Input } from '@agency-os/ui';
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
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} title="Settings weren’t saved" />
      {state.done ? (
        <Alert tone="success" title="Settings saved">
          New invoices use these details.
        </Alert>
      ) : null}
      <Card title="Workspace" description="Shown on proposals, invoices and the client portal.">
        <Input
          label="Workspace name"
          name="name"
          required
          defaultValue={value('name')}
          error={e.name}
        />
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
      <div className="flex justify-end">
        <Submit>Save settings</Submit>
      </div>
    </form>
  );
}
