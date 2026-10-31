import {
  normalizePhone,
  SUPPORTED_COUNTRIES,
  validateGstin,
  workspaceDefaults,
} from '@agency-os/core';
import { and, asc, count, eq, ilike, inArray, isNotNull, isNull, ne, or, sql } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';
import { AccountError, call } from './accounts';
import type { Tx } from './client';
import { logActivity } from './leads';
import { checkPlanLimit } from './platform';
import {
  activities,
  clientContacts,
  clients,
  leads,
  pipelineStages,
  proposals,
  workspaces,
} from './schema';

export type Client = typeof clients.$inferSelect;
export type Contact = typeof clientContacts.$inferSelect;
export type Channel = Client['preferredChannel'];

export type ClientInput = {
  name: string;
  legalName?: string | null;
  gstin?: string | null;
  stateCode?: string | null;
  country?: string;
  currency?: string;
  timeZone?: string;
  billingAddress?: Record<string, string> | null;
  preferredChannel?: Channel;
  notes?: string | null;
  isExample?: boolean;
};

export type ContactInput = {
  name: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  isPrimary?: boolean;
};

/** Checks the GSTIN and fills the state code from it; the message says how to fix a bad one. */
function taxFields(input: Pick<ClientInput, 'gstin' | 'stateCode' | 'country'>, country: string) {
  if (!input.gstin?.trim()) return { gstin: null, stateCode: input.stateCode ?? null };
  if (country !== 'IN') throw new AccountError('gstin_outside_india');
  const result = validateGstin(input.gstin);
  if (!result.ok) throw new AccountError('gstin_invalid', result.error);
  return { gstin: result.gstin, stateCode: result.stateCode };
}

function contactValues(input: ContactInput) {
  const name = input.name.trim();
  if (!name) throw new AccountError('contact_name_required');
  return {
    name,
    email: input.email?.trim().toLowerCase() || null,
    phone: input.phone?.trim() ? normalizePhone(input.phone) : null,
    role: input.role?.trim() || null,
  };
}

async function defaults(tx: Tx, workspaceId: string) {
  const [ws] = await tx
    .select({
      country: workspaces.country,
      currency: workspaces.baseCurrency,
      timeZone: workspaces.timeZone,
    })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));
  if (!ws) throw new AccountError('no_access');
  return ws;
}

/** Adds a client (and its first contact, made primary). Country, currency and time zone default to the workspace's. */
export async function createClient(
  tx: Tx,
  workspaceId: string,
  input: ClientInput & { contact?: ContactInput; fromLeadId?: string },
  actorId: string | null,
): Promise<string> {
  const name = input.name.trim();
  if (!name) throw new AccountError('client_name_required');
  const ws = await defaults(tx, workspaceId);
  const country = (input.country ?? ws.country).toUpperCase();
  // A client abroad defaults to its own country's currency and time zone.
  const local =
    country !== ws.country && SUPPORTED_COUNTRIES.includes(country)
      ? workspaceDefaults(country)
      : null;
  const id = uuidv7();
  await call(() =>
    tx.insert(clients).values({
      id,
      workspaceId,
      name,
      legalName: input.legalName?.trim() || null,
      ...taxFields(input, country),
      country,
      currency: (input.currency ?? local?.currency ?? ws.currency).toUpperCase(),
      timeZone: input.timeZone ?? local?.timeZone ?? ws.timeZone,
      billingAddress: input.billingAddress ?? null,
      preferredChannel: input.preferredChannel ?? 'email',
      notes: input.notes ?? null,
      fromLeadId: input.fromLeadId ?? null,
      isExample: input.isExample ?? false,
      createdBy: actorId,
    }),
  );
  if (input.contact) await addContact(tx, id, { ...input.contact, isPrimary: true });
  await clientActivity(
    tx,
    workspaceId,
    id,
    'created',
    actorId,
    input.fromLeadId ? { fromLeadId: input.fromLeadId } : {},
  );
  return id;
}

async function clientActivity(
  tx: Tx,
  workspaceId: string,
  clientId: string,
  kind: string,
  actorId: string | null,
  meta: Record<string, unknown> = {},
) {
  await tx
    .insert(activities)
    .values({ workspaceId, subjectType: 'client', subjectId: clientId, kind, actorId, meta });
}

export async function updateClient(tx: Tx, clientId: string, patch: Partial<ClientInput>) {
  const [current] = await tx.select().from(clients).where(eq(clients.id, clientId));
  if (!current) throw new AccountError('client_not_found');
  const country = (patch.country ?? current.country).toUpperCase();
  const tax =
    patch.gstin !== undefined || patch.country !== undefined
      ? taxFields(
          {
            gstin: patch.gstin === undefined ? current.gstin : patch.gstin,
            stateCode: patch.stateCode ?? current.stateCode,
          },
          country,
        )
      : patch.stateCode !== undefined
        ? { stateCode: patch.stateCode }
        : {};
  const rows = await call(() =>
    tx
      .update(clients)
      .set({
        ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
        ...(patch.legalName !== undefined ? { legalName: patch.legalName } : {}),
        ...(patch.currency ? { currency: patch.currency.toUpperCase() } : {}),
        ...(patch.timeZone ? { timeZone: patch.timeZone } : {}),
        ...(patch.billingAddress !== undefined ? { billingAddress: patch.billingAddress } : {}),
        ...(patch.preferredChannel ? { preferredChannel: patch.preferredChannel } : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
        country,
        ...tax,
      })
      .where(eq(clients.id, clientId))
      .returning({ id: clients.id }),
  );
  if (rows.length === 0) throw new AccountError('client_not_found');
}

export async function getClient(tx: Tx, clientId: string) {
  return (await getClients(tx, [clientId]))[0] ?? null;
}

/** Clients with their contacts (main contact first), in two queries however many. */
export async function getClients(tx: Tx, clientIds: string[]) {
  if (clientIds.length === 0) return [];
  const rows = await tx.select().from(clients).where(inArray(clients.id, clientIds));
  if (rows.length === 0) return [];
  const contacts = await tx
    .select()
    .from(clientContacts)
    .where(
      inArray(
        clientContacts.clientId,
        rows.map((c) => c.id),
      ),
    )
    .orderBy(sql`${clientContacts.isPrimary} desc`, asc(clientContacts.createdAt));
  const contactsOf = new Map<string, typeof contacts>();
  for (const c of contacts) contactsOf.set(c.clientId, [...(contactsOf.get(c.clientId) ?? []), c]);
  const order = new Map(clientIds.map((id, n) => [id, n]));
  return rows
    .sort((a, b) => order.get(a.id)! - order.get(b.id)!)
    .map((client) => ({ ...client, contacts: contactsOf.get(client.id) ?? [] }));
}

export async function listClients(
  tx: Tx,
  workspaceId: string,
  {
    search,
    limit = 100,
    offset = 0,
  }: {
    search?: string;
    /** null lists every client (for the list, export and dashboard). */
    limit?: number | null;
    offset?: number;
  } = {},
) {
  const term = search?.trim().replace(/[\\%_]/g, (c) => `\\${c}`);
  const query = tx
    .select()
    .from(clients)
    .where(
      and(
        eq(clients.workspaceId, workspaceId),
        isNull(clients.deletedAt),
        term
          ? or(
              ilike(clients.name, `%${term}%`),
              ilike(clients.legalName, `%${term}%`),
              ilike(clients.gstin, `%${term}%`),
            )
          : undefined,
      ),
    )
    .orderBy(asc(clients.name), asc(clients.id))
    .$dynamic();
  return limit === null ? query : query.limit(limit).offset(offset);
}

/** Soft delete; needs clients.delete. */
export async function deleteClient(tx: Tx, clientId: string, at: Date | null = new Date()) {
  const [client] = await tx
    .select({ workspaceId: clients.workspaceId })
    .from(clients)
    .where(eq(clients.id, clientId));
  if (!client) throw new AccountError('client_not_found');
  const [allowed] = await tx.execute<{ ok: boolean }>(
    sql`select has_permission(${client.workspaceId}::uuid, 'clients.delete') as ok`,
  );
  if (!allowed?.ok) throw new AccountError('no_access');
  await tx.update(clients).set({ deletedAt: at }).where(eq(clients.id, clientId));
}

// ---- Contacts ----

export async function addContact(tx: Tx, clientId: string, input: ContactInput): Promise<string> {
  const [client] = await tx
    .select({ workspaceId: clients.workspaceId })
    .from(clients)
    .where(eq(clients.id, clientId));
  if (!client) throw new AccountError('client_not_found');
  const values = contactValues(input);
  const [{ n } = { n: 0 }] = await tx
    .select({ n: count() })
    .from(clientContacts)
    .where(eq(clientContacts.clientId, clientId));
  const isPrimary = input.isPrimary ?? n === 0;
  if (isPrimary) await clearPrimary(tx, clientId);
  const id = uuidv7();
  await call(() =>
    tx
      .insert(clientContacts)
      .values({ id, workspaceId: client.workspaceId, clientId, ...values, isPrimary }),
  );
  return id;
}

async function clearPrimary(tx: Tx, clientId: string) {
  await tx
    .update(clientContacts)
    .set({ isPrimary: false })
    .where(and(eq(clientContacts.clientId, clientId), eq(clientContacts.isPrimary, true)));
}

export async function updateContact(tx: Tx, contactId: string, input: Partial<ContactInput>) {
  const [contact] = await tx.select().from(clientContacts).where(eq(clientContacts.id, contactId));
  if (!contact) throw new AccountError('contact_not_found');
  const values = contactValues({ ...contact, ...input });
  if (input.isPrimary) await clearPrimary(tx, contact.clientId);
  await call(() =>
    tx
      .update(clientContacts)
      .set({ ...values, ...(input.isPrimary !== undefined ? { isPrimary: input.isPrimary } : {}) })
      .where(eq(clientContacts.id, contactId)),
  );
}

export async function removeContact(tx: Tx, contactId: string) {
  const rows = await tx
    .delete(clientContacts)
    .where(eq(clientContacts.id, contactId))
    .returning({ clientId: clientContacts.clientId, isPrimary: clientContacts.isPrimary });
  const removed = rows[0];
  if (!removed) throw new AccountError('contact_not_found');
  if (removed.isPrimary) {
    const [next] = await tx
      .select({ id: clientContacts.id })
      .from(clientContacts)
      .where(eq(clientContacts.clientId, removed.clientId))
      .orderBy(asc(clientContacts.createdAt))
      .limit(1);
    if (next)
      await tx
        .update(clientContacts)
        .set({ isPrimary: true })
        .where(eq(clientContacts.id, next.id));
  }
}

// ---- Portal access ----

/**
 * Gives a contact portal access. The app then sends the magic link (email, with a WhatsApp share);
 * the login is linked when they sign in with that email (claimPortalAccess). Counts towards the
 * plan's portal-client limit only when the client has no portal contact yet.
 */
export async function invitePortalContact(tx: Tx, contactId: string, actorId: string) {
  const [contact] = await tx.select().from(clientContacts).where(eq(clientContacts.id, contactId));
  if (!contact) throw new AccountError('contact_not_found');
  if (!contact.email) throw new AccountError('portal_email_required');
  const [already] = await tx
    .select({ id: clientContacts.id })
    .from(clientContacts)
    .where(
      and(
        eq(clientContacts.clientId, contact.clientId),
        ne(clientContacts.id, contactId),
        isNotNull(clientContacts.portalInvitedAt),
        isNull(clientContacts.portalRevokedAt),
      ),
    )
    .limit(1);
  if (!already && !(contact.portalInvitedAt && !contact.portalRevokedAt)) {
    const limit = await checkPlanLimit(tx, contact.workspaceId, 'portal_clients');
    if (!limit.allowed) throw new AccountError('plan_limit', limit.message);
  }
  await call(() =>
    tx
      .update(clientContacts)
      .set({ portalInvitedAt: new Date(), portalRevokedAt: null })
      .where(eq(clientContacts.id, contactId)),
  );
  await clientActivity(tx, contact.workspaceId, contact.clientId, 'portal_invited', actorId, {
    contactId,
    email: contact.email,
  });
  return { email: contact.email, clientId: contact.clientId };
}

export async function revokePortalContact(tx: Tx, contactId: string, actorId: string) {
  const [contact] = await tx
    .update(clientContacts)
    .set({ portalRevokedAt: new Date() })
    .where(eq(clientContacts.id, contactId))
    .returning();
  if (!contact) throw new AccountError('contact_not_found');
  await clientActivity(tx, contact.workspaceId, contact.clientId, 'portal_revoked', actorId, {
    contactId,
  });
}

/** Call right after a portal sign-in: links the login to every contact invited with its email. */
export async function claimPortalAccess(tx: Tx): Promise<number> {
  const [row] = await call(() => tx.execute<{ n: number }>(sql`select claim_portal_access() as n`));
  return row?.n ?? 0;
}

export type PortalClient = {
  client_id: string;
  client_name: string;
  workspace_id: string;
  workspace_name: string;
  logo_path: string | null;
  brand_color: string | null;
  plan: (typeof workspaces.$inferSelect)['plan'];
  workspace_slug: string;
  contact_id: string;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  client_gstin: string | null;
  client_state_code: string | null;
  client_country: string;
  client_city: string | null;
  client_currency: string;
};

/** The clients the signed-in portal user belongs to, with only what the portal shows. */
export async function portalClients(tx: Tx): Promise<PortalClient[]> {
  return [...(await tx.execute<PortalClient>(sql`select * from portal_clients()`))];
}

// ---- Lead to client ----

/**
 * One click on a won lead: creates the client with everything the lead already has (name,
 * company, contact, currency) and links them. Running it again returns the same client.
 */
export async function convertLeadToClient(
  tx: Tx,
  leadId: string,
  actorId: string,
  overrides: Partial<ClientInput> = {},
): Promise<{ clientId: string; created: boolean }> {
  const [row] = await tx
    .select({ lead: leads, kind: pipelineStages.kind })
    .from(leads)
    .innerJoin(pipelineStages, eq(pipelineStages.id, leads.stageId))
    .where(and(eq(leads.id, leadId), isNull(leads.deletedAt)));
  if (!row) throw new AccountError('lead_not_found');
  const { lead } = row;
  if (lead.convertedClientId) return { clientId: lead.convertedClientId, created: false };
  if (row.kind !== 'won') {
    const [signed] = await tx
      .select({ id: proposals.id })
      .from(proposals)
      .where(and(eq(proposals.leadId, lead.id), eq(proposals.status, 'signed')))
      .limit(1);
    if (!signed) throw new AccountError('lead_not_won');
  }
  const clientId = await createClient(
    tx,
    lead.workspaceId,
    {
      name: lead.company ?? lead.name,
      currency: lead.currency,
      notes: lead.notes,
      isExample: lead.isExample,
      ...overrides,
      contact: { name: lead.name, email: lead.email, phone: lead.phone },
      fromLeadId: lead.id,
    },
    actorId,
  );
  await tx.update(leads).set({ convertedClientId: clientId }).where(eq(leads.id, lead.id));
  await logActivity(tx, {
    workspaceId: lead.workspaceId,
    leadId: lead.id,
    kind: 'converted',
    actorId,
    meta: { clientId },
    isExample: lead.isExample,
  });
  return { clientId, created: true };
}

export async function clientActivities(tx: Tx, workspaceId: string, clientId: string) {
  return tx
    .select()
    .from(activities)
    .where(
      and(
        eq(activities.workspaceId, workspaceId),
        eq(activities.subjectType, 'client'),
        eq(activities.subjectId, clientId),
      ),
    )
    .orderBy(sql`${activities.createdAt} desc`, sql`${activities.id} desc`);
}
