'use client';

import { Check, Flag } from '@phosphor-icons/react';
import { cn } from '../lib/cn';

export const DEFAULT_PHASES = [
  'Connect',
  'Discover',
  'Define',
  'Design',
  'Build',
  'Launch',
  'Grow',
];
/** Phases that end with a client sign-off in the seven-phase template. */
export const DEFAULT_GATES = [0, 2, 3, 4, 5];

export type PhaseStepperLabels = {
  done?: string;
  current?: string;
  skipped?: string;
  gate?: string;
  /** "phase 5 of 7" */
  position?: (n: number, total: number) => string;
  /** "Next: Launch" */
  next?: (name: string) => string;
  title?: string;
};

export type PhaseStepperProps = {
  /** Index of the phase in progress. */
  current: number;
  skipped?: number[];
  gates?: number[];
  phases?: string[];
  /** Marks only, with a caption: for the client portal and cards. */
  compact?: boolean;
  labels?: PhaseStepperLabels;
  className?: string;
};

/** A project's route through its phases. Flags mark phases with a client sign-off. */
export function PhaseStepper({
  current,
  skipped = [],
  gates = DEFAULT_GATES,
  phases = DEFAULT_PHASES,
  compact = false,
  labels,
  className,
}: PhaseStepperProps) {
  const next = phases.slice(current + 1).find((_, i) => !skipped.includes(current + 1 + i));
  return (
    <div className={cn('grid gap-2', className)}>
      <ol
        aria-label={labels?.title ?? 'Project phases'}
        // Scrolls sideways on phones, so it must be reachable by keyboard (WCAG 2.1.1).
        tabIndex={compact ? undefined : 0}
        className={cn('grid p-0', compact ? 'overflow-visible' : 'overflow-x-auto')}
        style={{
          gridTemplateColumns: `repeat(${phases.length}, minmax(${compact ? '0' : '72px'}, 1fr))`,
        }}
      >
        {phases.map((name, i) => {
          const isSkipped = skipped.includes(i);
          const state = isSkipped
            ? 'skipped'
            : i < current
              ? 'done'
              : i === current
                ? 'current'
                : 'upcoming';
          const stateText =
            state === 'done'
              ? (labels?.done ?? 'Done')
              : state === 'current'
                ? (labels?.current ?? 'In progress')
                : state === 'skipped'
                  ? (labels?.skipped ?? 'Skipped')
                  : '';
          const connectorDone = state === 'done' || state === 'current';
          return (
            <li
              key={name}
              aria-current={state === 'current' ? 'step' : undefined}
              className="relative grid justify-items-center gap-1.5 pt-0.5 text-center"
            >
              {i > 0 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute top-3 right-[calc(50%+14px)] left-[calc(-50%+14px)] h-0 border-t-2',
                    connectorDone ? 'border-primary' : 'border-border-strong',
                    isSkipped && 'border-dashed border-border-strong',
                  )}
                />
              ) : null}
              <span
                aria-hidden="true"
                className={cn(
                  'relative z-1 grid size-5.5 place-items-center rounded-full border-2 border-input bg-card text-primary-foreground',
                  state === 'done' && 'border-primary bg-primary',
                  state === 'current' && 'border-primary ring-4 ring-brand-soft',
                  state === 'skipped' && 'border-dashed',
                )}
              >
                {state === 'done' ? <Check size={12} weight="bold" /> : null}
                {state === 'current' ? <span className="size-2 rounded-full bg-primary" /> : null}
              </span>
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-body-sm font-medium text-muted-foreground',
                  (state === 'done' || state === 'current') && 'text-foreground',
                  state === 'skipped' && 'line-through',
                  compact && 'sr-only',
                )}
              >
                {name}
                {gates.includes(i) ? (
                  <>
                    <Flag size={12} aria-hidden="true" className="text-muted-foreground" />
                    <span className="sr-only">({labels?.gate ?? 'client sign-off'})</span>
                  </>
                ) : null}
                {compact && stateText ? <span className="sr-only">: {stateText}</span> : null}
              </span>
              {compact ? null : (
                <span
                  className={cn(
                    'min-h-3.5 text-[11px] leading-3.5 text-muted-foreground',
                    state === 'current' && 'font-medium text-brand-soft-foreground',
                  )}
                >
                  {stateText}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {compact ? (
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-body-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{phases[current]}</span>
          <span>
            ·{' '}
            {labels?.position?.(current + 1, phases.length) ??
              `phase ${current + 1} of ${phases.length}`}
          </span>
          {next ? <span className="ml-auto">{labels?.next?.(next) ?? `Next: ${next}`}</span> : null}
        </p>
      ) : null}
    </div>
  );
}
