import { Logo } from '@agency-os/ui';
import type { ReactNode } from 'react';

/** The centred card used by sign-in, workspace setup and invite pages. */
export function AuthCard({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div
        className={`grid w-full gap-6 rounded-xl border border-border bg-card p-6 shadow-xs ${wide ? 'max-w-lg' : 'max-w-sm'}`}
      >
        <Logo />
        {children}
      </div>
    </main>
  );
}
