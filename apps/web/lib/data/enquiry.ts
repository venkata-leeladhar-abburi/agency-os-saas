// Server only. The public enquiry form: each enquiry becomes a lead with source Website.
import { nextFollowUp } from '@agency-os/core';
import type { EnquiryInput } from '../forms';
import { activity, EXAMPLE_USER, newId, store } from './shared';

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

/** Five enquiries a minute from one network, so a form left open to bots can't flood the board. */
export function allowEnquiry(network: string, now = Date.now()): boolean {
  const hits = store().enquiryHits;
  const recent = (hits.get(network) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(network, recent);
    return false;
  }
  hits.set(network, [...recent, now]);
  return true;
}

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
  return id;
}

export async function enquiryWorkspace() {
  return { name: store().settings.name };
}
