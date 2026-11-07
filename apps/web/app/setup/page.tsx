import { requireSession } from '../../lib/server/session';
import { SetupForm } from './setup-form';

export const metadata = { title: 'Set up your workspace · Agency OS' };

export default async function SetupPage() {
  await requireSession('/setup');
  return (
    <main className="grid min-h-dvh place-items-center bg-background p-4">
      <SetupForm />
    </main>
  );
}
