// Runs the quote and proposal screens' data functions against a real Postgres
// (TEST_DATABASE_URL): the agency's pages as a member with RLS, and the public link as the
// server runs it, so a proposal goes from quote to signature the way it will in production.
import { randomBytes } from 'node:crypto';
import { createLead, createWorkspace, getLead, proposalLinkToken, withUser } from '@agency-os/db';
import type { Session } from '@agency-os/db';
import { createTestDb, type TestDb } from '@agency-os/db/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { WorkspaceCtx } from '../../server/workspace';
import { leadDetail } from './people';
import {
  createProposalFor,
  createQuoteFor,
  declineFor,
  nextNumber,
  proposalDetail,
  proposalForLink,
  quoteDetail,
  recipients,
  salesItems,
  saveProposalTextFor,
  sendProposalFor,
  signFor,
  signingCodeFor,
} from './sales';

const run = describe.skipIf(!process.env.TEST_DATABASE_URL);
const SECRET = randomBytes(32).toString('hex');
let t: TestDb;
let ctx: WorkspaceCtx;
let other: WorkspaceCtx;
let lead: string;
let quote: string;
let proposal: string;
const line = {
  description: 'Website design',
  sac: '998314',
  quantity: 1,
  rateMinor: 10_000_000n,
  taxRateBp: 1800,
};
const quoteInput = (leadId: string) => ({
  leadId,
  clientId: null,
  country: 'IN',
  currency: 'INR',
  stateCode: '37',
  validUntil: '2026-11-30',
  lines: [line],
  discountMinor: 0n,
});

run('quotes and proposals on the database', () => {
  beforeAll(async () => {
    t = await createTestDb();
    vi.stubEnv('LINK_SIGNING_SECRET', SECRET);
    vi.stubEnv('DATABASE_URL', t.url);
    const owner: Session = {
      userId: await t.createUser('kiran@onestop.in'),
      email: 'kiran@onestop.in',
    };
    const outsider: Session = {
      userId: await t.createUser('sarah@northwind.example'),
      email: 'sarah@northwind.example',
    };
    const as = <T>(s: Session, fn: Parameters<typeof withUser<T>>[2]) => withUser(t.db, s, fn);
    const ws = await as(owner, (tx) =>
      createWorkspace(tx, { name: 'One Stop Solutions', slug: 'one-stop' }),
    );
    const ws2 = await as(outsider, (tx) =>
      createWorkspace(tx, { name: 'Northwind', slug: 'northwind' }),
    );
    await t.admin`update workspaces set plan = 'growth', gstin = '37ABCDE1234F1ZZ', state_code = '37' where id = ${ws}`;
    lead = await as(owner, (tx) =>
      createLead(
        tx,
        ws,
        { name: 'Example Meera Iyer', company: 'Example Kite & Co', email: 'meera@kite.example' },
        owner.userId,
      ),
    );
    ctx = {
      db: t.db,
      session: owner,
      workspaceId: ws,
      slug: 'one-stop',
      role: 'owner',
      plan: 'growth',
    };
    other = {
      db: t.db,
      session: outsider,
      workspaceId: ws2,
      slug: 'northwind',
      role: 'owner',
      plan: 'free',
    };
  }, 60_000);

  afterAll(async () => {
    vi.unstubAllEnvs();
    await t?.drop();
  });

  it('makes a quote for an open lead, with GST in the same state', async () => {
    const { leads } = await recipients(ctx);
    expect(leads).toEqual([{ id: lead, name: 'Example Kite & Co' }]);
    const number = await nextNumber(ctx);
    quote = await createQuoteFor(ctx, quoteInput(lead));
    const found = (await quoteDetail(ctx, quote))!;
    expect(found.quote).toMatchObject({
      number,
      recipient: 'Example Kite & Co',
      country: 'IN',
      stateCode: '37',
      validUntil: '2026-11-30',
    });
    expect(found.totals).toMatchObject({ treatment: 'intra' });
    expect(found.totals.total.amountMinor).toBe(11_800_000n);
    expect(found.proposal).toBeNull();
  });

  it('makes one proposal per quote, edits it, and sends it with a link to copy again', async () => {
    proposal = await createProposalFor(ctx, quote);
    expect(await createProposalFor(ctx, quote)).toBe(proposal);
    await saveProposalTextFor(ctx, proposal, {
      about: 'Example agency in Visakhapatnam',
      goals: ['Launch before Diwali'],
      included: ['Website design'],
      excluded: ['Hosting'],
      paymentTerms: '50% to start',
      terms: '',
    });
    let page = (await proposalDetail(ctx, proposal))!;
    expect(page.status).toBe('draft');
    expect(page.proposal.token).toBe('');

    await sendProposalFor(ctx, proposal, 'Meera@Kite.example');
    page = (await proposalDetail(ctx, proposal))!;
    expect(page.status).toBe('sent');
    expect(page.proposal).toMatchObject({
      email: 'meera@kite.example',
      token: proposalLinkToken(SECRET, proposal),
    });
    expect(page.hash).toHaveLength(64);
    // Sending moves a new lead to Proposal.
    expect((await leadDetail(ctx, lead))!.stage).toBe('proposal');
    await expect(
      saveProposalTextFor(ctx, proposal, {
        about: 'Changed',
        goals: [],
        included: [],
        excluded: [],
        paymentTerms: '',
        terms: '',
      }),
    ).rejects.toThrow(/was sent/);

    const [row] = await salesItems(ctx);
    expect(row).toMatchObject({ kind: 'Proposal', forName: 'Example Kite & Co', status: 'sent' });
  });

  it('opens the public link, counts views but not the agency’s preview', async () => {
    const token = proposalLinkToken(SECRET, proposal);
    const preview = (await proposalForLink(token, false))!;
    expect(preview).toMatchObject({ status: 'sent', workspace: 'One Stop Solutions' });
    expect(preview.settings.gstin).toBe('37ABCDE1234F1ZZ');
    const seen = (await proposalForLink(token, true, { ip: '203.0.113.7' }))!;
    expect(seen.status).toBe('viewed');
    expect(seen.proposal.views).toBe(1);
    expect(seen.proposal.blocks.some((b) => b.type === 'scope')).toBe(true);
    expect(await proposalForLink('not-a-token', true)).toBeNull();
  });

  it('signs with the code sent to the address it went to, and wins the lead', async () => {
    const token = proposalLinkToken(SECRET, proposal);
    const started = await signingCodeFor(token);
    expect(started).toMatchObject({ email: 'meera@kite.example', agency: 'One Stop Solutions' });
    const wrong = started.code === '000000' ? '111111' : '000000';
    await expect(
      signFor(token, { name: 'Example Meera Iyer', code: wrong, ip: '203.0.113.7' }),
    ).rejects.toThrow(/code isn’t right/);
    await signFor(token, { name: 'Example Meera Iyer', code: started.code, ip: '203.0.113.7' });
    const page = (await proposalDetail(ctx, proposal))!;
    expect(page.status).toBe('accepted');
    expect(page.proposal.signature).toMatchObject({
      name: 'Example Meera Iyer',
      email: 'meera@kite.example',
      documentHash: page.hash,
    });
    expect(page.proposal.activities.map((a) => a.kind)).toEqual([
      'signed',
      'viewed',
      'sent',
      'created',
    ]);
    const won = await withUser(t.db, ctx.session, (tx) => getLead(tx, lead));
    expect(won!.convertedClientId).not.toBeNull();
    expect((await quoteDetail(ctx, quote))!.quote.clientId).toBe(won!.convertedClientId);
  });

  it('can be declined, once', async () => {
    const q2 = await createQuoteFor(ctx, quoteInput(lead));
    const p2 = await createProposalFor(ctx, q2);
    await sendProposalFor(ctx, p2, 'meera@kite.example');
    const token = proposalLinkToken(SECRET, p2);
    await declineFor(token, 'Budget moved to next year');
    expect((await proposalDetail(ctx, p2))!).toMatchObject({
      status: 'declined',
      proposal: { declineReason: 'Budget moved to next year' },
    });
    await expect(declineFor(token, 'Again')).rejects.toThrow(/declined/);
  });

  it('shows none of it to another workspace', async () => {
    expect(await salesItems(other)).toEqual([]);
    expect(await quoteDetail(other, quote)).toBeNull();
    expect(await proposalDetail(other, proposal)).toBeNull();
    await expect(createProposalFor(other, quote)).rejects.toThrow();
    await expect(sendProposalFor(other, proposal, 'x@example.com')).rejects.toThrow();
  });
});
