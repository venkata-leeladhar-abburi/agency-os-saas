import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/supabase/server';
import { SetupForm } from './setup-form';

export const metadata = { title: 'Set up your workspace · Agency OS' };

export default async function SetupPage() {
  if (!(await currentUser())) redirect('/sign-in?next=/setup');
  return <SetupForm />;
}
