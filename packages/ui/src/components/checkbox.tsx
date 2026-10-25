'use client';

import { Check, Minus } from '@phosphor-icons/react';
import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '../lib/cn';

export type CheckboxProps = Omit<ComponentProps<typeof CheckboxPrimitive.Root>, 'children'> & {
  label?: ReactNode;
  /** Explains the consequence of the choice. */
  description?: ReactNode;
};

/** Binary choices and multi-select in lists and tables. */
export function Checkbox({ label, description, className, id, disabled, ...props }: CheckboxProps) {
  const generated = useId();
  const checkboxId = id ?? generated;
  const descriptionId = description ? `${checkboxId}-description` : undefined;
  const box = (
    <CheckboxPrimitive.Root
      id={checkboxId}
      disabled={disabled}
      aria-describedby={descriptionId}
      className={cn(
        'peer mt-px grid size-4.5 shrink-0 cursor-pointer place-items-center rounded-xs border-[1.5px] border-input bg-card text-primary-foreground transition-[background-color,border-color] duration-120 disabled:cursor-not-allowed data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary',
        !label && className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="group grid place-items-center">
        <Check
          size={12}
          weight="bold"
          aria-hidden="true"
          className="group-data-[state=indeterminate]:hidden"
        />
        <Minus
          size={12}
          weight="bold"
          aria-hidden="true"
          className="hidden group-data-[state=indeterminate]:block"
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
  if (!label) return box;
  return (
    <div
      className={cn(
        'inline-flex items-start gap-2.5 text-body',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      {box}
      <span className="grid gap-0.5">
        <label
          htmlFor={checkboxId}
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
