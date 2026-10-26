import { PageHeader } from '@agency-os/ui';
import { settings } from '@/lib/data';
import { SettingsForm } from './settings-form';

export const metadata = { title: 'Settings · Agency OS' };

export default async function SettingsPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  return (
    <>
      <PageHeader title="Settings" subtitle="Workspace, tax and invoices" className="mb-4" />
      <SettingsForm slug={workspace} settings={await settings()} />
    </>
  );
}
