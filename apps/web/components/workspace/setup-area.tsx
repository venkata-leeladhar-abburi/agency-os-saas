import { onboarding } from '@/lib/data/onboarding';
import { ExampleDataBanner, LoadExampleCard, SetupChecklist } from './setup';

/** Top of Today and the dashboard: the example-data banner and the setup checklist. */
export async function SetupArea({ slug }: { slug: string }) {
  const o = await onboarding();
  const leadDone = o.steps.find((s) => s.id === 'lead')!.done;
  if (!o.hasExample && !o.show) return null;
  return (
    <div className="mb-4 grid gap-4">
      {o.hasExample ? <ExampleDataBanner slug={slug} /> : null}
      {o.show ? <SetupChecklist slug={slug} steps={o.steps} /> : null}
      {!o.hasExample && !leadDone && o.show ? <LoadExampleCard slug={slug} /> : null}
    </div>
  );
}
