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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

/** Wait this long after the last key before asking the server. */
const SEARCH_DELAY_MS = 120;

/**
 * Ctrl/Cmd+K: find any record or run an action. Records are searched on the server as you type
 * (a few of each kind), so it stays quick however many records the workspace has.
 */
export function useWorkspacePalette(slug: string) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  // The words these results are for; null while the answer for the current words is on its way.
  const [results, setResults] = useState<{ for: string; items: SearchItem[] } | null>(null);
  const latest = useRef('');

  useEffect(() => {
    const words = query.trim();
    latest.current = words;
    if (!open || !words) return;
    const timer = setTimeout(() => {
      void searchAction(slug, words).then((items) => {
        // An answer for words the person has since changed is dropped.
        if (latest.current === words) setResults({ for: words, items });
      });
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [open, query, slug]);

  const show = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) {
      setQuery('');
      setResults(null);
    }
  }, []);
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
    const words = query.trim().toLowerCase();
    if (!words) return [actions, goTo];
    // Actions and places are filtered here; records come back from the server already matched.
    const matching = (group: CommandGroup): CommandGroup => ({
      ...group,
      items: group.items.filter((i) => i.label.toLowerCase().includes(words)),
    });
    const records = new Map<string, CommandGroup>();
    const items = results?.for === query.trim() ? results.items : [];
    for (const item of items) {
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
    return [...records.values(), matching(actions), matching(goTo)].filter((g) => g.items.length);
  }, [slug, query, results, go]);

  const palette = (
    <CommandPalette
      open={open}
      onOpenChange={show}
      groups={groups}
      query={query}
      onQueryChange={setQuery}
      shouldFilter={false}
      labels={{
        empty:
          results?.for === query.trim()
            ? `Nothing matches “${query}”. Try a name, an email, a phone number or an invoice number.`
            : 'Searching your records…',
      }}
    />
  );
  return { palette, openPalette: () => show(true) };
}
