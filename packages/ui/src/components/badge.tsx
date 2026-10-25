import type { Icon } from '@phosphor-icons/react';
import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export const badgeVariants = cva(
  'inline-flex shrink-0 items-center gap-1.25 rounded-sm text-caption whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'bg-muted text-muted-foreground',
        brand: 'bg-brand-soft text-brand-soft-foreground',
        success: 'bg-success-soft text-success',
        warning: 'bg-warning-soft text-warning',
        danger: 'bg-danger-soft text-danger',
        info: 'bg-info-soft text-info',
        highlight: 'bg-highlight text-highlight-foreground',
        outline: 'bg-transparent text-muted-foreground inset-ring inset-ring-border-strong',
      },
      size: { sm: 'h-5 px-1.5', md: 'h-5.5 px-2' },
    },
    defaultVariants: { tone: 'neutral', size: 'md' },
  },
);

export type BadgeProps = HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants> & {
    /** A dot for live status (Overdue, Waiting), so meaning never rests on colour alone. */
    dot?: boolean;
    icon?: Icon;
  };

/** One or two words of status. Always a word, never colour alone. */
export function Badge({
  tone,
  size,
  dot,
  icon: IconComponent,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, size }), className)} {...props}>
      {dot ? (
        <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />
      ) : null}
      {IconComponent ? <IconComponent size={12} aria-hidden="true" className="shrink-0" /> : null}
      {children}
    </span>
  );
}
