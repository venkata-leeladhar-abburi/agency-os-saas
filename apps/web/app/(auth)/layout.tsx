import type { ReactNode } from 'react';

/** Bare frame for sign-in: a centred card on the page background. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-background p-4">
      <div className="mx-auto grid w-full max-w-sm gap-6 rounded-xl border border-border bg-card p-6 shadow-xs">
        <p className="text-title-sm font-semibold">Agency OS</p>
        {children}
      </div>
    </main>
  );
}
