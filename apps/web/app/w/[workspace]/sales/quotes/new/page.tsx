import { PROPOSAL_VALIDITY_DAYS } from '@agency-os/core';
import { PageHeader } from '@agency-os/ui';
import { settings } from '@/lib/data';
import { nextQuoteNumber, quoteRecipients } from '@/lib/data/sales';
import { istDateIn } from '@/lib/data/views';
import { QuoteEditor } from './quote-editor';

export const metadata = { title: 'New quote · Agency OS' };

export default async function NewQuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ for?: string }>;
}) {
  const [{ workspace }, { for: forValue }] = await Promise.all([params, searchParams]);
  const [recipients, s, nextNumber] = await Promise.all([
    quoteRecipients(workspace),
    settings(workspace),
    nextQuoteNumber(workspace),
  ]);
  const known = [
    ...recipients.leads.map((l) => `lead:${l.id}`),
    ...recipients.clients.map((c) => `client:${c.id}`),
  ];
  return (
    <>
      <PageHeader
        title="New quote"
        subtitle="Price the work. GST is worked out for you."
        className="mb-4"
      />
      <QuoteEditor
        slug={workspace}
        recipients={recipients}
        settings={{ stateCode: s.stateCode, lutArn: s.lutArn }}
        nextNumber={nextNumber}
        defaults={{
          for: forValue && known.includes(forValue) ? forValue : undefined,
          validUntil: istDateIn(PROPOSAL_VALIDITY_DAYS),
        }}
      />
    </>
  );
}
