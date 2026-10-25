'use client';

import type { Icon } from '@phosphor-icons/react';
import { ToggleGroup } from 'radix-ui';
import { cn } from '../lib/cn';

export type SegmentedItem<V extends string> = { value: V; label: string; icon?: Icon };

export type SegmentedProps<V extends string> = {
  items: SegmentedItem<V>[];
  value?: V;
  defaultValue?: V;
  onValueChange?: (value: V) => void;
  /** Names the group for screen readers, e.g. "View". */
  label: string;
  className?: string;
};

/** Switches between two to four display modes of the same data. Not for page navigation. */
export function Segmented<V extends string>({
  items,
  value,
  defaultValue,
  onValueChange,
  label,
  className,
}: SegmentedProps<V>) {
  return (
    <ToggleGroup.Root
      type="single"
      aria-label={label}
      value={value}
      defaultValue={defaultValue}
      onValueChange={(next) => {
        // A segmented control always has one option selected.
        if (next) onValueChange?.(next as V);
      }}
      className={cn('inline-flex gap-0.5 rounded-md bg-muted p-0.75', className)}
    >
      {items.map(({ value: itemValue, label: itemLabel, icon: IconComponent }) => (
        <ToggleGroup.Item
          key={itemValue}
          value={itemValue}
          className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-sm border-0 bg-transparent px-2.5 text-body-sm font-medium text-muted-foreground transition-[background-color,color,box-shadow] duration-120 hover:text-foreground data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm"
        >
          {IconComponent ? <IconComponent size={14} aria-hidden="true" /> : null}
          {itemLabel}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
