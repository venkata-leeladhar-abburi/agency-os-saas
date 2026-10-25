import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Prototype · Agency OS',
  robots: { index: false, follow: false },
};

/** The G1/G2 prototype. Off when PROTOTYPE=off; removed after G3. */
export default function PrototypeLayout({ children }: { children: ReactNode }) {
  if (process.env.PROTOTYPE === 'off') notFound();
  return children;
}
