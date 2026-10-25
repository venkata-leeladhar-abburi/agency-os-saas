'use client';

import { CircleNotch } from '@phosphor-icons/react';
import { cn } from '../lib/cn';

export type SpinnerProps = { size?: number; className?: string; label?: string };

/** A rotating ring. Decorative by default; pass `label` when it is the only sign of loading. */
export function Spinner({ size = 16, className, label }: SpinnerProps) {
  return (
    <CircleNotch
      size={size}
      className={cn('shrink-0 animate-spin motion-reduce:animate-none', className)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
    />
  );
}
