// Server only. Your own name and phone, shown to your team and clients.
import { AccountError } from '@agency-os/db';
import { ctxFor } from './ctx';
import * as dbProfile from './db/profile';
import { EXAMPLE_USER, store } from './shared';

export type Profile = { name: string; phone: string | null; email: string };

export async function myProfile(slug?: string): Promise<Profile> {
  const ctx = await ctxFor(slug);
  if (ctx) return dbProfile.profileFor(ctx);
  return { ...store().profile, email: EXAMPLE_USER.email };
}

/** Saves your profile. Returns the error to show by the name or phone field, if any. */
export async function saveProfile(
  input: { name: string; phone: string | null },
  slug?: string,
): Promise<{ field?: 'name' | 'phone'; error?: string }> {
  try {
    const ctx = await ctxFor(slug);
    if (ctx) {
      await dbProfile.saveProfileFor(ctx, input);
      return {};
    }
    const s = store();
    const before = s.profile.name;
    s.profile = { name: input.name, phone: input.phone };
    const me = s.members.find((m) => m.name === before);
    if (me) me.name = input.name;
    return {};
  } catch (e) {
    if (!(e instanceof AccountError)) throw e;
    return { field: e.code.startsWith('profile_phone') ? 'phone' : 'name', error: e.message };
  }
}
