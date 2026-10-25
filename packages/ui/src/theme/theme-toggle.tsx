'use client';

import { Desktop, Moon, Sun } from '@phosphor-icons/react';
import { cn } from '../lib/cn';

export type ThemeChoice = 'light' | 'dark' | 'system';

const OPTIONS = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Desktop },
] as const;

export type ThemeToggleProps = {
  value: ThemeChoice;
  onValueChange: (value: ThemeChoice) => void;
  className?: string;
};

/** Light, dark or system theme. Rebuilt on Segmented in M2. */
export function ThemeToggle({ value, onValueChange, className }: ThemeToggleProps) {
  return (
    <div
      role="group"
      aria-label="Theme"
      className={cn('inline-flex gap-1 rounded-md border border-border bg-muted p-1', className)}
    >
      {OPTIONS.map(({ value: option, label, Icon }) => {
        const selected = option === value;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={selected}
            onClick={() => onValueChange(option)}
            className={cn(
              'inline-flex h-control-sm items-center gap-2 rounded-sm px-3 text-body-medium transition-colors duration-[120ms] ease-out',
              selected
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon size={16} aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
