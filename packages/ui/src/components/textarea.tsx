'use client';

import type { ReactNode, TextareaHTMLAttributes } from 'react';
import { cn } from '../lib/cn';
import { Field, type FieldLabels } from './field';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  labels?: FieldLabels;
  containerClassName?: string;
};

/** Multi-line text for notes, scope and messages. Starts at 3 rows; resizes vertically. */
export function Textarea({
  label,
  hint,
  error,
  optional,
  labels,
  className,
  containerClassName,
  id,
  required,
  rows = 3,
  ...props
}: TextareaProps) {
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
      {({ id: textareaId, describedBy, invalid }) => (
        <textarea
          id={textareaId}
          rows={rows}
          required={required}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(
            'block w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-body text-foreground shadow-xs transition-[border-color,box-shadow] duration-120 ease-out placeholder:text-subtle-foreground hover:border-muted-foreground focus:border-ring focus:ring-3 focus:ring-brand-soft focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 aria-invalid:border-danger aria-invalid:focus:ring-danger-soft',
            className,
          )}
          {...props}
        />
      )}
    </Field>
  );
}
