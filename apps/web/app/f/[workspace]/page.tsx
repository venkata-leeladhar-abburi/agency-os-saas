import { ExampleBadge } from '@agency-os/ui';
import { AgencyMark, BrandScope } from '@/components/brand/brand';
import { notFound } from 'next/navigation';
import { exampleMode } from '@/lib/data';
import { enquiryWorkspace } from '@/lib/data/enquiry';
import { EnquiryForm } from './enquiry-form';

type Props = { params: Promise<{ workspace: string }> };

// The link's last part is the form's token on the database, the example workspace otherwise.
export async function generateMetadata({ params }: Props) {
  const brand = await enquiryWorkspace((await params).workspace);
  return { title: brand ? `Enquire · ${brand.name}` : 'Enquiry form', robots: { index: false } };
}

export default async function EnquiryPage({ params }: Props) {
  const { workspace } = await params;
  const brand = await enquiryWorkspace(workspace);
  if (!brand) notFound();
  const { name, logoUrl, colour } = brand;
  return (
    <BrandScope colour={colour}>
      <main className="mx-auto grid min-h-dvh w-full max-w-md content-center gap-4 px-4 py-10">
        {exampleMode() ? <ExampleBadge /> : null}
        <div className="grid gap-5 rounded-xl border border-border bg-card p-6 max-sm:p-4">
          <AgencyMark name={name} logoUrl={logoUrl} />
          <EnquiryForm workspace={name} formKey={workspace} />
        </div>
      </main>
    </BrandScope>
  );
}
