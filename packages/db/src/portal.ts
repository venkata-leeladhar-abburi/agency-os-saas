// The client portal, as the signed-in portal contact (RLS and the portal_* functions decide
// what they see): the agency's details, project messages and their own contact details.
import { eq, sql } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';
import { AccountError, call } from './accounts';
import type { Tx } from './client';
import type { NotificationEvent } from './projects';
import { messages, projectMembers, projects } from './schema';
import type { WorkspaceSettings } from './settings';

type BankDetails = {
  accountName: string | null;
  accountNumber: string | null;
  ifsc: string | null;
  swift: string | null;
};
const NO_BANK: BankDetails = { accountName: null, accountNumber: null, ifsc: null, swift: null };

/** The agency's details for its invoices, in the shape of workspaceSettings (no internal fields). */
export async function portalWorkspace(
  tx: Tx,
  workspaceId: string,
): Promise<WorkspaceSettings | null> {
  const [w] = await tx.execute<{
    id: string;
    slug: string;
    name: string;
    plan: WorkspaceSettings['plan'];
    country: string;
    base_currency: string;
    time_zone: string;
    gstin: string | null;
    state_code: string | null;
    lut_arn: string | null;
    invoice_prefix: string;
    payment_terms_days: number;
    address: { text?: string } | null;
    bank: Partial<BankDetails> | null;
    invoice_footer: string | null;
    brand_color: string | null;
    logo_path: string | null;
  }>(sql`select * from portal_workspace(${workspaceId}::uuid)`);
  if (!w) return null;
  return {
    id: w.id,
    slug: w.slug,
    name: w.name,
    plan: w.plan,
    country: w.country,
    baseCurrency: w.base_currency,
    timeZone: w.time_zone,
    gstin: w.gstin,
    stateCode: w.state_code,
    lutArn: w.lut_arn,
    invoicePrefix: w.invoice_prefix,
    paymentTermsDays: w.payment_terms_days,
    services: [],
    address: w.address?.text ?? null,
    bank: { ...NO_BANK, ...(w.bank ?? {}) },
    invoiceFooter: w.invoice_footer,
    brandColor: w.brand_color,
    logoPath: w.logo_path,
    onboarding: {},
  };
}

export type ProjectMessage = {
  id: string;
  body: string;
  createdAt: Date;
  fromClient: boolean;
  authorName: string;
};

/** A project's thread, oldest first, for a member who can read the project or the client. */
export async function projectMessages(tx: Tx, projectId: string): Promise<ProjectMessage[]> {
  const rows = await tx.execute<{
    id: string;
    body: string;
    created_at: string | Date;
    from_client: boolean;
    author_name: string;
  }>(sql`select * from project_messages(${projectId}::uuid)`);
  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    createdAt: new Date(r.created_at),
    fromClient: r.from_client,
    authorName: r.author_name,
  }));
}

/**
 * Adds a message as the signed-in member, or as their portal contact (contactId). RLS checks
 * that they may: a member who can read the project, or the client's own contact.
 */
export async function postMessage(
  tx: Tx,
  input: { workspaceId: string; projectId: string; body: string; contactId?: string },
  userId: string,
): Promise<string> {
  const body = input.body.trim();
  if (!body) throw new AccountError('message_required');
  if (body.length > 4000) throw new AccountError('message_too_long');
  const id = uuidv7();
  await call(() =>
    tx.insert(messages).values({
      id,
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      authorId: input.contactId ? null : userId,
      authorContactId: input.contactId ?? null,
      body,
    }),
  );
  return id;
}

/** The project team's notification for a client's message; jobs deliver it (service role). */
export async function messagePostedEvent(
  tx: Tx,
  projectId: string,
  from: string,
): Promise<NotificationEvent> {
  const [p] = await tx.select().from(projects).where(eq(projects.id, projectId));
  if (!p) throw new AccountError('project_not_found');
  const team = await tx
    .select({ userId: projectMembers.userId })
    .from(projectMembers)
    .where(eq(projectMembers.projectId, projectId));
  const userIds = [
    ...new Set([...(p.leadMemberId ? [p.leadMemberId] : []), ...team.map((m) => m.userId)]),
  ];
  return {
    kind: 'message.posted',
    workspaceId: p.workspaceId,
    userIds,
    contactEmails: [],
    payload: { projectId, project: p.name, name: from },
  };
}

/** The contact's own name, email and phone (Account in the portal). */
export async function updateMyContact(
  tx: Tx,
  contactId: string,
  input: { name: string; email: string; phone: string | null },
) {
  await call(() =>
    tx.execute(
      sql`select update_my_contact(${contactId}::uuid, ${input.name}, ${input.email}, ${input.phone ?? ''})`,
    ),
  );
}
