import { Card } from '@agency-os/ui';
import Link from 'next/link';
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
      {session.choices.length > 1 ? (
        <Card
          title="Your companies"
          as="h2"
          description={`You work with ${session.agency} for more than one company.`}
        >
          <ul className="grid gap-2 p-0">
            {session.choices.map((c) => (
              <li key={c.id} className="flex min-h-control-xl items-center justify-between gap-3">
                <span className="text-body font-medium">{c.name}</span>
                {c.id === session.clientId ? (
                  <span className="text-body-sm text-muted-foreground">Viewing now</span>
                ) : (
                  <Link
                    href={`/p/${workspace}/as/${c.id}`}
                    className="inline-flex min-h-control-xl items-center text-body-medium"
                    prefetch={false}
                  >
                    View {c.name}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
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
