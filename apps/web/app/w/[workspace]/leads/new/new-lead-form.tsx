'use client';

import { DEFAULT_SERVICES, LEAD_SOURCE_LABELS, LEAD_SOURCES } from '@agency-os/core';
import { buttonVariants, Input, Select, Textarea } from '@agency-os/ui';
import Link from 'next/link';
import { useActionState } from 'react';
import { FormMessage, Submit } from '@/components/workspace/form-bits';
import { PlanLimitDialog } from '@/components/workspace/plan-limit';
import { EMPTY_FORM } from '@/lib/form-state';
import { createLeadAction } from '../actions';

export function NewLeadForm({ slug, defaultFollowUp }: { slug: string; defaultFollowUp: string }) {
  const [state, action] = useActionState(createLeadAction.bind(null, slug), EMPTY_FORM);
  const v = state.values ?? {};
  const e = state.errors ?? {};
  return (
    <form action={action} className="grid gap-6" noValidate>
      <FormMessage state={state} title="The lead wasn’t added" />
      <PlanLimitDialog limit={state.limit} slug={slug} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Name"
          name="name"
          required
          autoComplete="off"
          placeholder="e.g. Kiran Kumar"
          defaultValue={v.name}
          error={e.name}
        />
        <Input
          label="Company"
          name="company"
          optional
          placeholder="e.g. Kite & Co"
          defaultValue={v.company}
        />
        <Input
          label="Phone or email"
          name="contact"
          required
          placeholder="e.g. 90149 52056"
          defaultValue={v.contact}
          error={e.contact}
        />
        <Select
          label="Source"
          name="source"
          options={LEAD_SOURCES.map((s) => ({ value: s, label: LEAD_SOURCE_LABELS[s] }))}
          defaultValue={v.source ?? 'referral'}
          error={e.source}
        />
        <Select
          label="Service"
          name="service"
          options={[...DEFAULT_SERVICES]}
          defaultValue={v.service ?? 'Website'}
          error={e.service}
        />
        <Input
          label="Value"
          name="value"
          prefix="₹"
          inputMode="numeric"
          optional
          placeholder="e.g. 80,000"
          defaultValue={v.value}
          error={e.value}
        />
        <Input
          label="Follow-up"
          name="followUpOn"
          type="date"
          defaultValue={v.followUpOn ?? defaultFollowUp}
          hint="The next working day, at 11:00 am."
          error={e.followUpOn}
        />
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
        <Link href={`/w/${slug}/leads`} className={buttonVariants({ variant: 'secondary' })}>
          Cancel
        </Link>
        <Submit>Add lead</Submit>
      </div>
    </form>
  );
}
