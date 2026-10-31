'use client';

import { Bank, CreditCard, QrCode } from '@phosphor-icons/react';
import { useActionState } from 'react';
import { FormMessage, Submit } from '@/components/workspace/form-bits';
import { ONLINE_METHODS } from '@/lib/data/pay-methods';
import { EMPTY_FORM, type FormState } from '@/lib/form-state';

const ICONS = { upi: QrCode, card: CreditCard, net_banking: Bank };

/** Choose UPI, card or net banking, then pay. */
export function PayForm({
  action,
  label,
}: {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  label: string;
}) {
  const [state, formAction] = useActionState(action, EMPTY_FORM);
  return (
    <form action={formAction} className="grid gap-4">
      <FormMessage state={state} title="The payment didn’t go through" />
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-body-sm font-medium">Pay with</legend>
        {ONLINE_METHODS.map(({ value, label: name, note }, i) => {
          const Icon = ICONS[value];
          return (
            <label
              key={value}
              className="flex min-h-control-xl cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-3 has-checked:border-primary has-focus-visible:ring-2 has-focus-visible:ring-ring"
            >
              <input
                type="radio"
                name="method"
                value={value}
                defaultChecked={i === 0}
                className="accent-(--primary)"
              />
              <Icon size={20} aria-hidden="true" />
              <span className="grid">
                <span className="text-body-medium">{name}</span>
                <span className="text-caption font-normal text-muted-foreground">{note}</span>
              </span>
            </label>
          );
        })}
      </fieldset>
      <Submit size="xl" block>
        {label}
      </Submit>
    </form>
  );
}
