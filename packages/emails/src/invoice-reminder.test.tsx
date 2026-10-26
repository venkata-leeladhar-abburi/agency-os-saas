import { describe, expect, it } from 'vitest';
import { invoiceReminderSubject, renderInvoiceReminder } from './invoice-reminder';

const base = {
  agency: { name: 'One Stop Solutions' },
  contactName: 'Srinivas Beere',
  number: 'OSS/26-27/015',
  amountDue: '₹47,200.00',
  dueDate: '2 Nov 2026',
  kind: 'before_due' as const,
  payUrl: 'https://app.example/pay/abc',
};

describe('invoice reminder email', () => {
  it('uses the subject from the defaults, in the past tense once overdue', () => {
    expect(invoiceReminderSubject(base)).toBe('Invoice OSS/26-27/015 is due on 2 Nov 2026');
    expect(invoiceReminderSubject({ ...base, kind: 'after_due' })).toBe(
      'Invoice OSS/26-27/015 was due on 2 Nov 2026',
    );
  });

  it('greets by first name and links the pay button', async () => {
    const { html, text } = await renderInvoiceReminder(base);
    expect(text).toContain('Hi Srinivas,');
    expect(text).toContain('is due on 2 Nov 2026');
    expect(html).toContain('href="https://app.example/pay/abc"');
    expect(text).toContain('Pay ₹47,200.00');
    expect(text).not.toContain('already paid');
  });

  it('says today on the due date and thanks anyone who already paid after it', async () => {
    expect((await renderInvoiceReminder({ ...base, kind: 'on_due' })).text).toContain(
      'is due today, 2 Nov 2026',
    );
    const late = (await renderInvoiceReminder({ ...base, kind: 'after_due' })).text;
    expect(late).toContain('Invoice OSS/26-27/015 for ₹47,200.00 was due on 2 Nov 2026');
    expect(late).toContain('If you’ve already paid, thank you.');
  });

  it('escapes names, and has no exclamation marks', async () => {
    const { html, text } = await renderInvoiceReminder({
      ...base,
      contactName: '<script>alert(1)</script>',
      agency: { name: 'A & B <Studio>' },
    });
    expect(html).not.toContain('<script>alert(1)');
    expect(html).toContain('A &amp; B &lt;Studio&gt;');
    expect(text).not.toContain('!');
  });
});
