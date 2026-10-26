// Server only. The public enquiry form: each enquiry becomes a lead with source Website.
import { nextFollowUp } from '@agency-os/core';
import type { EnquiryInput } from '../forms';
import { notify } from './notifications';
import { activity, brandOf, EXAMPLE_USER, newId, store } from './shared';

export async function submitEnquiry(input: EnquiryInput): Promise<string> {
  const id = newId('lead');
  const now = new Date();
  store().leads.unshift({
    id,
    name: input.name,
    company: input.company,
    email: input.email,
    phone: input.phone,
    stage: 'new',
    valueMinor: 0n,
    source: 'website',
    service: input.service,
    owner: EXAMPLE_USER.name,
    followUpAt: nextFollowUp(now, 'Asia/Kolkata').toISOString(),
    notes: [input.budget ? `Budget: ${input.budget}` : null, input.message]
      .filter(Boolean)
      .join('\n'),
    lostReason: null,
    clientId: null,
    createdAt: now.toISOString(),
    activities: [activity('enquiry', 'sent an enquiry from the website form', input.name)],
  });
  notify(
    'enquiry',
    `New enquiry from ${input.company ?? input.name}`,
    `Website form · ${input.service}`,
    `/leads/${id}`,
  );
  return id;
}

export async function enquiryWorkspace() {
  return brandOf();
}
