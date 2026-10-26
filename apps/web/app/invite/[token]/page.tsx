import type { Metadata } from 'next';
import { requireSession } from '../../../lib/server/session';
import { AuthCard } from '../../auth-card';
import { InviteForm } from './invite-form';

export const metadata: Metadata = { title: 'Accept invite · Agency OS' };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // Signed-out visitors sign in first and come straight back to this page.
  const session = await requireSession(`/invite/${token}`);
  return (
    <AuthCard>
      <InviteForm token={token} email={session.email} />
    </AuthCard>
  );
}
