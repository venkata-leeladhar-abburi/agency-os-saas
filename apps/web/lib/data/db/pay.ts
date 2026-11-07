// Server only. The pay link on the database: the token is the key (only its hash is stored).
// The page shows the same as in example mode: the invoice as issued, the client, the agency.
import { AccountError, payLinkInvoice, totalsOfInvoice } from '@agency-os/db';
import { database } from '../../server/db';
import { invoiceState } from '../views';
import { clientFromDb, invoiceFromDb, settingsFromDb } from './map';

export async function payLinkFor(token: string, now = new Date(), db = database()) {
  if (!db) return null;
  try {
    const found = await payLinkInvoice(db, token);
    const invoice = invoiceFromDb(found.invoice, found.items, found.payments, null, token);
    const totals = totalsOfInvoice(found.invoice, found.items);
    const settings = settingsFromDb(found.settings);
    return {
      invoice,
      client: clientFromDb(found.client),
      totals,
      state: invoiceState(invoice, totals.total.amountMinor, now),
      settings,
      brand: {
        name: settings.name,
        logoUrl: settings.logo?.url ?? null,
        colour: settings.brandColour,
        plan: settings.plan,
      },
    };
  } catch (error) {
    // A link that opens nothing reads as not found, whatever the reason.
    if (error instanceof AccountError) return null;
    throw error;
  }
}
