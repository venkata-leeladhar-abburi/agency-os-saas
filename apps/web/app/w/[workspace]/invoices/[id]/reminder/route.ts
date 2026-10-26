import { getInvoice } from '@/lib/data';
import { invoiceReminderEmail } from '@/lib/email';
import { siteOrigin } from '@/lib/origin';
import { canOpenWorkspace, notFoundResponse } from '@/lib/server/access';

/** The next reminder email for an issued invoice, as the client will see it. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ workspace: string; id: string }> },
) {
  const { workspace, id } = await params;
  if (!(await canOpenWorkspace(workspace))) return notFoundResponse();
  const found = await getInvoice(id);
  if (!found?.invoice.number || !found.reminders) return notFoundResponse();
  const next =
    found.reminders.find((r) => r.state === 'due' || r.state === 'scheduled') ??
    found.reminders.at(-1)!;
  const { subject, html } = await invoiceReminderEmail({
    ...found,
    kind: next.kind,
    payUrl: `${await siteOrigin()}/pay/${found.invoice.payToken}`,
  });
  // Show the subject above the email, as a mail app would.
  const page = html.replace(
    /<body([^>]*)>/,
    `<body$1><p style="font:14px system-ui,sans-serif;margin:16px auto;max-width:520px">Subject: <strong>${escape(subject)}</strong></p>`,
  );
  return new Response(page, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
      // A preview only: no scripts, images from data URLs or https only.
      'Content-Security-Policy':
        "default-src 'none'; img-src data: https:; style-src 'unsafe-inline'; form-action 'none'",
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function escape(s: string) {
  return s.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!,
  );
}
