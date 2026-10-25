import type { Icon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export type EmptyStateProps = {
  /** Says what will be here: "No leads yet". */
  title: ReactNode;
  /** One sentence on why it matters. */
  children?: ReactNode;
  icon?: Icon;
  /** One primary action. */
  action?: ReactNode;
  /** An optional secondary action. */
  secondary?: ReactNode;
  /** Smaller, for use inside cards. */
  compact?: boolean;
  as?: 'h2' | 'h3';
  className?: string;
};

/** What a screen shows before it has data: a duotone icon, a title, one sentence, one action. */
export function EmptyState({
  title,
  children,
  icon: IconComponent,
  action,
  secondary,
  compact,
  as: Heading = 'h2',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'grid justify-items-center gap-2 text-center',
        compact ? 'px-4 py-8' : 'px-6 py-12',
        className,
      )}
    >
      {IconComponent ? (
        <span
          className={cn(
            'mb-2 grid place-items-center bg-brand-soft text-brand-soft-foreground inset-ring inset-ring-border',
            compact ? 'size-13 rounded-xl' : 'size-18 rounded-[22px]',
          )}
        >
          <IconComponent size={compact ? 28 : 36} weight="duotone" aria-hidden="true" />
        </span>
      ) : null}
      <Heading className="text-title-md">{title}</Heading>
      {children ? <p className="max-w-95 text-body text-muted-foreground">{children}</p> : null}
      {action || secondary ? (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {action}
          {secondary}
        </div>
      ) : null}
    </div>
  );
}
