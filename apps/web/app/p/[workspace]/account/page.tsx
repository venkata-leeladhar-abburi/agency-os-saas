import { Card } from '@agency-os/ui';
import { formatPhone } from '@/lib/auth/helpers';
import { portalAccount } from '@/lib/data/portal';
import { currentPortal } from '@/lib/portal-session';
import { AccountForm } from './account-form';

export const metadata = { title: 'Your account' };

export default async function PortalAccount({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  const session = (await currentPortal(workspace))!;
  const me = await portalAccount(session);
  return (
    <>
      <h1 className="text-title-lg">Your account</h1>
      <Card title="Your details" as="h2">
        <AccountForm
          slug={workspace}
          values={{
            name: me.name,
            email: me.email ?? '',
            phone: me.phone ? formatPhone(me.phone) : '',
          }}
        />
      </Card>
    </>
  );
}
