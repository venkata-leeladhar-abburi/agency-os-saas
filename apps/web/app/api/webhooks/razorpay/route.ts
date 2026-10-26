import { handleRazorpayWebhook } from '@agency-os/db';
import { database } from '../../../../lib/server/db';

export const dynamic = 'force-dynamic';

/** Razorpay subscription events for Agency OS's own billing. Verified, then applied once. */
export async function POST(request: Request) {
  const db = database();
  if (!db) return Response.json({ error: 'DATABASE_URL is not set' }, { status: 503 });
  const { status, body } = await handleRazorpayWebhook(db, await request.text(), {
    signature: request.headers.get('x-razorpay-signature'),
    eventId: request.headers.get('x-razorpay-event-id'),
  });
  return Response.json(body, { status });
}
