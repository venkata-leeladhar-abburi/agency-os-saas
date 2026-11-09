import { PLAN_DETAILS } from '@agency-os/core';
import { Alert, Card, PageHeader } from '@agency-os/ui';
import Link from 'next/link';
import { settings } from '@/lib/data';
import { reviewBrandColour } from '@/lib/branding';
import { BrandColourForm, LogoForm } from './branding-forms';

export const metadata = { title: 'Branding · Settings · Agency OS' };

export default async function BrandingSettings({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  const s = await settings(workspace);
  const review = s.brandColour ? reviewBrandColour(s.brandColour) : null;
  return (
    <>
      <PageHeader
        title="Branding"
        subtitle="Your logo and colour on the client portal, proposals, quotes and invoices"
        className="mb-0"
      />
      {!PLAN_DETAILS[s.plan].ownBranding ? (
        <Alert tone="info" title="The Free plan adds “Powered by Agency OS”">
          It appears at the foot of the portal and your PDFs. Your logo and colour still show.{' '}
          <Link href={`/w/${workspace}/settings/plan`}>Compare plans</Link>
        </Alert>
      ) : null}
      <Card
        title="Logo"
        description="PNG or JPEG under 500 KB. A wide logo on a transparent background works best."
      >
        <LogoForm slug={workspace} logo={s.logo} workspaceName={s.name} />
      </Card>
      <Card
        title="Brand colour"
        description="Used for buttons in the client portal and for accents on your PDFs."
      >
        <BrandColourForm
          slug={workspace}
          saved={s.brandColour}
          savedUsable={review?.usable ?? true}
        />
      </Card>
    </>
  );
}
