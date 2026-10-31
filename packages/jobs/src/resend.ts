// Sending through Resend's API, once RESEND_API_KEY and EMAIL_FROM are set. Without them there
// is no sender, and emails stay queued: nothing is marked sent that wasn't.
import type { Send } from './run';

export function resendSender(
  env: Record<string, string | undefined> = process.env,
  fetcher: typeof fetch = fetch,
): Send | null {
  const key = env.RESEND_API_KEY;
  const from = env.EMAIL_FROM;
  if (!key || !from) return null;
  return async (email) => {
    const res = await fetcher('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(email.replyTo ? { reply_to: email.replyTo } : {}),
      }),
    });
    if (!res.ok) return { status: 'failed', error: `Resend answered ${res.status}` };
    const body = (await res.json().catch(() => ({}))) as { id?: string };
    return { status: 'sent', providerId: body.id ?? null };
  };
}
