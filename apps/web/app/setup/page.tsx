import { SUPPORTED_COUNTRIES } from '@agency-os/core';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireSession } from '../../lib/server/session';
import { loadWorkspaces } from '../../lib/server/workspace';
import { AuthCard } from '../auth-card';
import { SetupForm } from './setup-form';

export const metadata: Metadata = { title: 'Set up your workspace · Agency OS' };

export default async function SetupPage() {
  const session = await requireSession('/setup');
  const { current } = await loadWorkspaces(session);
  if (current) redirect('/app');

  const names = new Intl.DisplayNames('en', { type: 'region' });
  const countries = SUPPORTED_COUNTRIES.map((code) => ({
    value: code,
    label: names.of(code) ?? code,
  })).sort((a, b) =>
    a.value === 'IN' ? -1 : b.value === 'IN' ? 1 : a.label.localeCompare(b.label),
  );

  return (
    <AuthCard wide>
      <SetupForm countries={countries} />
    </AuthCard>
  );
}
