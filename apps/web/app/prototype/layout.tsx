import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Prototype · Agency OS',
  robots: { index: false, follow: false },
};

/**
 * The G1/G2 prototype. Off when PROTOTYPE=off, and hidden on the production domain unless
 * PROTOTYPE_PUBLIC=1 (D-076); open on previews and locally. Removed after G3.
 */
export default function PrototypeLayout({ children }: { children: ReactNode }) {
  if (process.env.PROTOTYPE === 'off') notFound();
  if (process.env.VERCEL_ENV === 'production' && process.env.PROTOTYPE_PUBLIC !== '1') notFound();
  return children;
}
