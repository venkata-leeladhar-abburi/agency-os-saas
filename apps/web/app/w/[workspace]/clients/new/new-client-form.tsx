'use client';

import { buttonVariants, Input, Select, Textarea } from '@agency-os/ui';
import Link from 'next/link';
import { useActionState, useState } from 'react';
import { FormMessage, Submit } from '@/components/workspace/form-bits';
import { EMPTY_FORM } from '@/lib/form-state';
import { CLIENT_COUNTRIES } from '@/lib/forms';
import { createClientAction } from '../actions';

export function NewClientForm({ slug }: { slug: string }) {
  const [state, action] = useActionState(createClientAction.bind(null, slug), EMPTY_FORM);
  const v = state.values ?? {};
  const e = state.errors ?? {};
  const [country, setCountry] = useState(v.country ?? 'IN');
  const india = country === 'IN';
  return (
    <form action={action} className="grid gap-6" noValidate>
      <FormMessage state={state} title="The client wasn’t added" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Client name"
          name="name"
          required
          placeholder="e.g. Kite & Co"
          defaultValue={v.name}
          error={e.name}
          containerClassName="sm:col-span-2"
        />
        <Input
          label="Contact person"
          name="contactName"
          required
          placeholder="e.g. Kiran Kumar"
          defaultValue={v.contactName}
          error={e.contactName}
        />
        <Input
          label="Email"
          name="email"
          type="email"
          optional
          placeholder="e.g. kiran@kiteandco.in"
          defaultValue={v.email}
          error={e.email}
          hint="The client portal link goes here."
        />
        <Input label="Phone" name="phone" type="tel" optional defaultValue={v.phone} />
        <Input label="City" name="city" optional defaultValue={v.city} />
        <Select
          label="Country"
          name="country"
          options={CLIENT_COUNTRIES.map((c) => ({ value: c.value, label: c.label }))}
          value={country}
          onChange={(ev) => setCountry(ev.target.value)}
          hint={`Invoices in ${CLIENT_COUNTRIES.find((c) => c.value === country)?.currency}.`}
          error={e.country}
        />
        {india ? (
          <Input
            label="GSTIN"
            name="gstin"
            optional
            placeholder="e.g. 29ABCDE1234F1ZW"
            defaultValue={v.gstin}
            error={e.gstin}
            hint="Sets the client’s state, so invoices charge the right GST."
            className="font-mono"
          />
        ) : null}
        {india ? (
          <Input
            label="State code"
            name="stateCode"
            optional
            inputMode="numeric"
            placeholder="e.g. 29"
            defaultValue={v.stateCode}
            error={e.stateCode}
            hint="Only needed without a GSTIN."
          />
        ) : null}
        <Textarea
          label="Notes"
          name="notes"
          optional
          rows={3}
          defaultValue={v.notes}
          containerClassName="sm:col-span-2"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Link href={`/w/${slug}/clients`} className={buttonVariants({ variant: 'secondary' })}>
          Cancel
        </Link>
        <Submit>Add client</Submit>
      </div>
    </form>
  );
}
