import { redirect } from 'next/navigation';
import { safeNext } from '../../../lib/supabase/env';
import { currentSession } from '../../../lib/server/session';
import { SignInForm } from './sign-in-form';

export const metadata = { title: 'Sign in · Agency OS' };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const to = safeNext(next, '/home');
  if (await currentSession()) redirect(to);
  return (
    <SignInForm
      next={to}
      linkError={error}
      googleEnabled={process.env.NEXT_PUBLIC_GOOGLE_AUTH === '1'}
    />
  );
}
