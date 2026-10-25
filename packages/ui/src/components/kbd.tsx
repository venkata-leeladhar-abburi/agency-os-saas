import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

/** A keyboard key or shortcut, in Geist Mono. */
export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 items-center rounded-xs border border-b-2 border-border-strong bg-card px-1.5 font-mono text-mono-sm leading-none whitespace-nowrap text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}
