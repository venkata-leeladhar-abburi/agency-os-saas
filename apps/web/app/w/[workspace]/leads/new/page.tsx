import { nextFollowUp } from '@agency-os/core';
import { PageHeader } from '@agency-os/ui';
import { istDate } from '@/lib/data/views';
import { NewLeadForm } from './new-lead-form';

export const metadata = { title: 'New lead · Agency OS' };

export default async function NewLeadPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <PageHeader
        title="New lead"
        subtitle="Add who it is and how to reach them. The rest can wait."
      />
      <NewLeadForm
        slug={workspace}
        defaultFollowUp={istDate(nextFollowUp(new Date(), 'Asia/Kolkata'))}
      />
    </div>
  );
}
