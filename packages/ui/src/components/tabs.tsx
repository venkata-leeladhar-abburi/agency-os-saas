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

export type TabLink = { href: string; label: string; count?: number; active?: boolean };

/** Tabs that are separate pages (a record's Overview, Phases, Tasks …): links with aria-current. */
export function TabLinks({
  items,
  label,
  linkAs,
  className,
}: {
  items: TabLink[];
  /** Names the navigation: "Project". */
  label: string;
  linkAs?: import('../patterns/link').LinkComponent;
  className?: string;
}) {
  const Anchor = linkAs ?? 'a';
  return (
    <nav aria-label={label} className={className}>
      <ul className="flex gap-5 overflow-x-auto border-b border-border p-0 [scrollbar-width:none]">
        {items.map((item) => (
          <li key={item.href} className="shrink-0">
            <Anchor
              href={item.href}
              aria-current={item.active ? 'page' : undefined}
              className={cn(
                'relative inline-flex h-10 items-center gap-1.5 text-body-medium whitespace-nowrap text-muted-foreground no-underline transition-colors duration-120 hover:text-foreground',
                item.active &&
                  'text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-t-xs after:bg-primary',
              )}
            >
              {item.label}
              {item.count !== undefined ? (
                <span className="rounded-full bg-muted px-1.5 text-caption leading-4.5 tabular-nums">
                  {item.count}
                </span>
              ) : null}
            </Anchor>
          </li>
        ))}
      </ul>
    </nav>
  );
}
