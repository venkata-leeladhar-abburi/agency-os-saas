import { describe, expect, it } from 'vitest';
import { notificationCopy as copy, renderNotificationEmail } from './notification';

const base = { agency: { name: 'One Stop Solutions' }, url: 'https://app.example/p/one-stop/x' };

describe('notification emails', () => {
  it('asks the client to approve, with the lead’s note and a link to the portal', async () => {
    const email = copy.gateRequested({
      ...base,
      gate: 'Homepage design',
      project: 'Website',
      by: 'Ravi Kumar',
      message: 'Two options attached.',
    });
    expect(email.subject).toBe('Approve Homepage design');
    const { html, text } = await renderNotificationEmail(email);
    expect(text).toContain('Ravi Kumar asked you to approve “Homepage design” for Website.');
    expect(text).toContain('“Two options attached.”');
    expect(html).toContain('href="https://app.example/p/one-stop/x"');
    expect(text).toContain('Reply to this email to reach them.');
  });

  it('tells the lead about a decision, in the defaults’ words', () => {
    const p = { ...base, client: 'Acme Labs', gate: 'Homepage design', project: 'Website' };
    expect(copy.gateDecided({ ...p, approved: true, comment: null }).subject).toBe(
      'Acme Labs approved Homepage design',
    );
    expect(copy.gateDecided({ ...p, approved: false, comment: 'Bigger logo' }).subject).toBe(
      'Acme Labs asked for changes to Homepage design',
    );
  });

  it('points members to their settings, and never says the message itself', async () => {
    const email = copy.messagePosted({
      ...base,
      name: 'Srinivas Beere',
      project: 'Website',
      audience: 'member',
    });
    expect(email.subject).toBe('New message from Srinivas Beere about Website');
    const { text } = await renderNotificationEmail(email);
    expect(text).toContain('Settings, Notifications');
  });

  it('sends the invoice with its amount and due date, greeting by first name', async () => {
    const email = copy.invoiceSent({
      ...base,
      number: 'OSS/26-27/015',
      amount: '₹47,200.00',
      dueDate: '2 Nov 2026',
      contactName: 'Srinivas Beere',
    });
    expect(email.subject).toBe('Invoice OSS/26-27/015 from One Stop Solutions');
    const { text } = await renderNotificationEmail(email);
    expect(text).toContain('Hi Srinivas,');
    expect(text).toContain('Pay ₹47,200.00');
  });

  it('escapes names, and has no exclamation marks', async () => {
    const all = [
      copy.portalInvited({ ...base, agency: { name: '<b>Kite & Co</b>' }, contactName: null }),
      copy.messagePosted({ ...base, name: 'A', project: 'B', audience: 'client' }),
    ];
    for (const email of all) {
      const { html, text } = await renderNotificationEmail(email);
      expect(html).not.toContain('<b>Kite');
      expect(text).not.toContain('!');
    }
  });
});
