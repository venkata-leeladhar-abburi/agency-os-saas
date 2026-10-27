import { describe, expect, it } from 'vitest';
import {
  checkClient,
  checkInvoice,
  checkLead,
  checkLines,
  checkLostReason,
  checkPayment,
  checkProject,
  checkSettings,
  checkBranding,
  checkLogo,
  fields,
  parseAmount,
  DEFAULT_INVOICE_FOOTER,
} from './forms';

const lead = {
  name: 'Kiran Kumar',
  contact: '90149 52056',
  source: 'instagram',
  service: 'Website',
  value: '80,000',
  followUpOn: '2026-10-27',
};

describe('checkLead', () => {
  it('accepts a lead and turns rupees into paise', () => {
    const r = checkLead(lead);
    expect(r.ok && r.value).toMatchObject({
      phone: '+919014952056',
      email: null,
      valueMinor: 8_000_000n,
    });
  });
  it('takes an email instead of a phone', () => {
    const r = checkLead({ ...lead, contact: 'Kiran@Kite.in' });
    expect(r.ok && r.value.email).toBe('kiran@kite.in');
  });
  it('says what is missing', () => {
    const r = checkLead({ ...lead, name: ' ', contact: '' });
    expect(!r.ok && r.errors).toEqual({
      name: 'Add a name so you can find this lead.',
      contact: 'Add a phone number or an email.',
    });
  });
  it('rejects a bad email, phone, value and source', () => {
    expect(checkLead({ ...lead, contact: 'kiran@' }).ok).toBe(false);
    expect(checkLead({ ...lead, contact: '12345' }).ok).toBe(false);
    expect(checkLead({ ...lead, value: 'eighty' }).ok).toBe(false);
    expect(checkLead({ ...lead, source: 'tv' }).ok).toBe(false);
  });
  it('treats an empty value as zero', () => {
    const r = checkLead({ ...lead, value: '' });
    expect(r.ok && r.value.valueMinor).toBe(0n);
  });
});

describe('checkLostReason', () => {
  it('needs a known reason', () => {
    expect(checkLostReason({ reason: '' }).ok).toBe(false);
    expect(checkLostReason({ reason: 'price', note: ' x ' })).toEqual({
      ok: true,
      value: { reason: 'price', note: 'x' },
    });
  });
});

describe('checkClient', () => {
  const client = { name: 'Kite & Co', contactName: 'Kiran', country: 'IN' };
  it('takes the state from the GSTIN', () => {
    const r = checkClient({ ...client, gstin: '29abcde1234f1zw' });
    expect(r.ok && r.value).toMatchObject({
      gstin: '29ABCDE1234F1ZW',
      stateCode: '29',
      currency: 'INR',
    });
  });
  it('explains a short GSTIN', () => {
    const r = checkClient({ ...client, gstin: '29ABCDE1234' });
    expect(!r.ok && r.errors.gstin).toBe('A GSTIN has 15 characters. This one has 11.');
  });
  it('refuses a GSTIN outside India and sets the currency', () => {
    expect(checkClient({ ...client, country: 'GB', gstin: '29ABCDE1234F1ZW' }).ok).toBe(false);
    const r = checkClient({ ...client, country: 'GB' });
    expect(r.ok && r.value.currency).toBe('GBP');
  });
});

describe('checkProject', () => {
  const p = {
    name: 'Kite website',
    clientId: 'acme',
    template: 'seven_phases',
    lead: 'Ananya Iyer',
    budget: '80,000',
    startOn: '2026-11-02',
    dueOn: '2026-12-20',
  };
  it('accepts a project', () => {
    const r = checkProject(p, ['acme'], ['Ananya Iyer']);
    expect(r.ok && r.value.budgetMinor).toBe(8_000_000n);
  });
  it('rejects a due date before the start and an unknown client', () => {
    const r = checkProject({ ...p, clientId: 'x', dueOn: '2026-10-01' }, ['acme'], ['Ananya Iyer']);
    expect(!r.ok && Object.keys(r.errors).sort()).toEqual(['clientId', 'dueOn']);
  });
});

describe('checkLines and checkInvoice', () => {
  const line = { description: 'Website', sac: '998314', quantity: '1', rate: '30,000' };
  it('parses lines into minor units with 18% GST', () => {
    const { lines, errors } = checkLines([line], 'INR');
    expect(errors).toEqual({});
    expect(lines[0]).toMatchObject({ rateMinor: 3_000_000n, taxRateBp: 1800, quantity: '1' });
  });
  it('marks each bad line', () => {
    const { errors } = checkLines(
      [line, { description: '', sac: '12', quantity: '0', rate: '' }],
      'INR',
    );
    expect(Object.keys(errors[1]!).sort()).toEqual(['description', 'quantity', 'rate', 'sac']);
  });
  const clients = [
    { id: 'acme', currency: 'INR', country: 'IN' },
    { id: 'nw', currency: 'USD', country: 'GB' },
  ];
  it('needs an exchange rate for a foreign currency', () => {
    const f = { clientId: 'nw', dueOn: '2026-11-02', lines: JSON.stringify([line]) };
    const r = checkInvoice(f, clients);
    expect(!r.ok && r.errors.exchangeRate).toMatch(/one USD/);
    const ok = checkInvoice({ ...f, exchangeRate: '84.20', intent: 'issue' }, clients);
    expect(ok.ok && ok.value).toMatchObject({
      currency: 'USD',
      exchangeRate: '84.20',
      issue: true,
    });
  });
  it('needs a line', () => {
    const r = checkInvoice({ clientId: 'acme', dueOn: '2026-11-02', lines: '[]' }, clients);
    expect(!r.ok && r.errors.lines).toBe('Add at least one line.');
  });
});

describe('checkPayment', () => {
  const inv = { currency: 'INR', totalMinor: 4_720_000n, paidMinor: 2_000_000n };
  const f = { amount: '27,200', receivedOn: '2026-10-25', method: 'upi' };
  it('settles the invoice when the rest is paid', () => {
    const r = checkPayment(f, inv, '2026-10-26');
    expect(r.ok && r.value).toMatchObject({ amountMinor: 2_720_000n, status: 'paid' });
  });
  it('refuses more than is due and future dates', () => {
    const r = checkPayment({ ...f, amount: '30,000', receivedOn: '2026-12-01' }, inv, '2026-10-26');
    expect(!r.ok && r.errors).toEqual({
      amount: 'This is more than the amount due (₹27,200.00).',
      receivedOn: 'That date is in the future. Pick today or earlier.',
    });
  });
});

describe('checkSettings', () => {
  const s = { name: 'One Stop', invoicePrefix: 'oss', paymentTermsDays: '7' };
  it('upper-cases the prefix and allows no GSTIN', () => {
    const r = checkSettings(s);
    expect(r.ok && r.value).toMatchObject({ invoicePrefix: 'OSS', gstin: null, stateCode: null });
  });
  it('limits the prefix length and the LUT ARN', () => {
    const r = checkSettings({ ...s, invoicePrefix: 'ONESTOPSOL', lutArn: 'AD36' });
    expect(!r.ok && Object.keys(r.errors).sort()).toEqual(['invoicePrefix', 'lutArn']);
  });
  it('cleans up bank details and fills the default footer', () => {
    const r = checkSettings({
      ...s,
      accountName: 'One Stop Solutions',
      accountNumber: '1234 5678 9012',
      ifsc: 'abcd0123456',
      swift: 'abcd in bb',
    });
    expect(r.ok && r.value).toMatchObject({
      bank: {
        accountName: 'One Stop Solutions',
        accountNumber: '123456789012',
        ifsc: 'ABCD0123456',
        swift: 'ABCDINBB',
      },
      invoiceFooter: DEFAULT_INVOICE_FOOTER,
      address: null,
    });
  });
  it('says how to fix bank details', () => {
    const r = checkSettings({ ...s, accountNumber: '12AB', ifsc: 'HDFC123', swift: 'XY' });
    expect(!r.ok && Object.keys(r.errors).sort()).toEqual([
      'accountName',
      'accountNumber',
      'ifsc',
      'swift',
    ]);
    const noIfsc = checkSettings({ ...s, accountName: 'A', accountNumber: '123456789' });
    expect(!noIfsc.ok && noIfsc.errors.ifsc).toMatch(/Add the IFSC/);
  });
});

describe('checkBranding', () => {
  it('takes a hex colour or nothing', () => {
    expect(checkBranding({ brandColour: '#0F766E' })).toEqual({
      ok: true,
      value: { brandColour: '#0f766e' },
    });
    expect(checkBranding({ brandColour: ' ' })).toEqual({ ok: true, value: { brandColour: null } });
    const bad = checkBranding({ brandColour: 'teal' });
    expect(!bad.ok && bad.errors.brandColour).toMatch(/6 digits/);
  });
  it('saves a light colour too: the portal decides whether to use it', () => {
    expect(checkBranding({ brandColour: '#FACC15' }).ok).toBe(true);
  });
});

describe('checkLogo', () => {
  const file = (bytes: number[], name = 'logo.png') => new File([new Uint8Array(bytes)], name);
  it('accepts PNG and JPEG by their first bytes', async () => {
    const png = await checkLogo(file([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]));
    expect(png.ok && png.value.dataUrl).toMatch(/^data:image\/png;base64,/);
    const jpeg = await checkLogo(file([0xff, 0xd8, 0xff, 0xe0], 'logo.jpg'));
    expect(jpeg.ok && jpeg.value.dataUrl).toMatch(/^data:image\/jpeg;base64,/);
  });
  it('refuses other files, whatever they are called', async () => {
    const svg = await checkLogo(file([...Buffer.from('<svg onload=alert(1)>')], 'logo.png'));
    expect(!svg.ok && svg.errors.logo).toBe('Use a PNG or JPEG file.');
  });
  it('refuses big files', async () => {
    const big = await checkLogo(file([0x89, 0x50, 0x4e, 0x47, ...new Array(600 * 1024).fill(0)]));
    expect(!big.ok && big.errors.logo).toMatch(/under 500 KB/);
  });
});

describe('reading form fields', () => {
  it('drops Next’s own fields and keeps a field named __proto__ as plain data', () => {
    const form = new FormData();
    form.append('name', 'Kite & Co');
    form.append('$ACTION_ID_abc', 'x');
    form.append('__proto__', 'polluted');
    const f = fields(form);
    expect(f.name).toBe('Kite & Co');
    expect(Object.keys(f)).not.toContain('$ACTION_ID_abc');
    expect(Object.getPrototypeOf(f)).toBe(Object.prototype);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe('parseAmount', () => {
  it('takes a currency sign in front, commas and one decimal point', () => {
    expect(parseAmount('₹4,86,000', 'INR')).toBe(48_600_000n);
    expect(parseAmount('Rs. 1,000.50', 'INR')).toBe(100_050n);
    expect(parseAmount('.5', 'INR')).toBe(50n);
    expect(parseAmount('₹.5', 'INR')).toBe(50n);
    expect(parseAmount('Rs.5', 'INR')).toBe(500n);
    expect(parseAmount('', 'INR')).toBe(0n);
    expect(parseAmount('1.2.3', 'INR')).toBeNull();
    expect(parseAmount('12a', 'INR')).toBeNull();
  });
  it('stays fast on long hostile input', () => {
    const started = performance.now();
    expect(parseAmount(`${','.repeat(50_000)}x`, 'INR')).toBeNull();
    expect(performance.now() - started).toBeLessThan(50);
  });
});
