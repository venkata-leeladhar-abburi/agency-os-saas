import { PageHeader } from '@agency-os/ui';
import { twoFactorEnabled } from '@/lib/auth/helpers';
import { twoFactorOn } from '@/lib/auth/two-factor';
import { exampleMode } from '@/lib/data';
import { myProfile } from '@/lib/data/profile';
import { ProfileForm, SignOutEverywhere } from './profile-form';
import { TwoFactorCard } from './two-factor-card';

export const metadata = { title: 'Your profile · Settings · Agency OS' };

export default async function ProfileSettings({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  return (
    <>
      <PageHeader
        title="Your profile"
        subtitle="Your name, how to reach you, and where you’re signed in"
        className="mb-0"
      />
      <ProfileForm slug={workspace} profile={await myProfile(workspace)} />
      {twoFactorEnabled() ? (
        <TwoFactorCard on={!exampleMode() && (await twoFactorOn())} example={exampleMode()} />
      ) : null}
      <SignOutEverywhere example={exampleMode()} />
    </>
  );
}
