'use client';

import { Progress as ProgressPrimitive } from 'radix-ui';
import { useId, type ReactNode } from 'react';
import { cn } from '../lib/cn';

const TONES = {
  default: 'bg-primary',
  success: 'bg-green-600',
  danger: 'bg-red-600',
  highlight: 'bg-lime-500',
} as const;

export type ProgressProps = {
  /** 0 to 100. */
  value: number;
  label?: ReactNode;
  showValue?: boolean;
  /** Replaces the percentage, e.g. "3 of 5". */
  valueText?: string;
  tone?: keyof typeof TONES;
  className?: string;
};

/** A thin bar for progress toward a known end: onboarding, budget used, a phase. */
export function Progress({
  value,
  label,
  showValue,
  valueText,
  tone = 'default',
  className,
}: ProgressProps) {
  const id = useId();
  const clamped = Math.min(100, Math.max(0, value));
  const text = valueText ?? `${Math.round(clamped)}%`;
  return (
    <div className={cn('grid min-w-30 gap-1.5', className)}>
      {label || showValue ? (
        <div className="flex justify-between gap-3 text-body-sm text-muted-foreground">
          {label ? <span id={`${id}-label`}>{label}</span> : <span />}
          {showValue ? <span className="tabular-nums">{text}</span> : null}
        </div>
      ) : null}
      <ProgressPrimitive.Root
        value={clamped}
        aria-labelledby={label ? `${id}-label` : undefined}
        aria-valuetext={text}
        className="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <ProgressPrimitive.Indicator
          className={cn(
            'h-full rounded-full transition-[width] duration-400 ease-out',
            TONES[tone],
          )}
          style={{ width: `${clamped}%` }}
        />
      </ProgressPrimitive.Root>
    </div>
  );
}
