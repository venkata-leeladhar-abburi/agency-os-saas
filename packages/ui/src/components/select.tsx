import { CaretDown } from '@phosphor-icons/react';
import type { ReactNode, SelectHTMLAttributes } from 'react';
import { cn } from '../lib/cn';
import { controlBox, Field, type FieldLabels } from './field';

export type SelectOption = string | { value: string; label: string; disabled?: boolean };

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  options: SelectOption[];
  /** Shown as a disabled first option when there is no value yet. */
  placeholder?: string;
  size?: 'md' | 'xl';
  labels?: FieldLabels;
  containerClassName?: string;
};

/** A native select styled like Input, for short fixed lists (currency, GST type, source). */
export function Select({
  label,
  hint,
  error,
  optional,
  options,
  placeholder,
  size = 'md',
  labels,
  className,
  containerClassName,
  id,
  required,
  disabled,
  ...props
}: SelectProps) {
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
      {({ id: selectId, describedBy, invalid }) => (
        <div
          data-invalid={invalid}
          data-disabled={disabled}
          className={cn(
            controlBox,
            'relative pr-8',
            size === 'xl' && 'min-h-control-xl text-body-lg',
            className,
          )}
        >
          <select
            id={selectId}
            required={required}
            disabled={disabled}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className="h-full min-h-[calc(var(--spacing-control-md)-2px)] min-w-0 flex-1 cursor-pointer appearance-none border-0 bg-transparent [color:inherit] outline-none focus-visible:outline-none disabled:cursor-not-allowed"
            {...props}
          >
            {placeholder ? (
              <option value="" disabled>
                {placeholder}
              </option>
            ) : null}
            {options.map((o) => {
              const option = typeof o === 'string' ? { value: o, label: o } : o;
              return (
                <option key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                </option>
              );
            })}
          </select>
          <CaretDown
            size={14}
            aria-hidden="true"
            className="pointer-events-none absolute right-2.5 text-muted-foreground"
          />
        </div>
      )}
    </Field>
  );
}
