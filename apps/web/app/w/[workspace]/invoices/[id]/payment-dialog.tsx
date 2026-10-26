'use client';

import { Money } from '@phosphor-icons/react';
import { Button, Dialog, DialogContent, Input, Select } from '@agency-os/ui';
import { useActionState, useState } from 'react';
import { FormMessage, Submit } from '@/components/workspace/form-bits';
import { EMPTY_FORM } from '@/lib/form-state';
import { PAYMENT_METHODS } from '@/lib/forms';
import { recordPaymentAction } from '../actions';

export function PaymentDialog({
  slug,
  id,
  number,
  due,
  dueText,
  today,
  isExport,
}: {
  slug: string;
  id: string;
  number: string;
  /** The amount due, as a plain number for the field: "27200.00". */
  due: string;
  dueText: string;
  today: string;
  isExport: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(recordPaymentAction.bind(null, slug, id), EMPTY_FORM);
  const v = state.values ?? {};
  const e = state.errors ?? {};
  return (
    <>
      <Button variant="primary" icon={Money} onClick={() => setOpen(true)}>
        Record payment
      </Button>
      <Dialog open={open || Boolean(state.errors || state.message)} onOpenChange={setOpen}>
        <DialogContent title={`Record a payment for ${number}`} description={`${dueText} is due.`}>
          <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
            <div className="sm:col-span-2">
              <FormMessage state={state} title="The payment wasn’t recorded" />
            </div>
            <Input
              label="Amount"
              name="amount"
              inputMode="decimal"
              defaultValue={v.amount ?? due}
              error={e.amount}
            />
            <Input
              label="Received on"
              name="receivedOn"
              type="date"
              max={today}
              defaultValue={v.receivedOn ?? today}
              error={e.receivedOn}
            />
            <Select
              label="Method"
              name="method"
              options={PAYMENT_METHODS}
              defaultValue={v.method ?? (isExport ? 'wise' : 'bank_transfer')}
              error={e.method}
            />
            <Input
              label="Reference"
              name="reference"
              optional
              defaultValue={v.reference}
              placeholder="e.g. UTR or UPI ref"
            />
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button onClick={() => setOpen(false)}>Cancel</Button>
              <Submit>Record payment</Submit>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
