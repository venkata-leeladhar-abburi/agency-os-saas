import { afterEach, describe, expect, it, vi } from 'vitest';
import { emailReady, sendEmail } from './email';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('email', () => {
  it('is ready only with both the key and the sender', () => {
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('EMAIL_FROM', 'Agency OS <hello@example.com>');
    expect(emailReady()).toBe(false);
    vi.stubEnv('RESEND_API_KEY', 'test-key');
    expect(emailReady()).toBe(true);
  });

  it('posts to Resend with the sender and reply-to', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test-key');
    vi.stubEnv('EMAIL_FROM', 'Agency OS <hello@example.com>');
    const fetch = vi.fn(async () => new Response(JSON.stringify({ id: 'em_1' }), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    const r = await sendEmail({
      to: 'client@example.com',
      subject: 'Invoice OSS/26-27/015 is due on 2 Nov 2026',
      html: '<p>Hi</p>',
      text: 'Hi',
      replyTo: 'kiran@onestop.example',
    });
    expect(r).toEqual({ ok: true, id: 'em_1' });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-key');
    expect(JSON.parse(init.body as string)).toMatchObject({
      from: 'Agency OS <hello@example.com>',
      to: ['client@example.com'],
      reply_to: 'kiran@onestop.example',
    });
  });

  it('reports a refusal', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('bad', { status: 422 })),
    );
    expect(await sendEmail({ to: 'a@example.com', subject: 's', html: 'h', text: 't' })).toEqual({
      ok: false,
    });
  });
});
