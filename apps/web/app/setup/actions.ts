'use server';

import { AccountError, createWorkspace, updateWorkspaceSetup, withUser } from '@agency-os/db';
import { SUPPORTED_COUNTRIES, validateGstin } from '@agency-os/core';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireDb, requireSession, WORKSPACE_COOKIE } from '../../lib/server/session';

export type StepState = {
  error?: string;
  workspaceId?: string;
  fieldErrors?: Record<string, string>;
};

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
} as const;

function message(error: unknown): string {
  if (error instanceof AccountError) return error.message;
  return 'The workspace wasn’t saved. Check your connection and try again.';
}

/** Step 1: name and country. Creates the workspace and makes the user its owner. */
export async function createWorkspaceStep(_: StepState, form: FormData): Promise<StepState> {
  const session = await requireSession('/setup');
  const name = String(form.get('name') ?? '').trim();
  const country = String(form.get('country') ?? 'IN').toUpperCase();
  if (!name) return { fieldErrors: { name: 'Give your workspace a name.' } };
  if (!SUPPORTED_COUNTRIES.includes(country))
    return { fieldErrors: { country: 'Choose a country from the list.' } };
  try {
    const id = await withUser(requireDb(), session, (tx) => createWorkspace(tx, { name, country }));
    (await cookies()).set(WORKSPACE_COOKIE, id, COOKIE_OPTIONS);
    return { workspaceId: id };
  } catch (error) {
    return { error: message(error) };
  }
}

/** Step 2: services. */
export async function saveServicesStep(_: StepState, form: FormData): Promise<StepState> {
  const session = await requireSession('/setup');
  const workspaceId = String(form.get('workspaceId') ?? '');
  const services = form.getAll('services').map(String).filter(Boolean).slice(0, 30);
  try {
    await withUser(requireDb(), session, (tx) =>
      updateWorkspaceSetup(tx, workspaceId, { services }),
    );
    return { workspaceId };
  } catch (error) {
    return { error: message(error) };
  }
}

/** Step 3: GST details, then on to the app. Leaving the GSTIN empty saves nothing. */
export async function saveGstStep(_: StepState, form: FormData): Promise<StepState> {
  const session = await requireSession('/setup');
  const workspaceId = String(form.get('workspaceId') ?? '');
  const registered = form.get('registered') === 'on';
  const raw = String(form.get('gstin') ?? '').trim();
  const lutArn = String(form.get('lutArn') ?? '').trim() || null;
  if (registered && raw) {
    const result = validateGstin(raw);
    if (!result.ok) return { fieldErrors: { gstin: result.error } };
    try {
      await withUser(requireDb(), session, (tx) =>
        updateWorkspaceSetup(tx, workspaceId, {
          gstin: result.gstin,
          stateCode: result.stateCode,
          lutArn,
        }),
      );
    } catch (error) {
      return { error: message(error) };
    }
  } else if (lutArn) {
    try {
      await withUser(requireDb(), session, (tx) =>
        updateWorkspaceSetup(tx, workspaceId, { lutArn }),
      );
    } catch (error) {
      return { error: message(error) };
    }
  }
  redirect('/home');
}

export async function finishSetup() {
  redirect('/home');
}
