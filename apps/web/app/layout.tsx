import type { ReactNode } from 'react';

export const metadata = { title: 'Agency OS' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN">
      <body>{children}</body>
    </html>
  );
}
