'use client';

import { Desktop, Moon, Sun } from '@phosphor-icons/react';
import { Segmented } from '../components/segmented';

export type ThemeChoice = 'light' | 'dark' | 'system';

export type ThemeToggleProps = {
  value: ThemeChoice;
  onValueChange: (value: ThemeChoice) => void;
  label?: string;
  labels?: Partial<Record<ThemeChoice, string>>;
  className?: string;
};

/** Light, dark or the device setting. */
export function ThemeToggle({
  value,
  onValueChange,
  label = 'Theme',
  labels,
  className,
}: ThemeToggleProps) {
  return (
    <Segmented<ThemeChoice>
      label={label}
      value={value}
      onValueChange={onValueChange}
      className={className}
      items={[
        { value: 'light', label: labels?.light ?? 'Light', icon: Sun },
        { value: 'dark', label: labels?.dark ?? 'Dark', icon: Moon },
        { value: 'system', label: labels?.system ?? 'System', icon: Desktop },
      ]}
    />
  );
}
