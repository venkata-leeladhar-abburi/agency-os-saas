'use client';

import { ChatCircleDots, FolderSimple, House, Receipt } from '@phosphor-icons/react';
import { ExampleBadge, PortalShell } from '@agency-os/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/** The portal's frame: the agency's brand on top, tabs at the bottom on phones. */
export function PortalFrame({
  slug,
  agency,
  contact,
  example,
  children,
}: {
  slug: string;
  agency: string;
  contact: string;
  example?: boolean;
  children: ReactNode;
}) {
  const section = usePathname().split('/')[3] ?? 'home';
  const base = `/p/${slug}`;
  return (
    <PortalShell
      agency={agency}
      client={contact}
      active={section}
      linkAs={Link}
      navLabel="Your portal"
      tabs={[
        { value: 'home', label: 'Home', icon: House, href: base },
        { value: 'projects', label: 'Projects', icon: FolderSimple, href: `${base}/projects` },
        { value: 'payments', label: 'Payments', icon: Receipt, href: `${base}/payments` },
        { value: 'messages', label: 'Messages', icon: ChatCircleDots, href: `${base}/messages` },
      ]}
    >
      {example ? (
        <div className="flex justify-end">
          <ExampleBadge />
        </div>
      ) : null}
      {children}
    </PortalShell>
  );
}
