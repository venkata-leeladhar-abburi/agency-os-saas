'use client';

import {
  CheckSquareOffset,
  FolderSimple,
  FunnelSimple,
  GearSix,
  House,
  Notepad,
  Plus,
  Receipt,
  SquaresFour,
  UsersThree,
  type Icon,
} from '@phosphor-icons/react';
import { CommandPalette, useCommandShortcut, type CommandGroup } from '@agency-os/ui';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { searchAction } from '@/app/w/[workspace]/search-action';
import type { SearchItem, SearchKind } from '@/lib/data/search';

const KIND: Record<SearchKind, { icon: Icon; group: string }> = {
  lead: { icon: FunnelSimple, group: 'Leads' },
  client: { icon: UsersThree, group: 'Clients' },
  proposal: { icon: Notepad, group: 'Sales docs' },
  project: { icon: FolderSimple, group: 'Projects' },
  task: { icon: CheckSquareOffset, group: 'Tasks' },
  invoice: { icon: Receipt, group: 'Invoices' },
};

/** Ctrl/Cmd+K: find any record or run an action. Records load when it first opens. */
export function useWorkspacePalette(slug: string) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<SearchItem[] | null>(null);

  const show = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next) setQuery('');
      // Fresh each time it opens, so new records are there.
      if (next) void searchAction(slug).then(setItems);
    },
    [slug],
  );
  const toggle = useCallback(() => show(!open), [show, open]);
  useCommandShortcut(toggle);

  const go = useCallback(
    (href: string) => {
      show(false);
      router.push(href);
    },
    [router, show],
  );

  const groups = useMemo<CommandGroup[]>(() => {
    const ws = (p: string) => `/w/${slug}${p}`;
    const actions: CommandGroup = {
      label: 'Actions',
      items: [
        { id: 'new-lead', icon: Plus, label: 'New lead', onSelect: () => go(ws('/leads/new')) },
        {
          id: 'new-quote',
          icon: Plus,
          label: 'New quote',
          onSelect: () => go(ws('/sales/quotes/new')),
        },
        {
          id: 'new-invoice',
          icon: Plus,
          label: 'New invoice',
          onSelect: () => go(ws('/invoices/new')),
        },
        { id: 'new-task', icon: Plus, label: 'New task', onSelect: () => go(ws('/tasks/new')) },
        {
          id: 'new-project',
          icon: Plus,
          label: 'New project',
          onSelect: () => go(ws('/projects/new')),
        },
        {
          id: 'new-client',
          icon: Plus,
          label: 'New client',
          onSelect: () => go(ws('/clients/new')),
        },
      ],
    };
    const goTo: CommandGroup = {
      label: 'Go to',
      items: [
        { id: 'go-today', icon: House, label: 'Today', onSelect: () => go(ws('')) },
        {
          id: 'go-dashboard',
          icon: SquaresFour,
          label: 'Dashboard',
          onSelect: () => go(ws('/dashboard')),
        },
        {
          id: 'go-tasks',
          icon: CheckSquareOffset,
          label: 'My tasks',
          onSelect: () => go(ws('/tasks?who=me')),
        },
        {
          id: 'go-settings',
          icon: GearSix,
          label: 'Settings',
          onSelect: () => go(ws('/settings')),
        },
      ],
    };
    if (!query.trim()) return [actions, goTo];
    const records = new Map<string, CommandGroup>();
    for (const item of items ?? []) {
      const kind = KIND[item.kind];
      const group = records.get(kind.group) ?? { label: kind.group, items: [] };
      group.items.push({
        id: item.id,
        icon: kind.icon,
        label: item.label,
        meta: item.meta,
        keywords: item.keywords,
        onSelect: () => go(item.href),
      });
      records.set(kind.group, group);
    }
    return [...records.values(), actions, goTo];
  }, [slug, query, items, go]);

  const palette = (
    <CommandPalette
      open={open}
      onOpenChange={show}
      groups={groups}
      query={query}
      onQueryChange={setQuery}
      labels={{
        empty: items
          ? `Nothing matches “${query}”. Try a name, an email, a phone number or an invoice number.`
          : 'Loading your records…',
      }}
    />
  );
  return { palette, openPalette: () => show(true) };
}
