import { standardProposal } from '@agency-os/core';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { acceptInvitation, createWorkspace, inviteMember } from '../src/accounts';
import { withService, withUser, type Session } from '../src/client';
import { convertLeadToClient, createClient } from '../src/clients';
import { createLead, getLead, leadActivities, listStages } from '../src/leads';
import { listNotifications } from '../src/platform';
import {
  createProposal,
  createQuote,
  declineProposal,
  expireProposals,
  getQuote,
  proposalByLink,
  proposalLinkToken,
  proposalSignature,
  requestSigningCode,
  sendProposal,
  sendQuote,
  signProposal,
  updateProposal,
  updateQuote,
  viewProposal,
} from '../src/sales-docs';
import { proposals, quoteItems, quotes, signatures, signingCodes } from '../src/schema';
import { createTestDb, type TestDb } from './db';

let t: TestDb;
let owner: Session;
let finance: Session;
let outsider: Session;
let ws: string;
let leadId: string;

const as = <T>(s: Session, fn: Parameters<typeof withUser<T>>[2]) => withUser(t.db, s, fn);
const pgError = (pattern: RegExp) => ({
  cause: expect.objectContaining({ message: expect.stringMatching(pattern) }),
});
const now = new Date('2026-10-26T09:30:00Z');
const later = (days: number) => new Date(now.getTime() + days * 86_400_000);
const items = [
  {
    description: 'Website design',
    sacCode: '998314',
    quantity: 1,
    rateMinor: 20_000_000n,
    taxRateBp: 1800,
  },
  { description: 'Development', quantity: '2', rateMinor: 5_000_000n, taxRateBp: 1800 },
];

beforeAll(async () => {
  t = await createTestDb();
  owner = { userId: await t.createUser('kiran@onestop.in'), email: 'kiran@onestop.in' };
  finance = { userId: await t.createUser('meera@onestop.in'), email: 'meera@onestop.in' };
  outsider = {
    userId: await t.createUser('sarah@northwind.example'),
    email: 'sarah@northwind.example',
  };
  ws = await as(owner, (tx) => createWorkspace(tx, { name: 'One Stop Solutions' }));
  await as(outsider, (tx) => createWorkspace(tx, { name: 'Northwind Studio' }));
  await t.admin`update workspaces set plan = 'growth', gstin = '36AAACO1234A1Z5', state_code = '36' where id = ${ws}`;
  const { token } = await as(owner, (tx) =>
    inviteMember(tx, {
      workspaceId: ws,
      email: finance.email!,
      role: 'finance',
      invitedBy: owner.userId,
    }),
  );
  await as(finance, (tx) => acceptInvitation(tx, token));
  leadId = await as(owner, (tx) =>
    createLead(
      tx,
      ws,
      { name: 'Example Priya', company: 'Example Kite & Co', email: 'priya@kite.example' },
      owner.userId,
    ),
  );
}, 60_000);

afterAll(async () => {
  await t?.drop();
});

describe('quotes', () => {
  it('numbers quotes consecutively per financial year', async () => {
    const a = await as(owner, (tx) => createQuote(tx, ws, { leadId, items }, owner.userId, now));
    const b = await as(owner, (tx) => createQuote(tx, ws, { leadId, items }, owner.userId, now));
    const c = await as(owner, (tx) =>
      createQuote(tx, ws, { leadId, items }, owner.userId, new Date('2027-04-02T06:00:00Z')),
    );
    const numbers = await Promise.all(
      [a, b, c].map(async (id) => (await as(owner, (tx) => getQuote(tx, id)))!.number),
    );
    expect(numbers).toEqual(['OSS/Q26-27/001', 'OSS/Q26-27/002', 'OSS/Q27-28/001']);
  });

  it('works out GST in core and stores the totals and lines', async () => {
    const id = await as(owner, (tx) =>
      createQuote(tx, ws, { leadId, items, discountMinor: 3_000_000n }, owner.userId, now),
    );
    const q = (await as(owner, (tx) => getQuote(tx, id)))!;
    expect(q).toMatchObject({
      currency: 'INR',
      supplierStateCode: '36',
      placeOfSupplyCode: '36',
      subtotalMinor: 27_000_000n,
      cgstMinor: 2_430_000n,
      sgstMinor: 2_430_000n,
      igstMinor: 0n,
      totalMinor: 31_860_000n,
      status: 'draft',
      validUntil: '2026-11-09',
    });
    expect(q.items.map((i) => [i.description, i.quantity, i.taxableMinor, i.amountMinor])).toEqual([
      ['Website design', '1.000', 18_000_000n, 21_240_000n],
      ['Development', '2.000', 9_000_000n, 10_620_000n],
    ]);
    expect((await as(owner, (tx) => leadActivities(tx, ws, leadId)))[0]).toMatchObject({
      kind: 'quote_created',
    });
  });

  it('uses the client’s state, or export rules for a client abroad', async () => {
    const delhi = await as(owner, (tx) =>
      createClient(tx, ws, { name: 'Example Delhi Co', stateCode: '07' }, owner.userId),
    );
    const q1 = await as(owner, (tx) =>
      createQuote(tx, ws, { clientId: delhi, items }, owner.userId, now),
    );
    expect(await as(owner, (tx) => getQuote(tx, q1))).toMatchObject({
      placeOfSupplyCode: '07',
      igstMinor: 5_400_000n,
      cgstMinor: 0n,
    });
    const us = await as(owner, (tx) =>
      createClient(tx, ws, { name: 'Example US Inc', country: 'US' }, owner.userId),
    );
    const q2 = await as(owner, (tx) =>
      createQuote(
        tx,
        ws,
        {
          clientId: us,
          items: [{ description: 'Design', quantity: 1, rateMinor: 300_000n, taxRateBp: 1800 }],
        },
        owner.userId,
        now,
      ),
    );
    expect(await as(owner, (tx) => getQuote(tx, q2))).toMatchObject({
      currency: 'USD',
      placeOfSupplyCode: null,
      exportCountry: 'US',
      igstMinor: 54_000n,
    });
    // With a LUT valid today, exports carry no IGST.
    await t.admin`update workspaces set lut_arn = 'AD360000000000X', lut_valid_from = '2026-04-01', lut_valid_to = '2027-03-31' where id = ${ws}`;
    const q3 = await as(owner, (tx) =>
      createQuote(
        tx,
        ws,
        {
          clientId: us,
          items: [{ description: 'Design', quantity: 1, rateMinor: 300_000n, taxRateBp: 1800 }],
        },
        owner.userId,
        now,
      ),
    );
    expect(await as(owner, (tx) => getQuote(tx, q3))).toMatchObject({
      hasLut: true,
      igstMinor: 0n,
      totalMinor: 300_000n,
    });
  });

  it('refuses empty or impossible quotes with a reason', async () => {
    await expect(
      as(owner, (tx) => createQuote(tx, ws, { leadId, items: [] }, owner.userId)),
    ).rejects.toMatchObject({ code: 'quote_items_required' });
    await expect(
      as(owner, (tx) =>
        createQuote(tx, ws, { leadId, items, discountMinor: 999_000_000n }, owner.userId),
      ),
    ).rejects.toMatchObject({
      code: 'quote_invalid',
      message: 'The discount must be between zero and the subtotal',
    });
    await expect(
      as(owner, (tx) => createQuote(tx, ws, { items }, owner.userId)),
    ).rejects.toMatchObject({ code: 'quote_for_required' });
  });

  it('edits drafts; a sent quote is fixed', async () => {
    const id = await as(owner, (tx) => createQuote(tx, ws, { leadId, items }, owner.userId, now));
    const totals = await as(owner, (tx) =>
      updateQuote(tx, id, { items: [items[0]!], roundOff: true }),
    );
    expect(totals.total.amountMinor).toBe(23_600_000n);
    await as(owner, (tx) => sendQuote(tx, id, owner.userId, now));
    await expect(as(owner, (tx) => updateQuote(tx, id, { items }))).rejects.toMatchObject({
      code: 'quote_locked',
    });
    await expect(
      as(owner, (tx) => tx.update(quotes).set({ totalMinor: 1n }).where(eq(quotes.id, id))),
    ).rejects.toMatchObject(pgError(/quote_locked/));
    await expect(
      as(owner, (tx) => tx.delete(quoteItems).where(eq(quoteItems.quoteId, id))),
    ).rejects.toMatchObject(pgError(/quote_locked/));
  });

  it('lets finance read but not write, and hides quotes from other workspaces', async () => {
    expect((await as(finance, (tx) => tx.select().from(quotes))).length).toBeGreaterThan(3);
    await expect(
      as(finance, (tx) => createQuote(tx, ws, { leadId, items }, finance.userId)),
    ).rejects.toMatchObject({ code: 'no_access' });
    expect(await as(outsider, (tx) => tx.select().from(quotes))).toEqual([]);
    expect(await as(outsider, (tx) => tx.select().from(quoteItems))).toEqual([]);
  });
});

describe('proposals', () => {
  let quoteId: string;
  let proposalId: string;
  let token: string;

  beforeAll(async () => {
    quoteId = await as(owner, (tx) => createQuote(tx, ws, { leadId, items }, owner.userId, now));
    proposalId = await as(owner, (tx) => createProposal(tx, ws, { quoteId }, owner.userId, now));
  });

  it('starts from the standard template, filled from the lead and quote', async () => {
    const [p] = await as(owner, (tx) =>
      tx.select().from(proposals).where(eq(proposals.id, proposalId)),
    );
    expect(p).toMatchObject({
      title: 'Proposal for Example Kite & Co',
      leadId,
      quoteId,
      status: 'draft',
    });
    const blocks = p!.blocks as ReturnType<typeof standardProposal>;
    expect(blocks[0]).toMatchObject({
      title: 'Proposal for Example Kite & Co',
      date: '26 Oct 2026',
      preparedBy: 'kiran',
    });
    expect(blocks[3]).toMatchObject({ included: ['Website design', 'Development'] });
  });

  it('sends: fixes the content, makes a 14-day link, tells the lead timeline', async () => {
    ({ token } = await as(owner, (tx) => sendProposal(tx, proposalId, owner.userId, now)));
    const [p] = await as(owner, (tx) =>
      tx.select().from(proposals).where(eq(proposals.id, proposalId)),
    );
    expect(p).toMatchObject({ status: 'sent', sentBy: owner.userId });
    expect(p!.expiresAt!.toISOString()).toBe(later(14).toISOString());
    expect(p!.documentSha256).toHaveLength(64);
    expect(p!.publicTokenHash).not.toContain(token);
    expect((await as(owner, (tx) => getQuote(tx, quoteId)))!.status).toBe('sent');
    await expect(
      as(owner, (tx) => updateProposal(tx, proposalId, { blocks: [] })),
    ).rejects.toMatchObject({ code: 'proposal_locked' });
    await expect(
      as(owner, (tx) => sendProposal(tx, proposalId, owner.userId, now)),
    ).rejects.toMatchObject({ code: 'proposal_locked' });
  });

  it('shows the client what was sent and records each view; the first one tells the sender', async () => {
    const page = await viewProposal(
      t.db,
      token,
      { ip: '203.0.113.7', userAgent: 'Example browser' },
      later(1),
    );
    expect(page).toMatchObject({
      status: 'sent',
      title: 'Proposal for Example Kite & Co',
      workspace: { name: 'One Stop Solutions' },
      quote: { number: expect.stringMatching(/^OSS\/Q26-27\//), totalMinor: 35_400_000n },
    });
    expect(JSON.stringify(page, (_k, v) => (typeof v === 'bigint' ? String(v) : v))).not.toMatch(
      /notes|createdBy|internal/,
    );
    await viewProposal(t.db, token, {}, later(2));
    const [p] = await as(owner, (tx) =>
      tx.select().from(proposals).where(eq(proposals.id, proposalId)),
    );
    expect(p).toMatchObject({ status: 'viewed', viewCount: 2 });
    expect(p!.firstViewedAt!.toISOString()).toBe(later(1).toISOString());
    const viewed = (await as(owner, (tx) => listNotifications(tx, ws))).filter(
      (n) => n.kind === 'proposal.viewed',
    );
    expect(viewed).toHaveLength(1);
    await expect(viewProposal(t.db, 'not-a-token')).rejects.toMatchObject({
      code: 'proposal_link_invalid',
    });
  });

  it('signs only with the emailed code, and records the evidence', async () => {
    await expect(requestSigningCode(t.db, token, 'not an email', later(2))).rejects.toMatchObject({
      code: 'signer_email_invalid',
    });
    const { code } = await requestSigningCode(t.db, token, ' Priya@Kite.example ', later(2));
    expect(code).toMatch(/^\d{6}$/);
    const stored =
      await t.admin`select code_hash from signing_codes where proposal_id = ${proposalId}`;
    expect(stored[0]!.code_hash).not.toContain(code);
    const wrong = code === '000000' ? '111111' : '000000';
    await expect(
      signProposal(
        t.db,
        token,
        { name: 'Example Priya', email: 'priya@kite.example', code: wrong },
        later(2),
      ),
    ).rejects.toMatchObject({ code: 'signing_code_wrong' });
    expect(
      (await t.admin`select attempts from signing_codes where proposal_id = ${proposalId}`)[0]!
        .attempts,
    ).toBe(1);
    await expect(
      signProposal(
        t.db,
        token,
        { name: 'Example Priya', email: 'other@kite.example', code },
        later(2),
      ),
    ).rejects.toMatchObject({ code: 'signing_code_expired' });
    await expect(
      signProposal(t.db, token, { name: ' ', email: 'priya@kite.example', code }, later(2)),
    ).rejects.toMatchObject({ code: 'signer_name_required' });
    await signProposal(
      t.db,
      token,
      {
        name: 'Example Priya',
        email: 'priya@kite.example',
        code,
        ip: '203.0.113.7',
        userAgent: 'Example browser',
      },
      later(2),
    );
    const sig = await as(owner, (tx) => proposalSignature(tx, proposalId));
    const [p] = await as(owner, (tx) =>
      tx.select().from(proposals).where(eq(proposals.id, proposalId)),
    );
    expect(sig).toMatchObject({
      signerName: 'Example Priya',
      signerEmail: 'priya@kite.example',
      verifiedVia: 'email_otp',
      ip: '203.0.113.7',
      userAgent: 'Example browser',
      documentSha256: p!.documentSha256,
    });
    expect(p).toMatchObject({ status: 'signed' });
    expect((await as(owner, (tx) => getQuote(tx, quoteId)))!.status).toBe('accepted');
    expect((await as(owner, (tx) => listNotifications(tx, ws))).map((n) => n.kind)).toContain(
      'proposal.decided',
    );
    expect((await as(owner, (tx) => leadActivities(tx, ws, leadId))).map((a) => a.kind)).toEqual(
      expect.arrayContaining(['proposal_signed', 'stage_change', 'converted']),
    );
  });

  it('can’t be signed twice, reopened, or have its evidence changed', async () => {
    await expect(
      requestSigningCode(t.db, token, 'priya@kite.example', later(3)),
    ).rejects.toMatchObject({ code: 'proposal_signed' });
    await expect(declineProposal(t.db, token, 'Changed my mind', later(3))).rejects.toMatchObject({
      code: 'proposal_signed',
    });
    await expect(
      as(owner, (tx) =>
        tx.update(proposals).set({ status: 'draft' }).where(eq(proposals.id, proposalId)),
      ),
    ).rejects.toMatchObject(pgError(/proposal_locked/));
    await expect(
      as(owner, (tx) => tx.update(signatures).set({ signerName: 'Someone else' })),
    ).rejects.toMatchObject(pgError(/permission denied/));
    await expect(withService(t.db, ws, (tx) => tx.delete(signatures))).rejects.toMatchObject(
      pgError(/permission denied/),
    );
    await expect(as(owner, (tx) => tx.select().from(signingCodes))).rejects.toMatchObject(
      pgError(/permission denied/),
    );
  });

  it('wins the lead when signed: it moves to Won and becomes a client, once', async () => {
    const lead = (await as(owner, (tx) => getLead(tx, leadId)))!;
    const won = (await as(owner, (tx) => listStages(tx, ws))).find((s) => s.kind === 'won')!;
    expect(lead.stageId).toBe(won.id);
    expect(lead.convertedClientId).not.toBeNull();
    const { clientId, created } = await as(owner, (tx) =>
      convertLeadToClient(tx, leadId, owner.userId),
    );
    expect({ clientId, created }).toEqual({ clientId: lead.convertedClientId, created: false });
    expect((await as(owner, (tx) => getQuote(tx, quoteId)))!.clientId).toBe(clientId);
    const link = await proposalByLink(t.db, token, later(3));
    expect(link).toMatchObject({
      proposal: { status: 'signed', clientId },
      clientName: 'Example Kite & Co',
      signature: { signerName: 'Example Priya' },
      workspace: { name: 'One Stop Solutions' },
    });
  });

  it('makes a link that can be copied again, and keeps the address it was sent to', async () => {
    const secret = 'x'.repeat(40);
    const lead4 = await as(owner, (tx) =>
      createLead(tx, ws, { name: 'Example Four', email: 'four@example.com' }, owner.userId),
    );
    const p6 = await as(owner, (tx) =>
      createProposal(tx, ws, { leadId: lead4 }, owner.userId, now),
    );
    await expect(
      as(owner, (tx) => sendProposal(tx, p6, owner.userId, now, { secret, email: 'nope' })),
    ).rejects.toMatchObject({ code: 'signer_email_invalid' });
    const { token: t6 } = await as(owner, (tx) =>
      // Sent later than the others, so the expiry check below doesn't count it.
      sendProposal(tx, p6, owner.userId, later(15), { secret, email: ' Four@Example.com ' }),
    );
    expect(t6).toBe(proposalLinkToken(secret, p6));
    expect((await proposalByLink(t.db, t6, later(16))).proposal).toMatchObject({
      sentTo: 'four@example.com',
      viewCount: 0,
    });
  });

  it('can be declined, and expires after 14 days', async () => {
    const lead2 = await as(owner, (tx) =>
      createLead(tx, ws, { name: 'Example Two', email: 'two@example.com' }, owner.userId),
    );
    const p2 = await as(owner, (tx) =>
      createProposal(tx, ws, { leadId: lead2 }, owner.userId, now),
    );
    const { token: t2 } = await as(owner, (tx) => sendProposal(tx, p2, owner.userId, now));
    await declineProposal(t.db, t2, '  Budget moved to next year. ', later(1));
    expect(
      (await t.admin`select status, decline_reason from proposals where id = ${p2}`)[0],
    ).toMatchObject({ status: 'declined', decline_reason: 'Budget moved to next year.' });

    const p3 = await as(owner, (tx) =>
      createProposal(tx, ws, { leadId: lead2 }, owner.userId, now),
    );
    const { token: t3 } = await as(owner, (tx) => sendProposal(tx, p3, owner.userId, now));
    expect((await viewProposal(t.db, t3, {}, later(15))).status).toBe('expired');
    await expect(requestSigningCode(t.db, t3, 'two@example.com', later(15))).rejects.toMatchObject({
      code: 'proposal_expired',
    });

    const p4 = await as(owner, (tx) =>
      createProposal(tx, ws, { leadId: lead2 }, owner.userId, now),
    );
    await as(owner, (tx) => sendProposal(tx, p4, owner.userId, now));
    expect(await withService(t.db, ws, (tx, id) => expireProposals(tx, id, later(15)))).toBe(1);
  });

  it('limits codes to 5 an hour', async () => {
    const lead3 = await as(owner, (tx) =>
      createLead(tx, ws, { name: 'Example Three', email: 'three@example.com' }, owner.userId),
    );
    const p5 = await as(owner, (tx) =>
      createProposal(tx, ws, { leadId: lead3 }, owner.userId, now),
    );
    const { token: t5 } = await as(owner, (tx) => sendProposal(tx, p5, owner.userId, now));
    for (let i = 0; i < 5; i++) await requestSigningCode(t.db, t5, 'three@example.com', later(1));
    await expect(requestSigningCode(t.db, t5, 'three@example.com', later(1))).rejects.toMatchObject(
      { code: 'signing_code_limit' },
    );
  });
});

describe('plan limits', () => {
  it('lets Free send 3 quotes and 3 proposals a month', async () => {
    const free = await as(outsider, (tx) => createWorkspace(tx, { name: 'Example Free Studio' }));
    const lead = await as(outsider, (tx) =>
      createLead(tx, free, { name: 'Example Lead', email: 'lead@example.com' }, outsider.userId),
    );
    for (let i = 0; i < 3; i++) {
      const q = await as(outsider, (tx) =>
        createQuote(tx, free, { leadId: lead, items }, outsider.userId, now),
      );
      await as(outsider, (tx) => sendQuote(tx, q, outsider.userId, now));
      const p = await as(outsider, (tx) =>
        createProposal(tx, free, { leadId: lead }, outsider.userId, now),
      );
      await as(outsider, (tx) => sendProposal(tx, p, outsider.userId, now));
    }
    const q4 = await as(outsider, (tx) =>
      createQuote(tx, free, { leadId: lead, items }, outsider.userId, now),
    );
    await expect(
      as(outsider, (tx) => sendQuote(tx, q4, outsider.userId, now)),
    ).rejects.toMatchObject({
      code: 'plan_limit',
      message: 'Your Free plan includes 3 quotes a month. Upgrade to Agency Starter to add more.',
    });
    const p4 = await as(outsider, (tx) =>
      createProposal(tx, free, { leadId: lead }, outsider.userId, now),
    );
    await expect(
      as(outsider, (tx) => sendProposal(tx, p4, outsider.userId, now)),
    ).rejects.toMatchObject({ code: 'plan_limit' });
    // Next month (in India's time zone) the count starts again.
    await as(outsider, (tx) =>
      sendQuote(tx, q4, outsider.userId, new Date('2026-10-31T19:00:00Z')),
    );
  });
});
