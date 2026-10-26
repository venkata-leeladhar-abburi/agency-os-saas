import { Card, Input, PageHeader } from '@agency-os/ui';
import { EXAMPLE_WORKSPACE } from '@/lib/data';

export const metadata = { title: 'Settings · Agency OS' };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" subtitle="Workspace profile" className="mb-4" />
      <Card title="Workspace" description="Shown on proposals, invoices and the client portal.">
        <div className="grid max-w-lg gap-4">
          <Input label="Workspace name" defaultValue={EXAMPLE_WORKSPACE.name} readOnly />
          <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            <Input label="Currency" defaultValue="INR" readOnly />
            <Input label="Time zone" defaultValue="Asia/Kolkata" readOnly />
          </div>
        </div>
      </Card>
    </>
  );
}
