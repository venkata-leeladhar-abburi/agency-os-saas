import { beforeEach, describe, expect, it } from 'vitest';
import { getInvoice, settings } from '../data';
import { resetExampleStore } from '../data/example-store';
import { portalInvoice } from '../data/portal';
import { acceptProposal, getProposal, getQuote, proposalHash, startSigning } from '../data/sales';
import { InvoicePdf } from './invoice';
import { ProposalPdf } from './proposal';
import { QuotePdf } from './quote';
import { pdfBrand, pdfFileName, pdfResponse } from './render';

beforeEach(() => {
  resetExampleStore();
});

async function render(el: React.ReactElement) {
  const res = await pdfResponse(el, 'test');
  const bytes = Buffer.from(await res.arrayBuffer());
  const text = bytes.toString('latin1');
  return {
    res,
    head: text.slice(0, 5),
    // pdfkit writes page objects uncompressed.
    pages: text.match(/\/Type \/Page\b/g)?.length ?? 0,
  };
}

describe('PDFs', () => {
  it('names files safely', () => {
    expect(pdfFileName('OSS/26-27/017')).toBe('OSS-26-27-017.pdf');
    expect(pdfFileName('quote-Q/26-27/003')).toBe('quote-Q-26-27-003.pdf');
    expect(pdfFileName('"; rm -rf /')).toBe('rm--rf.pdf');
    expect(pdfFileName('///')).toBe('document.pdf');
  });

  it('renders an invoice as a private download', async () => {
    const found = (await getInvoice('inv-14'))!;
    const { res, head, pages } = await render(
      <InvoicePdf {...found} brand={pdfBrand(found.settings)} />,
    );
    expect(head).toBe('%PDF-');
    expect(pages).toBe(1);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('cache-control')).toBe('private, no-store');
  });

  it('renders a draft invoice and a quote', async () => {
    const draft = (await getInvoice('inv-draft'))!;
    expect((await render(<InvoicePdf {...draft} brand={pdfBrand(draft.settings)} />)).head).toBe(
      '%PDF-',
    );
    const q = (await getQuote('q-northwind'))!;
    const s = await settings();
    expect(
      (
        await render(
          <QuotePdf quote={q.quote} totals={q.totals} settings={s} brand={pdfBrand(s)} />,
        )
      ).pages,
    ).toBe(1);
  });

  it('adds the signing record page once a proposal is signed', async () => {
    const token = 'example-northwind-7Hq2xP9';
    const before = (await getProposal('p-northwind'))!;
    const doc = (f: typeof before) => (
      <ProposalPdf
        proposal={f.proposal}
        quote={f.quote}
        totals={f.totals}
        status={f.status}
        settings={f.settings}
        brand={pdfBrand(f.settings)}
        currentHash={proposalHash(f.proposal, f.quote)}
      />
    );
    const unsigned = (await render(doc(before))).pages;

    const started = await startSigning(token);
    await acceptProposal(token, {
      name: 'Sarah Lee',
      code: started.code!,
      ip: '203.0.113.7',
      userAgent: 'Test browser',
    });
    const after = (await getProposal('p-northwind'))!;
    expect(after.proposal.signature).toMatchObject({
      method: 'email_code',
      userAgent: 'Test browser',
      documentHash: proposalHash(after.proposal, after.quote),
    });
    expect((await render(doc(after))).pages).toBe(unsigned + 1);
  });

  it('gives the portal only issued invoices, with the client for the PDF', async () => {
    expect(await portalInvoice('mitra', 'inv-draft')).toBeNull();
    const own = await portalInvoice('acme', 'inv-14');
    expect(own?.client.id).toBe('acme');
    expect(await portalInvoice('northwind', 'inv-14')).toBeNull();
  });
});

describe('proposalHash', () => {
  it('changes when the price or the text changes', async () => {
    const f = (await getProposal('p-northwind'))!;
    const hash = proposalHash(f.proposal, f.quote);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(proposalHash(f.proposal, f.quote)).toBe(hash);
    const cheaper = { ...f.quote, discountMinor: f.quote.discountMinor + 100n };
    expect(proposalHash(f.proposal, cheaper)).not.toBe(hash);
    expect(proposalHash({ ...f.proposal, title: 'Other' }, f.quote)).not.toBe(hash);
  });
});
