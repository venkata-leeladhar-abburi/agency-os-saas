import { redirect } from 'next/navigation';
import { safeNext } from '@/lib/auth/helpers';
import { currentUser } from '@/lib/supabase/server';
import { CodeForm } from './code-form';

export const metadata = { title: 'Two-factor login · Agency OS', robots: { index: false } };

/** The second step of signing in, for people with two-factor login on (D-071). */
export default async function TwoFactorPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  if (!(await currentUser())) redirect('/sign-in');
  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-title-md">Enter your code</h1>
        <p className="text-body text-muted-foreground">
          Two-factor login is on for your account. Open your authenticator app and enter the 6-digit
          code for Agency OS.
        </p>
      </div>
      <CodeForm next={safeNext(next)} />
    </div>
  );
}
