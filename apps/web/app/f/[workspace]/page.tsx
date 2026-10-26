import { BrandTile, ExampleBadge } from '@agency-os/ui';
import { notFound } from 'next/navigation';
import { EXAMPLE_SLUG, exampleMode } from '@/lib/data';
import { enquiryWorkspace } from '@/lib/data/enquiry';
import { EnquiryForm } from './enquiry-form';

export async function generateMetadata() {
  const { name } = await enquiryWorkspace();
  return { title: `Enquire · ${name}` };
}

export default async function EnquiryPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  // Until the database is wired, only the example workspace has a form.
  if (workspace !== EXAMPLE_SLUG) notFound();
  const { name } = await enquiryWorkspace();
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-md content-center gap-4 px-4 py-10">
      {exampleMode() ? <ExampleBadge /> : null}
      <div className="grid gap-5 rounded-xl border border-border bg-card p-6 max-sm:p-4">
        <span className="flex items-center gap-2.5 text-body font-semibold">
          <BrandTile />
          {name}
        </span>
        <EnquiryForm workspace={name} />
      </div>
    </main>
  );
}
