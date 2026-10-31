'use client';

import type { Icon } from '@phosphor-icons/react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';
import { controlBox, Field, type FieldLabels } from './field';

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> & {
  label?: ReactNode;
  hint?: ReactNode;
  /** Says what is wrong and how to fix it. Sets aria-invalid. */
  error?: ReactNode;
  optional?: boolean;
  /** Text before the value, such as ₹ or https:// */
  prefix?: ReactNode;
  /** Text after the value, such as % or .com */
  suffix?: ReactNode;
  icon?: Icon;
  /** `xl` (44px, 16px text) for the client portal and phones. */
  size?: 'md' | 'xl';
  labels?: FieldLabels;
  containerClassName?: string;
};

/** Single-line text with a label above. Placeholders are examples, never labels. */
export function Input({
  label,
  hint,
  error,
  optional,
  prefix,
  suffix,
  icon: IconComponent,
  size = 'md',
  labels,
  className,
  containerClassName,
  id,
  required,
  disabled,
  ...props
}: InputProps) {
  return (
    <Field
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
      optional={optional}
      labels={labels}
      className={containerClassName}
    >
      {({ id: inputId, describedBy, invalid }) => (
        <div
          data-invalid={invalid}
          data-disabled={disabled}
          className={cn(controlBox, size === 'xl' && 'min-h-control-xl text-body-lg', className)}
        >
          {IconComponent ? (
            <IconComponent
              size={16}
              aria-hidden="true"
              className="shrink-0 text-muted-foreground"
            />
          ) : null}
          {prefix ? <span className="shrink-0 text-muted-foreground">{prefix}</span> : null}
          <input
            id={inputId}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            required={required}
            disabled={disabled}
            className={cn(
              'h-full min-h-[calc(var(--spacing-control-md)-2px)] w-full min-w-0 flex-1 border-0 bg-transparent text-body [color:inherit] outline-none placeholder:text-subtle-foreground focus-visible:outline-none disabled:cursor-not-allowed',
              size === 'xl' && 'text-body-lg',
            )}
            {...props}
          />
          {suffix ? <span className="shrink-0 text-muted-foreground">{suffix}</span> : null}
        </div>
      )}
    </Field>
  );
}
