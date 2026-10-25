'use client';

import { ArrowRight, MagnifyingGlass, type Icon } from '@phosphor-icons/react';
import { Command, useCommandState } from 'cmdk';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { useEffect, useState, type ReactNode } from 'react';
import { Kbd } from '../components/kbd';
import { cn } from '../lib/cn';

export type CommandItem = {
  id: string;
  icon: Icon;
  label: string;
  /** Second line: "Lead · Proposal sent · ₹80,000". */
  meta?: string;
  /** Shortcut hint: "N L". */
  kbd?: string;
  /** Extra words that should find this item. */
  keywords?: string[];
  onSelect?: () => void;
};

export type CommandGroup = { label: string; items: CommandItem[] };

export type CommandLabels = {
  placeholder?: string;
  empty?: string;
  move?: string;
  open?: string;
  close?: string;
  title?: string;
  closeKey?: string;
  shortcut?: string;
};

type MenuProps = {
  groups: CommandGroup[];
  /** Controlled search text. */
  query?: string;
  /** Starting search text when uncontrolled. */
  defaultQuery?: string;
  onQueryChange?: (query: string) => void;
  labels?: CommandLabels;
  /** Filter results here (default) or leave it to the caller (server search). */
  shouldFilter?: boolean;
  className?: string;
};

/** The palette body without the dialog, for embedding and stories. */
export function CommandMenu({
  groups,
  query,
  defaultQuery = '',
  onQueryChange,
  labels,
  shouldFilter = true,
  className,
}: MenuProps) {
  const [ownQuery, setOwnQuery] = useState(defaultQuery);
  const value = query ?? ownQuery;
  return (
    <Command
      label={labels?.title ?? 'Search and actions'}
      shouldFilter={shouldFilter}
      loop
      className={cn(
        'w-[min(640px,100%)] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg',
        className,
      )}
    >
      <div className="flex h-13 items-center gap-3 border-b border-border px-4 text-muted-foreground">
        <MagnifyingGlass size={18} aria-hidden="true" className="shrink-0" />
        <Command.Input
          value={value}
          onValueChange={(next) => {
            setOwnQuery(next);
            onQueryChange?.(next);
          }}
          placeholder={
            labels?.placeholder ?? 'Search leads, clients, projects, invoices or type a command'
          }
          className="min-w-0 flex-1 border-0 bg-transparent text-body-lg text-foreground outline-none placeholder:text-subtle-foreground focus-visible:outline-none"
        />
        <Kbd>{labels?.closeKey ?? 'Esc'}</Kbd>
      </div>
      <Command.Empty className="px-5 py-8 text-center text-body text-muted-foreground">
        {labels?.empty ?? 'Nothing matches. Try a name, an invoice number or an action.'}
      </Command.Empty>
      <Results>
        {groups.map((group) => (
          <Command.Group
            key={group.label}
            heading={group.label}
            className="[&+&]:mt-2 [&_[cmdk-group-heading]]:mx-2.5 [&_[cmdk-group-heading]]:my-1.5 [&_[cmdk-group-heading]]:text-overline-caps [&_[cmdk-group-heading]]:text-muted-foreground"
          >
            {group.items.map(
              ({ id, icon: IconComponent, label, meta, kbd, keywords, onSelect }) => (
                <Command.Item
                  key={id}
                  value={`${label} ${meta ?? ''} ${id}`}
                  keywords={keywords}
                  onSelect={onSelect}
                  className="group flex h-11 cursor-pointer items-center gap-3 rounded-md px-2.5 outline-none data-[selected=true]:bg-accent"
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-sm bg-muted text-muted-foreground group-data-[selected=true]:bg-brand-soft group-data-[selected=true]:text-brand-soft-foreground">
                    <IconComponent size={16} aria-hidden="true" />
                  </span>
                  <span className="grid min-w-0 flex-1 leading-4.5">
                    <span className="truncate text-body-medium">{label}</span>
                    {meta ? (
                      <span className="truncate text-caption font-normal text-muted-foreground">
                        {meta}
                      </span>
                    ) : null}
                  </span>
                  {kbd ? <Kbd>{kbd}</Kbd> : null}
                  <ArrowRight
                    size={14}
                    aria-hidden="true"
                    className="hidden shrink-0 text-muted-foreground group-data-[selected=true]:block"
                  />
                </Command.Item>
              ),
            )}
          </Command.Group>
        ))}
      </Results>
      <div className="flex gap-4 border-t border-border bg-muted px-4 py-2.5 text-caption font-normal text-muted-foreground max-sm:hidden">
        <span className="inline-flex items-center gap-1.5">
          <Kbd>↑↓</Kbd> {labels?.move ?? 'Move'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Kbd>Enter</Kbd> {labels?.open ?? 'Open'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Kbd>{labels?.shortcut ?? 'Ctrl K'}</Kbd> {labels?.close ?? 'Close'}
        </span>
      </div>
    </Command>
  );
}

/** The result list, hidden when nothing matches so screen readers don't meet an empty listbox. */
function Results({ children }: { children: ReactNode }) {
  const count = useCommandState((state) => state.filtered.count);
  return (
    <Command.List hidden={count === 0} className="max-h-85 overflow-y-auto p-2">
      {children}
    </Command.List>
  );
}

export type CommandPaletteProps = MenuProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: ReactNode;
};

/** Ctrl/Cmd+K from anywhere: jump to any record or run an action. */
export function CommandPalette({ open, onOpenChange, labels, ...menu }: CommandPaletteProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-neutral-975/40 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed top-[12vh] left-1/2 z-50 w-[min(640px,calc(100%-32px))] -translate-x-1/2 outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <DialogPrimitive.Title className="sr-only">
            {labels?.title ?? 'Search and actions'}
          </DialogPrimitive.Title>
          <CommandMenu labels={labels} {...menu} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Opens the palette with Ctrl+K or Cmd+K anywhere in the app. */
export function useCommandShortcut(toggle: () => void) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);
}
