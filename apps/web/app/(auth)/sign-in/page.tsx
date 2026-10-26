import { redirect } from 'next/navigation';
import { phoneOtpEnabled, safeNext } from '@/lib/auth/helpers';
import { currentUser } from '@/lib/supabase/server';
import { SignInForm } from './sign-in-form';

export const metadata = { title: 'Sign in · Agency OS' };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const target = safeNext(next);
  if (await currentUser()) redirect(target);
  return <SignInForm next={target} initialError={error} phoneEnabled={phoneOtpEnabled()} />;
}
