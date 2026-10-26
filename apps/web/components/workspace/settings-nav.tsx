'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SECTIONS = [
  { path: '', label: 'Workspace' },
  { path: '/members', label: 'Members and roles' },
  { path: '/plan', label: 'Plan and billing' },
  { path: '/notifications', label: 'Notifications' },
  { path: '/export', label: 'Data export' },
  { path: '/audit', label: 'Audit log' },
];

export function SettingsNav({ slug }: { slug: string }) {
  const base = `/w/${slug}/settings`;
  const path = usePathname();
  return (
    <nav aria-label="Settings" className="min-w-0">
      <ul className="grid gap-0.5 p-0 max-lg:flex max-lg:overflow-x-auto max-lg:pb-1">
        {SECTIONS.map((s) => {
          const href = base + s.path;
          const current = s.path ? path.startsWith(href) : path === base;
          return (
            <li key={s.label} className="shrink-0">
              <Link
                href={href}
                aria-current={current ? 'page' : undefined}
                className="block rounded-sm px-2.5 py-1.5 text-body-medium whitespace-nowrap text-muted-foreground no-underline hover:bg-accent aria-[current=page]:bg-card aria-[current=page]:text-foreground aria-[current=page]:shadow-xs"
              >
                {s.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
