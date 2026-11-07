import { can, type Role } from '@agency-os/core';
import { Button } from '@agency-os/ui';
import Link from 'next/link';
import { requireWorkspace } from '../../../lib/server/session';

export const metadata = { title: 'Home · Agency OS' };

export default async function HomePage() {
  const { active } = await requireWorkspace('/home');
  const canInvite = can(active.role as Role, 'members.write');
  return (
    <div className="grid gap-4">
      <div>
        <p className="text-overline-caps text-muted-foreground">{active.name}</p>
        <h1 className="text-title-lg">Your workspace is ready</h1>
        <p className="text-body text-muted-foreground">
          The rest of the app arrives with the next milestones. For now you can bring your team in.
        </p>
      </div>
      {canInvite ? (
        <div>
          <Button asChild variant="primary">
            <Link href="/settings/members">Invite your team</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
