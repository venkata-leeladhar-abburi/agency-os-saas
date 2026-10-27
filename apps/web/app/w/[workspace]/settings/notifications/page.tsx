import { PageHeader } from '@agency-os/ui';
import { settings } from '@/lib/data';
import { NotificationPrefs } from '../notification-prefs';

export const metadata = { title: 'Notifications · Settings · Agency OS' };

export default async function NotificationSettings({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="What you hear about, in the app and by email"
        className="mb-0"
      />
      <NotificationPrefs slug={workspace} prefs={(await settings(workspace)).notificationPrefs} />
    </>
  );
}
