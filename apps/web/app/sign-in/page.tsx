import type { Metadata } from 'next';
import { safeNext } from '../../lib/auth/redirect';
import { AuthCard } from '../auth-card';
import { SignInForm } from './sign-in-form';

export const metadata: Metadata = { title: 'Sign in · Agency OS' };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return (
    <AuthCard>
      <SignInForm next={safeNext(next)} notice={error} />
    </AuthCard>
  );
}
