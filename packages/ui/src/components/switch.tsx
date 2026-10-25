'use client';

import { Switch as SwitchPrimitive } from 'radix-ui';
import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '../lib/cn';

export type SwitchProps = Omit<ComponentProps<typeof SwitchPrimitive.Root>, 'children'> & {
  label?: ReactNode;
  description?: ReactNode;
};

/** Settings that take effect immediately. Use a Checkbox when the form has a Save button. */
export function Switch({ label, description, className, id, disabled, ...props }: SwitchProps) {
  const generated = useId();
  const switchId = id ?? generated;
  const descriptionId = description ? `${switchId}-description` : undefined;
  const control = (
    <SwitchPrimitive.Root
      id={switchId}
      disabled={disabled}
      aria-describedby={descriptionId}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full bg-input transition-colors duration-200 disabled:cursor-not-allowed data-[state=checked]:bg-primary',
        !label && className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-4 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out data-[state=checked]:translate-x-4.5" />
    </SwitchPrimitive.Root>
  );
  if (!label) return control;
  return (
    <div
      className={cn(
        'inline-flex items-start gap-2.5 text-body',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      {control}
      <span className="grid gap-0.5">
        <label
          htmlFor={switchId}
          className={cn('cursor-pointer', disabled && 'cursor-not-allowed')}
        >
          {label}
        </label>
        {description ? (
          <span id={descriptionId} className="text-body-sm text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
    </div>
  );
}
