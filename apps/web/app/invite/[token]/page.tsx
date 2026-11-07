import { requireSession } from '../../../lib/server/session';
import { AcceptForm } from './accept-form';

export const metadata = { title: 'Accept invite · Agency OS' };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // Signed-out visitors go to sign in and come straight back here.
  const session = await requireSession(`/invite/${token}`);
  return (
    <main className="grid min-h-dvh place-items-center bg-background p-4">
      <div className="mx-auto grid w-full max-w-sm gap-6 rounded-xl border border-border bg-card p-6 shadow-xs">
        <p className="text-title-sm font-semibold">Agency OS</p>
        <AcceptForm token={token} email={session.email} />
      </div>
    </main>
  );
}
