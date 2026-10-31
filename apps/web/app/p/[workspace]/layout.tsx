import { Logo } from '@agency-os/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { PortalFrame } from '@/components/portal/portal-frame';
import { PLAN_DETAILS } from '@agency-os/core';
import { brandStyleSheet } from '@/lib/branding';
import { exampleMode } from '@/lib/data';
import { portalBrand } from '@/lib/data/portal';
import { currentPortal } from '@/lib/portal-session';

// The portal is private to each client: keep it out of search engines.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PortalLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  const session = await currentPortal(workspace);
  if (!session)
    return (
      <main className="mx-auto grid min-h-dvh w-full max-w-md content-center gap-4 px-4 py-10">
        <Logo />
        <h1 className="text-title-md">Open the link from your email</h1>
        <p className="text-body text-muted-foreground">
          Your agency sends you a sign-in link. It opens your projects, approvals and invoices. No
          password needed.
        </p>
        {exampleMode() ? null : (
          <p className="text-body text-muted-foreground">
            Already invited?{' '}
            <Link href={`/sign-in?next=${encodeURIComponent(`/p/${workspace}`)}`}>
              Sign in with the email your agency used
            </Link>
          </p>
        )}
      </main>
    );
  const brand = await portalBrand(session);
  return (
    <PortalFrame
      logoUrl={brand.logoUrl}
      brandSheet={brandStyleSheet(brand.brandColour)}
      poweredBy={!PLAN_DETAILS[brand.plan].ownBranding}
      slug={workspace}
      agency={session.agency}
      contact={session.contact}
      example={exampleMode()}
    >
      {children}
    </PortalFrame>
  );
}
