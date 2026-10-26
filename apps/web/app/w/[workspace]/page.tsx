import { PageHeader } from '@agency-os/ui';

export const metadata = { title: 'Today · Agency OS' };

export default function WorkspaceHome() {
  return (
    <PageHeader
      title="Today"
      subtitle="Your day will show here. Leads, projects and invoices arrive with the next milestones."
    />
  );
}
