import { Card, Input, PageHeader } from '@agency-os/ui';
import { settings } from '@/lib/data';
import { enquiryFormKey } from '@/lib/data/enquiry';
import { siteOrigin } from '@/lib/origin';
import { SettingsForm } from './settings-form';

export const metadata = { title: 'Settings · Agency OS' };

export default async function SettingsPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  // On the database the link's last part is the form's token; in example mode, the workspace.
  const key = await enquiryFormKey(workspace);
  const formLink = key ? `${await siteOrigin()}/f/${key}` : null;
  return (
    <>
      <PageHeader
        title="Workspace"
        subtitle="Your details, tax and invoices, and your enquiry form"
        className="mb-0"
      />
      <SettingsForm slug={workspace} settings={await settings(workspace)} />
      <Card
        title="Enquiry form"
        description="Put this link on your website or Instagram. Each enquiry becomes a lead with source Website."
      >
        {formLink ? (
          <div className="flex flex-wrap items-end gap-2">
            <Input
              label="Your form’s link"
              value={formLink}
              readOnly
              className="font-mono"
              containerClassName="min-w-64 flex-1"
            />
            <a href={formLink} target="_blank" rel="noreferrer" className="text-body-medium">
              Open the form
            </a>
          </div>
        ) : (
          <p className="text-body text-muted-foreground">
            Your form’s link isn’t ready yet. It appears here once links are set up for this
            workspace, or ask someone who manages leads.
          </p>
        )}
      </Card>
    </>
  );
}
