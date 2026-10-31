// Server only. The public enquiry form on the database: its link is a token (only the hash is
// stored), made from the link secret so Settings can show it again. Each enquiry becomes a lead
// with source Website, and the owners are told.
import {
  AccountError,
  enquiryFormBrand,
  enquiryFormLink,
  submitEnquiry as dbSubmitEnquiry,
} from '@agency-os/db';
import { can } from '@agency-os/core';
import type { EnquiryInput } from '../../forms';
import { database } from '../../server/db';
import { asMember, type WorkspaceCtx } from '../../server/workspace';

const secret = () => {
  const s = process.env.LINK_SIGNING_SECRET;
  return s && s.length >= 32 ? s : null;
};

/** The agency's name and look for the form's page, or null when the link opens nothing. */
export async function enquiryBrandFor(token: string, db = database()) {
  if (!db || !token) return null;
  const w = await enquiryFormBrand(db, token);
  if (!w) return null;
  return { name: w.name, logoUrl: null, colour: w.brandColor, plan: w.plan, services: w.services };
}

/** Records an enquiry. False when the link is closed (the page then shows "not found"). */
export async function submitEnquiryFor(token: string, input: EnquiryInput, db = database()) {
  if (!db) return false;
  try {
    await dbSubmitEnquiry(db, token, {
      name: input.name,
      email: input.email ?? undefined,
      phone: input.phone ?? undefined,
      company: input.company ?? undefined,
      service: input.service,
      budget: input.budget ?? undefined,
      message: input.message,
      consent: true,
    });
    return true;
  } catch (error) {
    if (error instanceof AccountError && error.code === 'enquiry_closed') return false;
    throw error;
  }
}

/** The form's token for Settings, for people who manage leads; null until the link secret is set. */
export async function enquiryLinkFor(ctx: WorkspaceCtx) {
  const s = secret();
  if (!s || !can(ctx.role, 'leads.write')) return null;
  return asMember(ctx, (tx) => enquiryFormLink(tx, ctx.workspaceId, s));
}
