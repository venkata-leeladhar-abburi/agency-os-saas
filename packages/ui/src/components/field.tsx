'use client';

import { WarningCircle } from '@phosphor-icons/react';
import { useId, type ReactNode } from 'react';
import { cn } from '../lib/cn';

export type FieldLabels = {
  /** Read after required fields by screen readers. */
  required?: string;
  /** Shown after the label of optional fields. */
  optional?: string;
};

export type FieldProps = {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  optional?: boolean;
  labels?: FieldLabels;
  className?: string;
  /** Receives the ids to wire the control to its label, hint and error. */
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
  id?: string;
};

/** Label above, control, then hint or error. Shared by Input, Textarea and Select. */
export function Field({
  label,
  hint,
  error,
  required,
  optional,
  labels,
  className,
  children,
  id: idProp,
}: FieldProps) {
  const generated = useId();
  const id = idProp ?? generated;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-1.5', className)}>
      {label ? (
        <label htmlFor={id} className="text-body-sm font-medium text-foreground">
          {label}
          {required ? (
            <>
              <span aria-hidden="true" className="text-danger">
                {' '}
                *
              </span>
              <span className="sr-only"> ({labels?.required ?? 'required'})</span>
            </>
          ) : null}
          {optional && !required ? (
            <span className="font-normal text-muted-foreground">
              {' '}
              {labels?.optional ?? 'Optional'}
            </span>
          ) : null}
        </label>
      ) : null}
      {children({ id, describedBy, invalid: Boolean(error) })}
      {error ? (
        <p id={errorId} className="flex items-center gap-1.5 text-caption text-danger">
          <WarningCircle size={14} aria-hidden="true" className="shrink-0" />
          {error}
        </p>
      ) : null}
      {hint ? (
        <p id={hintId} className="text-caption font-normal text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** The box shared by inputs and selects: border, focus halo, invalid and disabled looks. */
export const controlBox =
  'flex min-h-control-md items-center gap-2 rounded-md border border-input bg-card px-3 text-foreground shadow-xs transition-[border-color,box-shadow] duration-120 ease-out hover:border-muted-foreground focus-within:border-ring focus-within:ring-3 focus-within:ring-brand-soft data-[invalid=true]:border-danger data-[invalid=true]:focus-within:ring-danger-soft data-[disabled=true]:bg-muted data-[disabled=true]:opacity-70 data-[disabled=true]:hover:border-input';
