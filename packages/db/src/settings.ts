// Workspace settings (Settings → Workspace and Branding): details printed on invoices, tax,
// numbering, bank details and the brand. RLS lets only workspace.manage change them.
import { parseHexColour, validateGstin, validateInvoicePrefix } from '@agency-os/core';
import { eq } from 'drizzle-orm';
import { AccountError, call } from './accounts';
import type { Tx } from './client';
import { auditLog, workspaces } from './schema';

export type BankDetails = {
  accountName: string | null;
  accountNumber: string | null;
  ifsc: string | null;
  swift: string | null;
};

export type WorkspaceSettingsInput = {
  name: string;
  gstin: string | null;
  lutArn: string | null;
  invoicePrefix: string;
  paymentTermsDays: number;
  services: string[];
  address: string | null;
  bank: BankDetails;
  invoiceFooter: string | null;
};

const NO_BANK: BankDetails = { accountName: null, accountNumber: null, ifsc: null, swift: null };

/** The settings as the screens use them. */
export async function workspaceSettings(tx: Tx, workspaceId: string) {
  const [w] = await tx.select().from(workspaces).where(eq(workspaces.id, workspaceId));
  if (!w) throw new AccountError('no_access');
  const address = (w.address as { text?: string } | null)?.text ?? null;
  return {
    id: w.id,
    slug: w.slug,
    name: w.name,
    plan: w.plan,
    country: w.country,
    baseCurrency: w.baseCurrency,
    timeZone: w.timeZone,
    gstin: w.gstin,
    stateCode: w.stateCode,
    lutArn: w.lutArn,
    invoicePrefix: w.invoicePrefix,
    paymentTermsDays: w.paymentTermsDays,
    services: w.services,
    address,
    bank: { ...NO_BANK, ...((w.bank as Partial<BankDetails> | null) ?? {}) },
    invoiceFooter: w.invoiceFooter,
    brandColor: w.brandColor,
    logoPath: w.logoPath,
    onboarding: w.onboarding as Record<string, unknown>,
  };
}

export type WorkspaceSettings = Awaited<ReturnType<typeof workspaceSettings>>;

/** Saves Settings → Workspace. The GSTIN sets the state; the prefix keeps numbers ≤ 16 characters. */
export async function updateWorkspaceSettings(
  tx: Tx,
  workspaceId: string,
  input: WorkspaceSettingsInput,
  actorId: string,
) {
  const name = input.name.trim();
  if (name.length < 2) throw new AccountError('name_required');
  let stateCode: string | null = null;
  let gstin: string | null = null;
  if (input.gstin?.trim()) {
    const result = validateGstin(input.gstin);
    if (!result.ok) throw new AccountError('gstin_invalid', result.error);
    gstin = result.gstin;
    stateCode = result.stateCode;
  }
  const prefix = input.invoicePrefix.trim().toUpperCase();
  const checked = validateInvoicePrefix(prefix);
  if (!checked.ok) throw new AccountError('invoice_prefix_invalid', checked.error);
  if (
    !Number.isInteger(input.paymentTermsDays) ||
    input.paymentTermsDays < 0 ||
    input.paymentTermsDays > 120
  )
    throw new AccountError('payment_terms_invalid');
  const [row] = await call(() =>
    tx
      .update(workspaces)
      .set({
        name,
        gstin,
        // Without a GSTIN the state stays as it was (it still decides the place of supply).
        ...(stateCode ? { stateCode } : {}),
        lutArn: input.lutArn?.trim().toUpperCase() || null,
        invoicePrefix: prefix,
        paymentTermsDays: input.paymentTermsDays,
        services: [...new Set(input.services)],
        address: input.address?.trim() ? { text: input.address.trim() } : null,
        bank: input.bank,
        invoiceFooter: input.invoiceFooter?.trim() || null,
      })
      .where(eq(workspaces.id, workspaceId))
      .returning({ id: workspaces.id }),
  );
  if (!row) throw new AccountError('no_access');
  await tx.insert(auditLog).values({
    workspaceId,
    actorId,
    action: 'settings.saved',
    subjectType: 'workspace',
    subjectId: workspaceId,
    changes: { invoicePrefix: prefix, gstin },
  });
}

/** Saves the brand colour (null for the Agency OS violet) and the logo's storage path. */
export async function updateBranding(
  tx: Tx,
  workspaceId: string,
  input: { brandColor?: string | null; logoPath?: string | null },
  actorId: string,
) {
  const changes: { brandColor?: string | null; logoPath?: string | null } = {};
  if (input.brandColor !== undefined) {
    const colour = input.brandColor === null ? null : parseHexColour(input.brandColor);
    if (input.brandColor !== null && !colour) throw new AccountError('brand_color_invalid');
    changes.brandColor = colour;
  }
  if (input.logoPath !== undefined) changes.logoPath = input.logoPath;
  if (!Object.keys(changes).length) return;
  const [row] = await call(() =>
    tx
      .update(workspaces)
      .set(changes)
      .where(eq(workspaces.id, workspaceId))
      .returning({ id: workspaces.id }),
  );
  if (!row) throw new AccountError('no_access');
  await tx.insert(auditLog).values({
    workspaceId,
    actorId,
    action: 'branding.saved',
    subjectType: 'workspace',
    subjectId: workspaceId,
    changes,
  });
}
