'use server';

import { revalidatePath } from 'next/cache';
import { exampleMode } from '@/lib/data';
import { acceptProposal, declineProposal, startSigning } from '@/lib/data/sales';
import { checkCode, checkSignName, fields } from '@/lib/forms';
import type { FormState } from '@/lib/form-state';
import { callerIp, callerUserAgent } from '@/lib/origin';
import { allow } from '@/lib/rate-limit';

const TOO_MANY = 'Too many tries. Wait an hour, or ask the agency to help.';

export type SignState = FormState & {
  step?: 'name' | 'code' | 'signed';
  name?: string;
  /** Example mode only: the code that would have been emailed. */
  exampleCode?: string;
};

export async function startSigningAction(
  token: string,
  _prev: SignState,
  form: FormData,
): Promise<SignState> {
  const f = fields(form);
  const checked = checkSignName(f);
  if (!checked.ok) return { step: 'name', errors: checked.errors, values: f };
  if (!exampleMode())
    return {
      step: 'name',
      values: f,
      message: 'Signing isn’t available yet because email isn’t set up. Ask the agency to help.',
    };
  const ip = await callerIp();
  if (!(await allow('signingFromNetwork', ip)) || !(await allow('signingCodeRequests', token)))
    return { step: 'name', values: f, message: TOO_MANY };
  const started = await startSigning(token);
  if (!started.ok) return { step: 'name', values: f, message: started.error };
  return { step: 'code', name: checked.value.name, exampleCode: started.code };
}

export async function acceptAction(
  token: string,
  _prev: SignState,
  form: FormData,
): Promise<SignState> {
  const f = fields(form);
  const name = checkSignName(f);
  if (!name.ok) return { step: 'code', message: 'Start again: type your name to sign.' };
  const checked = checkCode(f);
  if (!checked.ok) return { step: 'code', errors: checked.errors };
  if (!(await allow('signingFromNetwork', await callerIp())))
    return { step: 'code', message: TOO_MANY };
  const result = await acceptProposal(token, {
    name: name.value.name,
    code: checked.value.code,
    ip: await callerIp(),
    userAgent: await callerUserAgent(),
  });
  if (!result.ok) {
    return result.field
      ? { step: 'code', errors: { code: result.error } }
      : { step: 'code', message: result.error };
  }
  revalidatePath(`/proposal/${token}`);
  return { step: 'signed' };
}

export async function declineAction(
  token: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const reason = String(form.get('reason') ?? '')
    .trim()
    .slice(0, 500);
  const result = await declineProposal(token, reason);
  if (!result.ok) return { message: result.error };
  revalidatePath(`/proposal/${token}`);
  return { done: Date.now() };
}
