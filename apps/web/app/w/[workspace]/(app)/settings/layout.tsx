import type { ReactNode } from 'react';
import { SettingsNav } from '@/components/workspace/settings-nav';

export default async function SettingsLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
      <SettingsNav slug={workspace} />
      <div className="grid min-w-0 max-w-3xl content-start gap-4">{children}</div>
    </div>
  );
}
