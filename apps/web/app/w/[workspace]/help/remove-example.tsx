'use client';

import { ExampleDataBanner } from '@/components/workspace/setup';

/** The same confirm-and-remove flow as the banner on Today. */
export function RemoveExampleButton({ slug }: { slug: string }) {
  return <ExampleDataBanner slug={slug} />;
}
