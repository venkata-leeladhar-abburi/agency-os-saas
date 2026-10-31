'use client';

import { Books, ChatCircleDots, FolderSimple, House, Receipt } from '@phosphor-icons/react';
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
  logoUrl,
  brandSheet,
  poweredBy,
  children,
}: {
  slug: string;
  agency: string;
  contact: string;
  example?: boolean;
  logoUrl?: string;
  /** The agency's colour, from brandStyleSheet(); null keeps the Agency OS colours. */
  brandSheet?: string | null;
  /** The Free plan adds "Powered by Agency OS". */
  poweredBy?: boolean;
  children: ReactNode;
}) {
  const section = usePathname().split('/')[3] ?? 'home';
  const base = `/p/${slug}`;
  return (
    <div data-brand data-client className="contents">
      {brandSheet ? <style>{brandSheet}</style> : null}
      <PortalShell
        agency={agency}
        logoUrl={logoUrl}
        client={contact}
        active={section}
        linkAs={Link}
        navLabel="Your portal"
        tabs={[
          { value: 'home', label: 'Home', icon: House, href: base },
          { value: 'projects', label: 'Projects', icon: FolderSimple, href: `${base}/projects` },
          { value: 'payments', label: 'Payments', icon: Receipt, href: `${base}/payments` },
          { value: 'messages', label: 'Messages', icon: ChatCircleDots, href: `${base}/messages` },
          { value: 'knowledge', label: 'Guides', icon: Books, href: `${base}/knowledge` },
        ]}
      >
        {example ? (
          <div className="flex justify-end">
            <ExampleBadge />
          </div>
        ) : null}
        {children}
        {poweredBy ? (
          <p className="pt-4 text-center text-body-sm text-muted-foreground">
            Powered by Agency OS
          </p>
        ) : null}
      </PortalShell>
    </div>
  );
}
