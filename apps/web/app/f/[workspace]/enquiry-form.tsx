'use client';

import { CheckCircle } from '@phosphor-icons/react';
import { DEFAULT_SERVICES } from '@agency-os/core';
import { Checkbox, Input, Select, Textarea } from '@agency-os/ui';
import { useActionState } from 'react';
import { FormMessage, Submit } from '@/components/workspace/form-bits';
import { EMPTY_FORM } from '@/lib/form-state';
import { BUDGET_RANGES } from '@/lib/forms';
import { enquiryAction } from './actions';

export function EnquiryForm({ workspace }: { workspace: string }) {
  const [state, action] = useActionState(enquiryAction, EMPTY_FORM);
  const v = state.values ?? {};
  const e = state.errors ?? {};
  if (state.done)
    return (
      <div className="grid gap-2 text-center" role="status">
        <CheckCircle
          size={36}
          weight="duotone"
          aria-hidden="true"
          className="mx-auto text-success"
        />
        <h1 className="text-title-md">Thanks, we’ve got your enquiry</h1>
        <p className="text-body text-muted-foreground">
          {workspace} usually replies within a working day.
        </p>
      </div>
    );
  return (
    <form action={action} className="grid gap-4" noValidate>
      <h1 className="text-title-md">Tell us about your project</h1>
      <FormMessage state={state} title="Your enquiry wasn’t sent" />
      <Input
        label="Your name"
        name="name"
        required
        size="xl"
        autoComplete="name"
        defaultValue={v.name}
        error={e.name}
      />
      <Input
        label="Email or phone"
        name="contact"
        required
        autoComplete="email"
        size="xl"
        defaultValue={v.contact}
        error={e.contact}
        hint="We use it only to reply to you."
      />
      <Input
        label="Company"
        name="company"
        optional
        size="xl"
        autoComplete="organization"
        defaultValue={v.company}
      />
      <Select
        label="What do you need?"
        name="service"
        size="xl"
        options={[...DEFAULT_SERVICES, 'Something else']}
        defaultValue={v.service ?? 'Website'}
        error={e.service}
      />
      <Select
        label="Budget"
        name="budget"
        optional
        size="xl"
        placeholder="Choose a range"
        options={[...BUDGET_RANGES]}
        defaultValue={v.budget ?? ''}
        error={e.budget}
      />
      <Textarea
        label="Message"
        name="message"
        required
        rows={4}
        defaultValue={v.message}
        error={e.message}
      />
      <div className="hidden" aria-hidden="true">
        <label>
          Leave this empty
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="grid gap-1">
        <Checkbox
          name="consent"
          label="You can contact me about this enquiry"
          defaultChecked={v.consent === 'on'}
        />
        {e.consent ? <p className="text-body-sm text-danger">{e.consent}</p> : null}
      </div>
      <Submit size="xl" block>
        Send enquiry
      </Submit>
    </form>
  );
}
