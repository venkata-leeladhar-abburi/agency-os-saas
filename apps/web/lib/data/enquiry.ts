// Server only. The public enquiry form: each enquiry becomes a lead with source Website.
import { nextFollowUp } from '@agency-os/core';
import type { EnquiryInput } from '../forms';
import { notify } from './notifications';
import { ctxFor, exampleMode } from './ctx';
import { enquiryBrandFor, enquiryLinkFor, submitEnquiryFor } from './db/enquiry';
import { EXAMPLE_SLUG } from './index';
import { activity, brandOf, EXAMPLE_USER, newId, store } from './shared';

/**
 * Records an enquiry from the public form. On the database `key` is the form's token; in example
 * mode it's the example workspace. False when the link opens nothing.
 */
export async function submitEnquiry(input: EnquiryInput, key = ''): Promise<boolean> {
  if (!exampleMode()) return submitEnquiryFor(key, input);
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
  return true;
}

/** The agency behind a form link, or null when it opens nothing. */
export async function enquiryWorkspace(key = '') {
  if (!exampleMode()) return enquiryBrandFor(key);
  return key === EXAMPLE_SLUG ? brandOf() : null;
}

/** What goes after /f/ in the form's link: the token on the database, the slug in example mode. */
export async function enquiryFormKey(slug: string): Promise<string | null> {
  const ctx = await ctxFor(slug);
  if (ctx) return enquiryLinkFor(ctx);
  return slug;
}
