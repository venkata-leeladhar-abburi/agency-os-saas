import { BrandTile } from '@agency-os/ui';
import type { ReactNode } from 'react';
import { brandStyleSheet } from '@/lib/branding';

/** Client-facing pages: the agency's colour applies inside, when it's readable. */
export function BrandScope({ colour, children }: { colour: string | null; children: ReactNode }) {
  const sheet = brandStyleSheet(colour);
  return (
    <div data-brand data-client className="contents">
      {sheet ? <style>{sheet}</style> : null}
      {children}
    </div>
  );
}

/** The agency's logo, or its name beside the mark when there is no logo. */
export function AgencyMark({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  if (logoUrl)
    // A data or signed storage URL: next/image can't optimise either.
    return <img src={logoUrl} alt={name} className="h-9 w-auto max-w-44 object-contain" />;
  return (
    <span className="flex items-center gap-2.5 text-body font-semibold">
      <BrandTile />
      {name}
    </span>
  );
}
