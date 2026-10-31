import type { Metadata } from 'next';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import { GeistMono, GeistSans } from './fonts';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = { title: 'Agency OS' };

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Set by proxy.ts: the theme script runs before the page paints, so it needs the nonce.
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <html
      lang="en-IN"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <Providers nonce={nonce}>{children}</Providers>
      </body>
    </html>
  );
}
