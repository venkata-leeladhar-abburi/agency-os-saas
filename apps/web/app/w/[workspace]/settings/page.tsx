import { Card, Input, PageHeader } from '@agency-os/ui';
import { settings } from '@/lib/data';
import { siteOrigin } from '@/lib/origin';
import { NotificationPrefs } from './notification-prefs';
import { SettingsForm } from './settings-form';

export const metadata = { title: 'Settings · Agency OS' };

export default async function SettingsPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const formLink = `${await siteOrigin()}/f/${workspace}`;
  const s = await settings();
  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Workspace, tax and invoices, notifications"
        className="mb-4"
      />
      <div className="grid max-w-3xl gap-4">
        <SettingsForm slug={workspace} settings={s} />
        <NotificationPrefs slug={workspace} prefs={s.notificationPrefs} />
        <Card
          title="Enquiry form"
          description="Put this link on your website or Instagram. Each enquiry becomes a lead with source Website."
        >
          <div className="flex flex-wrap items-end gap-2">
            <Input
              label="Your form’s link"
              value={formLink}
              readOnly
              className="font-mono"
              containerClassName="min-w-64 flex-1"
            />
            <a
              href={`/f/${workspace}`}
              target="_blank"
              rel="noreferrer"
              className="text-body-medium"
            >
              Open the form
            </a>
          </div>
        </Card>
      </div>
    </>
  );
}
