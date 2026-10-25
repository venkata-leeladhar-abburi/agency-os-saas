import type { Icon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export type ActivityItem = {
  id: string;
  icon: Icon;
  tone?: 'neutral' | 'brand' | 'success' | 'warning';
  who: string;
  /** What happened, after the name: "sent the proposal". */
  text: ReactNode;
  target?: string;
  /** Display time: "2 h ago", "Thu", "14 Oct". */
  when: string;
  /** Machine-readable time for the <time> element. */
  dateTime?: string;
};

const TONES = {
  neutral: 'bg-muted text-muted-foreground',
  brand: 'bg-brand-soft text-brand-soft-foreground',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
} as const;

/** What happened on a record: who, what, when. Newest first. */
export function ActivityFeed({ items, className }: { items: ActivityItem[]; className?: string }) {
  return (
    <ol className={cn('grid gap-4 p-0', className)}>
      {items.map(
        ({ id, icon: IconComponent, tone = 'neutral', who, text, target, when, dateTime }) => (
          <li key={id} className="grid grid-cols-[28px_1fr_auto] items-start gap-3">
            <span className={cn('grid size-7 place-items-center rounded-full', TONES[tone])}>
              <IconComponent size={14} aria-hidden="true" />
            </span>
            <p className="mt-1 text-body text-muted-foreground">
              <span className="font-medium text-foreground">{who}</span> {text}
              {target ? <span className="font-medium text-foreground"> {target}</span> : null}
            </p>
            <time
              dateTime={dateTime}
              className="mt-1 text-caption font-normal whitespace-nowrap text-muted-foreground"
            >
              {when}
            </time>
          </li>
        ),
      )}
    </ol>
  );
}
