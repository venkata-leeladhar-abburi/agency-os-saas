import { gstinCheckCharacter } from '@agency-os/core';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { acceptInvitation, createWorkspace, inviteMember } from '../src/accounts';
import { withUser, type Session } from '../src/client';
import {
  addContact,
  claimPortalAccess,
  clientActivities,
  convertLeadToClient,
  createClient,
  deleteClient,
  getClient,
  invitePortalContact,
  listClients,
  portalClients,
  removeContact,
  revokePortalContact,
  updateClient,
  updateContact,
} from '../src/clients';
import { createLead, leadActivities, listStages, moveLead } from '../src/leads';
import { checkPlanLimit, exportWorkspace } from '../src/platform';
import { clientContacts, clients } from '../src/schema';
import { createTestDb, type TestDb } from './db';

let t: TestDb;
let owner: Session;
let finance: Session;
let member: Session;
let outsider: Session;
let ws: string;
let other: string;

const as = <T>(s: Session, fn: Parameters<typeof withUser<T>>[2]) => withUser(t.db, s, fn);
const pgError = (pattern: RegExp) => ({
  cause: expect.objectContaining({ message: expect.stringMatching(pattern) }),
});
const denied = pgError(/row-level security/);
const gstin = (first14: string) => first14 + gstinCheckCharacter(first14);

beforeAll(async () => {
  t = await createTestDb();
  owner = { userId: await t.createUser('kiran@onestop.in'), email: 'kiran@onestop.in' };
  finance = { userId: await t.createUser('meera@onestop.in'), email: 'meera@onestop.in' };
  member = { userId: await t.createUser('arjun@onestop.in'), email: 'arjun@onestop.in' };
  outsider = {
    userId: await t.createUser('sarah@northwind.example'),
    email: 'sarah@northwind.example',
  };
  ws = await as(owner, (tx) => createWorkspace(tx, { name: 'One Stop Solutions' }));
  other = await as(outsider, (tx) => createWorkspace(tx, { name: 'Northwind Studio' }));
  await t.admin`update workspaces set plan = 'growth' where id = ${ws}`;
  for (const [s, role] of [
    [finance, 'finance'],
    [member, 'member'],
  ] as const) {
    const { token } = await as(owner, (tx) =>
      inviteMember(tx, { workspaceId: ws, email: s.email!, role, invitedBy: owner.userId }),
    );
    await as(s, (tx) => acceptInvitation(tx, token));
  }
}, 60_000);

afterAll(async () => {
  await t?.drop();
});

describe('clients', () => {
  it('defaults to the workspace’s country, currency and time zone', async () => {
    const id = await as(owner, (tx) =>
      createClient(
        tx,
        ws,
        {
          name: ' Example Kite & Co ',
          gstin: gstin('29ABCDE1234F1Z'),
          contact: { name: 'Example Contact', email: 'Contact@Kite.example' },
        },
        owner.userId,
      ),
    );
    const client = await as(owner, (tx) => getClient(tx, id));
    expect(client).toMatchObject({
      name: 'Example Kite & Co',
      country: 'IN',
      currency: 'INR',
      timeZone: 'Asia/Kolkata',
      stateCode: '29',
      preferredChannel: 'email',
    });
    expect(client!.contacts).toEqual([
      expect.objectContaining({
        name: 'Example Contact',
        email: 'contact@kite.example',
        isPrimary: true,
      }),
    ]);
    expect((await as(owner, (tx) => clientActivities(tx, ws, id)))[0]).toMatchObject({
      kind: 'created',
    });
  });

  it('gives a client abroad its own currency and time zone', async () => {
    const id = await as(owner, (tx) =>
      createClient(tx, ws, { name: 'Example Northwind', country: 'us' }, owner.userId),
    );
    expect(await as(owner, (tx) => getClient(tx, id))).toMatchObject({
      country: 'US',
      currency: 'USD',
      timeZone: 'America/New_York',
    });
  });

  it('checks the GSTIN and says how to fix it', async () => {
    await expect(
      as(owner, (tx) =>
        createClient(tx, ws, { name: 'Example Bad', gstin: '29ABCDE1234F1Z1' }, owner.userId),
      ),
    ).rejects.toMatchObject({
      code: 'gstin_invalid',
      message: "This GSTIN's last character doesn't match. Check for a typo.",
    });
    await expect(
      as(owner, (tx) =>
        createClient(
          tx,
          ws,
          { name: 'Example Abroad', country: 'GB', gstin: gstin('29ABCDE1234F1Z') },
          owner.userId,
        ),
      ),
    ).rejects.toMatchObject({ code: 'gstin_outside_india' });
    await expect(
      as(owner, (tx) => createClient(tx, ws, { name: '  ' }, owner.userId)),
    ).rejects.toMatchObject({ code: 'client_name_required' });
  });

  it('updates details; a new GSTIN changes the state code', async () => {
    const id = await as(owner, (tx) =>
      createClient(tx, ws, { name: 'Example Lumen Foods', stateCode: '36' }, owner.userId),
    );
    await as(owner, (tx) =>
      updateClient(tx, id, {
        gstin: gstin('27ABCDE1234F1Z'),
        preferredChannel: 'whatsapp',
        notes: 'Prefers calls after 4 pm.',
      }),
    );
    expect(await as(owner, (tx) => getClient(tx, id))).toMatchObject({
      stateCode: '27',
      preferredChannel: 'whatsapp',
    });
    await as(owner, (tx) => updateClient(tx, id, { gstin: null, stateCode: '36' }));
    expect(await as(owner, (tx) => getClient(tx, id))).toMatchObject({
      gstin: null,
      stateCode: '36',
    });
    await expect(
      as(owner, (tx) => updateClient(tx, '00000000-0000-7000-8000-000000000000', { name: 'x' })),
    ).rejects.toMatchObject({ code: 'client_not_found' });
  });

  it('searches by name and GSTIN', async () => {
    expect(
      (await as(owner, (tx) => listClients(tx, ws, { search: 'kite' }))).map((c) => c.name),
    ).toEqual(['Example Kite & Co']);
    expect(await as(owner, (tx) => listClients(tx, ws, { search: '29ABCDE' }))).toHaveLength(1);
  });
});

describe('contacts', () => {
  it('keeps exactly one primary contact', async () => {
    const id = await as(owner, (tx) =>
      createClient(tx, ws, { name: 'Example Contacts Co' }, owner.userId),
    );
    const a = await as(owner, (tx) =>
      addContact(tx, id, { name: 'Example A', phone: '+91 98765-43210' }),
    );
    const b = await as(owner, (tx) =>
      addContact(tx, id, { name: 'Example B', email: 'b@example.com' }),
    );
    let contacts = (await as(owner, (tx) => getClient(tx, id)))!.contacts;
    expect(contacts.map((c) => [c.name, c.isPrimary, c.phone])).toEqual([
      ['Example A', true, '+919876543210'],
      ['Example B', false, null],
    ]);
    await as(owner, (tx) => updateContact(tx, b, { isPrimary: true, role: 'Founder' }));
    contacts = (await as(owner, (tx) => getClient(tx, id)))!.contacts;
    expect(contacts[0]).toMatchObject({ name: 'Example B', isPrimary: true, role: 'Founder' });
    await as(owner, (tx) => removeContact(tx, b));
    contacts = (await as(owner, (tx) => getClient(tx, id)))!.contacts;
    expect(contacts).toEqual([expect.objectContaining({ id: a, isPrimary: true })]);
    await expect(as(owner, (tx) => addContact(tx, id, { name: ' ' }))).rejects.toMatchObject({
      code: 'contact_name_required',
    });
  });

  it('keeps a contact in its client’s workspace', async () => {
    const [mine] = await as(owner, (tx) => listClients(tx, ws, { limit: 1 }));
    await expect(
      as(outsider, (tx) =>
        tx
          .insert(clientContacts)
          .values({ workspaceId: other, clientId: mine!.id, name: 'Sneaky' }),
      ),
    ).rejects.toMatchObject(pgError(/client_not_found/));
  });
});

describe('access', () => {
  it('lets finance read clients but not change them', async () => {
    const [client] = await as(finance, (tx) => listClients(tx, ws, { limit: 1 }));
    expect(client).toBeDefined();
    await expect(
      as(finance, (tx) => updateClient(tx, client!.id, { name: 'Changed' })),
    ).rejects.toMatchObject({ code: 'client_not_found' });
    await expect(
      as(finance, (tx) => createClient(tx, ws, { name: 'Finance client' }, finance.userId)),
    ).rejects.toMatchObject(denied);
    await expect(as(finance, (tx) => deleteClient(tx, client!.id))).rejects.toMatchObject({
      code: 'no_access',
    });
  });

  it('shows members only the clients of their projects (none yet), and nothing to other workspaces', async () => {
    expect(await as(member, (tx) => listClients(tx, ws))).toEqual([]);
    expect(await as(member, (tx) => tx.select().from(clientContacts))).toEqual([]);
    expect(await as(outsider, (tx) => tx.select().from(clients))).toEqual([]);
  });

  it('soft-deletes with clients.delete', async () => {
    const id = await as(owner, (tx) =>
      createClient(tx, ws, { name: 'Example To Delete' }, owner.userId),
    );
    await as(owner, (tx) => deleteClient(tx, id));
    expect(await as(owner, (tx) => listClients(tx, ws, { search: 'To Delete' }))).toEqual([]);
    await as(owner, (tx) => deleteClient(tx, id, null));
    expect(await as(owner, (tx) => listClients(tx, ws, { search: 'To Delete' }))).toHaveLength(1);
  });
});

describe('lead to client', () => {
  it('needs a won lead, carries everything over and runs once', async () => {
    const stages = await as(owner, (tx) => listStages(tx, ws));
    const won = stages.find((s) => s.kind === 'won')!.id;
    const leadId = await as(owner, (tx) =>
      createLead(
        tx,
        ws,
        {
          name: 'Example Priya',
          company: 'Example Lumen Labs',
          email: 'priya@lumen.example',
          phone: '+91 90000 11111',
          currency: 'INR',
          notes: 'Met at a meetup.',
        },
        owner.userId,
      ),
    );
    await expect(
      as(owner, (tx) => convertLeadToClient(tx, leadId, owner.userId)),
    ).rejects.toMatchObject({ code: 'lead_not_won' });
    await as(owner, (tx) => moveLead(tx, { leadId, stageId: won, actorId: owner.userId }));
    const first = await as(owner, (tx) => convertLeadToClient(tx, leadId, owner.userId));
    expect(first.created).toBe(true);
    const client = await as(owner, (tx) => getClient(tx, first.clientId));
    expect(client).toMatchObject({
      name: 'Example Lumen Labs',
      currency: 'INR',
      notes: 'Met at a meetup.',
      fromLeadId: leadId,
    });
    expect(client!.contacts).toEqual([
      expect.objectContaining({
        name: 'Example Priya',
        email: 'priya@lumen.example',
        phone: '+919000011111',
        isPrimary: true,
      }),
    ]);
    expect(await as(owner, (tx) => convertLeadToClient(tx, leadId, owner.userId))).toEqual({
      clientId: first.clientId,
      created: false,
    });
    expect((await as(owner, (tx) => leadActivities(tx, ws, leadId)))[0]).toMatchObject({
      kind: 'converted',
      meta: { clientId: first.clientId },
    });
    expect(
      (await t.admin`select converted_client_id from leads where id = ${leadId}`)[0]!
        .converted_client_id,
    ).toBe(first.clientId);
  });
});

describe('client portal access', () => {
  let clientId: string;
  let contactId: string;
  let portalUser: Session;

  beforeAll(async () => {
    await t.admin`update workspaces set plan = 'free' where id = ${ws}`;
    clientId = await as(owner, (tx) =>
      createClient(
        tx,
        ws,
        {
          name: 'Example Portal Client',
          notes: 'Internal: slow payer.',
          contact: { name: 'Example Portal Person', email: 'portal@client.example' },
        },
        owner.userId,
      ),
    );
    contactId = (await as(owner, (tx) => getClient(tx, clientId)))!.contacts[0]!.id;
    portalUser = {
      userId: await t.createUser('Portal@Client.example'),
      email: 'portal@client.example',
    };
  });

  it('invites a contact with an email, within the plan’s portal limit', async () => {
    const noEmail = await as(owner, (tx) =>
      addContact(tx, clientId, { name: 'Example No Email', phone: '+919999999999' }),
    );
    await expect(
      as(owner, (tx) => invitePortalContact(tx, noEmail, owner.userId)),
    ).rejects.toMatchObject({ code: 'portal_email_required' });
    expect(await as(owner, (tx) => invitePortalContact(tx, contactId, owner.userId))).toEqual({
      email: 'portal@client.example',
      clientId,
    });
    expect(await as(owner, (tx) => checkPlanLimit(tx, ws, 'portal_clients'))).toMatchObject({
      used: 1,
      allowed: false,
    });
    // A second contact at the same client is fine; a second client is over Free's limit.
    await as(owner, (tx) => updateContact(tx, noEmail, { email: 'second@client.example' }));
    await as(owner, (tx) => invitePortalContact(tx, noEmail, owner.userId));
    const another = await as(owner, (tx) =>
      createClient(
        tx,
        ws,
        { name: 'Example Second', contact: { name: 'X', email: 'x@second.example' } },
        owner.userId,
      ),
    );
    const anotherContact = (await as(owner, (tx) => getClient(tx, another)))!.contacts[0]!.id;
    await expect(
      as(owner, (tx) => invitePortalContact(tx, anotherContact, owner.userId)),
    ).rejects.toMatchObject({
      code: 'plan_limit',
      message:
        'Your Free plan includes 1 client with a portal. Upgrade to Agency Starter to add more.',
    });
  });

  it('links the login when the invited email signs in, and shows only safe fields', async () => {
    expect(await as(portalUser, (tx) => portalClients(tx))).toEqual([]);
    expect(await as(portalUser, (tx) => claimPortalAccess(tx))).toBe(1);
    const mine = await as(portalUser, (tx) => portalClients(tx));
    expect(mine).toEqual([
      {
        client_id: clientId,
        client_name: 'Example Portal Client',
        workspace_id: ws,
        workspace_name: 'One Stop Solutions',
        workspace_slug: 'one-stop-solutions',
        logo_path: null,
        brand_color: null,
        plan: 'free',
        contact_id: contactId,
        contact_name: 'Example Portal Person',
        contact_email: 'portal@client.example',
        contact_phone: null,
        client_gstin: null,
        client_state_code: null,
        client_country: expect.any(String),
        client_city: null,
        client_currency: 'INR',
      },
    ]);
    expect(JSON.stringify(mine)).not.toContain('slow payer');
    // Portal users are not members: no direct table access.
    expect(await as(portalUser, (tx) => tx.select().from(clients))).toEqual([]);
    expect(await as(portalUser, (tx) => claimPortalAccess(tx))).toBe(0);
  });

  it('never lets anyone set the portal login by hand', async () => {
    await expect(
      as(owner, (tx) =>
        tx
          .update(clientContacts)
          .set({ userId: owner.userId })
          .where(eq(clientContacts.id, contactId)),
      ),
    ).rejects.toMatchObject(pgError(/portal_user_locked/));
  });

  it('removes access when revoked or when the email changes', async () => {
    await as(owner, (tx) => revokePortalContact(tx, contactId, owner.userId));
    expect(await as(portalUser, (tx) => portalClients(tx))).toEqual([]);
    await as(owner, (tx) => invitePortalContact(tx, contactId, owner.userId));
    expect(await as(portalUser, (tx) => portalClients(tx))).toHaveLength(1);
    await as(owner, (tx) => updateContact(tx, contactId, { email: 'new.person@client.example' }));
    expect(await as(portalUser, (tx) => portalClients(tx))).toEqual([]);
    const kinds = (await as(owner, (tx) => clientActivities(tx, ws, clientId))).map((a) => a.kind);
    expect(kinds).toEqual(expect.arrayContaining(['portal_invited', 'portal_revoked']));
  });

  it('includes clients and contacts in the export', async () => {
    await t.admin`update workspaces set plan = 'growth' where id = ${ws}`;
    const data = await as(owner, (tx) => exportWorkspace(tx, ws, owner.userId));
    expect(data.tables.clients!.length).toBeGreaterThan(3);
    expect(data.tables.client_contacts!.length).toBeGreaterThan(3);
  });
});
