'use client';

import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';

// The theme script runs from the server's HTML, before the page paints. When React renders
// this provider on the client instead (Next does for a not-found page in development), a
// script it creates never runs, so it's marked as data there and React doesn't warn about it.
// The server's copy keeps running; hydration leaves its attributes alone.
const scriptProps = typeof window === 'undefined' ? undefined : { type: 'application/json' };

export function Providers({ children, nonce }: { children: ReactNode; nonce?: string }) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      nonce={nonce}
      scriptProps={scriptProps}
    >
      {children}
    </ThemeProvider>
  );
}
