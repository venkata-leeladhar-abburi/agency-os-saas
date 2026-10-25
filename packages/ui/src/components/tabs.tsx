'use client';

import { Tabs as TabsPrimitive } from 'radix-ui';
import type { Icon } from '@phosphor-icons/react';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

/** Switches between views of one record (Overview, Phases, Tasks, Files, Invoices). */
export function Tabs({ className, ...props }: ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root className={cn('flex flex-col gap-4', className)} {...props} />;
}

export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        'flex gap-5 overflow-x-auto border-b border-border [scrollbar-width:none]',
        className,
      )}
      {...props}
    />
  );
}

export type TabsTriggerProps = ComponentProps<typeof TabsPrimitive.Trigger> & {
  icon?: Icon;
  count?: number;
};

export function TabsTrigger({
  className,
  icon: IconComponent,
  count,
  children,
  ...props
}: TabsTriggerProps) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'relative inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-body-medium whitespace-nowrap text-muted-foreground transition-colors duration-120 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 data-[state=active]:text-foreground data-[state=active]:after:absolute data-[state=active]:after:inset-x-0 data-[state=active]:after:-bottom-px data-[state=active]:after:h-0.5 data-[state=active]:after:rounded-t-xs data-[state=active]:after:bg-primary',
        className,
      )}
      {...props}
    >
      {IconComponent ? <IconComponent size={16} aria-hidden="true" /> : null}
      {children}
      {count !== undefined ? (
        <span className="rounded-full bg-muted px-1.5 text-caption leading-4.5 tabular-nums">
          {count}
        </span>
      ) : null}
    </TabsPrimitive.Trigger>
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn('outline-none', className)} {...props} />;
}
