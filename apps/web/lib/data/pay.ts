// Server only. The pay link: one issued invoice, opened from an email or WhatsApp without
// signing in. The token is the only key; drafts never have a working link.
import { brandOf, store } from './shared';
import type { OnlineMethod } from './pay-methods';
import { examplePayment } from './portal';
import { invoiceState, invoiceTotals } from './views';

export async function invoiceByPayToken(token: string) {
  const inv = store().invoices.find((i) => i.payToken === token && i.number);
  if (!inv) return null;
  const client = store().clients.find((c) => c.id === inv.clientId)!;
  const totals = invoiceTotals(inv, client, store().settings);
  return {
    invoice: inv,
    client,
    totals,
    state: invoiceState(inv, totals.total.amountMinor),
    settings: store().settings,
    brand: brandOf(),
  };
}

/** Example mode only: pays the rest of the invoice, as the portal's pay button does. */
export async function examplePayByToken(token: string, method: OnlineMethod) {
  const found = await invoiceByPayToken(token);
  if (!found) return { ok: false as const, error: 'This link doesn’t open an invoice.' };
  return examplePayment(found.client.id, found.invoice.id, method);
}
