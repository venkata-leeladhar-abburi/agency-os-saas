import { Logo } from '@agency-os/ui';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { PortalFrame } from '@/components/portal/portal-frame';
import { exampleMode } from '@/lib/data';
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
      </main>
    );
  return (
    <PortalFrame
      slug={workspace}
      agency={session.agency}
      contact={session.contact}
      example={exampleMode()}
    >
      {children}
    </PortalFrame>
  );
}
