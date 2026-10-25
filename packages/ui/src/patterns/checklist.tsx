'use client';

import { Check, X } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { IconButton } from '../components/icon-button';
import { Progress } from '../components/progress';
import { cn } from '../lib/cn';

export type ChecklistItem = {
  id: string;
  label: string;
  hint?: string;
  done?: boolean;
  /** The action for the next step, such as a button. */
  action?: ReactNode;
};

export type ChecklistProps = {
  title: string;
  items: ChecklistItem[];
  onDismiss?: () => void;
  labels?: { progress?: (done: number, total: number) => string; dismiss?: string; done?: string };
  className?: string;
};

/** Onboarding steps: done steps ticked in lime, the next step highlighted with its action. */
export function Checklist({ title, items, onDismiss, labels, className }: ChecklistProps) {
  const done = items.filter((i) => i.done).length;
  const nextId = items.find((i) => !i.done)?.id;
  return (
    <section
      className={cn(
        'rounded-lg border border-border bg-card px-5 py-4 text-card-foreground max-sm:px-4',
        className,
      )}
    >
      <header className="mb-3 grid grid-cols-[1fr_140px_auto] items-center gap-4 max-sm:grid-cols-[1fr_auto]">
        <h2 className="text-title-sm">{title}</h2>
        <Progress
          value={(done / items.length) * 100}
          valueText={labels?.progress?.(done, items.length) ?? `${done} of ${items.length}`}
          showValue
          tone="highlight"
          aria-label={title}
          className="max-sm:col-span-2 max-sm:row-start-2"
        />
        {onDismiss ? (
          <IconButton
            icon={X}
            size="sm"
            label={labels?.dismiss ?? 'Hide checklist'}
            onClick={onDismiss}
          />
        ) : (
          <span />
        )}
      </header>
      <ol className="grid gap-0.5 p-0">
        {items.map((item) => {
          const isNext = item.id === nextId;
          return (
            <li
              key={item.id}
              aria-current={isNext ? 'step' : undefined}
              className={cn('flex items-center gap-3 rounded-md p-2.5', isNext && 'bg-muted')}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'grid size-5 shrink-0 place-items-center rounded-full border-[1.5px] border-input text-highlight-foreground',
                  item.done && 'border-lime-600 bg-highlight',
                  isNext && 'border-primary ring-3 ring-brand-soft',
                )}
              >
                {item.done ? <Check size={12} weight="bold" /> : null}
              </span>
              <span className="grid flex-1 leading-4.5">
                <span
                  className={cn(
                    'text-body-medium',
                    item.done && 'text-muted-foreground line-through decoration-border-strong',
                  )}
                >
                  {item.label}
                  {item.done ? <span className="sr-only"> ({labels?.done ?? 'done'})</span> : null}
                </span>
                {item.hint && !item.done ? (
                  <span className="text-caption font-normal text-muted-foreground">
                    {item.hint}
                  </span>
                ) : null}
              </span>
              {isNext && item.action ? <span className="shrink-0">{item.action}</span> : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
