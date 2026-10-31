'use server';

import { submitEnquiry } from '@/lib/data/enquiry';
import { checkEnquiry, fields } from '@/lib/forms';
import type { FormState } from '@/lib/form-state';
import { callerIp } from '@/lib/origin';
import { allow } from '@/lib/rate-limit';

export async function enquiryAction(
  key: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const f = fields(form);
  // A field people can't see: only bots fill it. They get the thank-you, and no lead is made.
  if (f.website) return { done: Date.now() };
  const checked = checkEnquiry(f);
  if (!checked.ok) return { errors: checked.errors, values: f };
  if (!(await allow('enquiries', await callerIp())))
    return {
      values: f,
      message: 'Too many enquiries from this network. Wait a minute and send it again.',
    };
  if (!(await submitEnquiry(checked.value, key)))
    return {
      values: f,
      message: 'This form isn’t taking enquiries any more. Contact the agency directly.',
    };
  return { done: Date.now() };
}
