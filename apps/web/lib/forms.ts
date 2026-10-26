// Form checks for the workspace screens. Pure: they take the submitted fields and return either
// clean values or one message per field that says how to fix it (content-style.md).
import {
  applyPayment,
  divRoundHalfUp,
  parseDecimal,
  DEFAULT_SERVICES,
  formatMoney,
  LEAD_SOURCES,
  LOST_REASONS,
  parseMoney,
  validateGstin,
  validateInvoicePrefix,
  type InvoiceLineInput,
  type LeadSource,
  type LostReason,
} from '@agency-os/core';
import { isEmail, normaliseIndianPhone } from './auth/helpers';
import type { PaymentMethod } from './data/types';

export type Fields = Record<string, string>;
export type Errors<K extends string = string> = Partial<Record<K, string>>;
export type Checked<T, K extends string = string> =
  { ok: true; value: T } | { ok: false; errors: Errors<K> };

/** FormData to plain strings (the last value wins; checkboxes give "on"). */
export function fields(form: FormData): Fields {
  const out: Fields = {};
  for (const [k, v] of form.entries()) if (typeof v === 'string') out[k] = v;
  return out;
}

const text = (f: Fields, key: string) => (f[key] ?? '').trim();
const optional = (f: Fields, key: string) => text(f, key) || null;

/** A typed amount in minor units: null when it isn't a number, 0 when empty. */
export function parseAmount(input: string, currency: string): bigint | null {
  return money(input, currency);
}

function money(input: string, currency: string): bigint | null {
  if (!input) return 0n;
  if (!/^[^\d-]*-?[\d,]*(\.\d*)?$/.test(input.trim())) return null;
  try {
    return parseMoney(input, currency);
  } catch {
    return null;
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// ---------- Leads ----------

export type LeadInput = {
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  source: LeadSource;
  service: string;
  valueMinor: bigint;
  followUpOn: string | null;
  notes: string;
};

export function checkLead(f: Fields): Checked<LeadInput> {
  const errors: Errors = {};
  const name = text(f, 'name');
  if (!name) errors.name = 'Add a name so you can find this lead.';

  const contact = text(f, 'contact');
  let email: string | null = null;
  let phone: string | null = null;
  if (!contact) errors.contact = 'Add a phone number or an email.';
  else if (contact.includes('@')) {
    if (isEmail(contact)) email = contact.toLowerCase();
    else errors.contact = 'That email looks incomplete. It should look like name@company.in.';
  } else {
    phone = normaliseIndianPhone(contact) ?? (/^\+\d[\d\s-]{6,}$/.test(contact) ? contact : null);
    if (!phone) errors.contact = 'Enter a 10-digit mobile number, or a number starting with +.';
  }

  const source = text(f, 'source') as LeadSource;
  if (!LEAD_SOURCES.includes(source)) errors.source = 'Pick where this lead came from.';
  const service = text(f, 'service');
  if (!(DEFAULT_SERVICES as readonly string[]).includes(service))
    errors.service = 'Pick a service.';

  const valueMinor = money(text(f, 'value'), 'INR');
  if (valueMinor === null || valueMinor < 0n)
    errors.value = 'Enter the value in rupees, like 80,000.';

  const followUpOn = optional(f, 'followUpOn');
  if (followUpOn && !ISO_DATE.test(followUpOn)) errors.followUpOn = 'Pick a date.';

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name,
      company: optional(f, 'company'),
      email,
      phone,
      source,
      service,
      valueMinor: valueMinor!,
      followUpOn,
      notes: text(f, 'notes'),
    },
  };
}

export function checkLostReason(f: Fields): Checked<{ reason: LostReason; note: string }> {
  const reason = text(f, 'reason') as LostReason;
  if (!LOST_REASONS.includes(reason)) return { ok: false, errors: { reason: 'Pick a reason.' } };
  return { ok: true, value: { reason, note: text(f, 'note') } };
}

export function checkNote(f: Fields): Checked<{ note: string }> {
  const note = text(f, 'note');
  if (!note) return { ok: false, errors: { note: 'Write a note first.' } };
  if (note.length > 2000)
    return { ok: false, errors: { note: 'Keep notes under 2,000 characters.' } };
  return { ok: true, value: { note } };
}

// ---------- Clients ----------

export const CLIENT_COUNTRIES = [
  { value: 'IN', label: 'India', currency: 'INR' },
  { value: 'US', label: 'United States', currency: 'USD' },
  { value: 'GB', label: 'United Kingdom', currency: 'GBP' },
  { value: 'AE', label: 'United Arab Emirates', currency: 'AED' },
  { value: 'SG', label: 'Singapore', currency: 'SGD' },
  { value: 'AU', label: 'Australia', currency: 'AUD' },
  { value: 'CA', label: 'Canada', currency: 'CAD' },
] as const;

export type ClientInput = {
  name: string;
  contactName: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string;
  currency: string;
  gstin: string | null;
  stateCode: string | null;
  notes: string;
};

export function checkClient(f: Fields): Checked<ClientInput> {
  const errors: Errors = {};
  const name = text(f, 'name');
  if (!name) errors.name = 'Add the client’s business or person name.';
  const contactName = text(f, 'contactName');
  if (!contactName) errors.contactName = 'Add who you talk to at this client.';

  const email = optional(f, 'email');
  if (email && !isEmail(email))
    errors.email = 'That email looks incomplete. It should look like name@company.in.';
  const phone = optional(f, 'phone');

  const country = CLIENT_COUNTRIES.find((c) => c.value === text(f, 'country'));
  if (!country) errors.country = 'Pick a country.';

  let gstin: string | null = null;
  let stateCode: string | null = null;
  const rawGstin = text(f, 'gstin');
  if (rawGstin) {
    if (country?.value !== 'IN')
      errors.gstin = 'Only clients in India have a GSTIN. Clear this field.';
    else {
      const result = validateGstin(rawGstin);
      if (result.ok) {
        gstin = result.gstin;
        stateCode = result.stateCode;
      } else errors.gstin = result.error;
    }
  }
  if (!stateCode && country?.value === 'IN') {
    const code = text(f, 'stateCode');
    if (code && !/^\d{2}$/.test(code)) errors.stateCode = 'Use the two-digit state code, like 29.';
    stateCode = code || null;
  }

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name,
      contactName,
      email: email?.toLowerCase() ?? null,
      phone: phone ? (normaliseIndianPhone(phone) ?? phone) : null,
      city: optional(f, 'city'),
      country: country!.value,
      currency: country!.currency,
      gstin,
      stateCode,
      notes: text(f, 'notes'),
    },
  };
}

// ---------- Projects ----------

export type ProjectInput = {
  name: string;
  clientId: string;
  template: 'seven_phases' | 'blank';
  lead: string;
  budgetMinor: bigint;
  startOn: string;
  dueOn: string;
};

export function checkProject(
  f: Fields,
  clientIds: string[],
  people: string[],
): Checked<ProjectInput> {
  const errors: Errors = {};
  const name = text(f, 'name');
  if (!name) errors.name = 'Give the project a name.';
  const clientId = text(f, 'clientId');
  if (!clientIds.includes(clientId)) errors.clientId = 'Pick a client.';
  const template = text(f, 'template');
  if (template !== 'seven_phases' && template !== 'blank') errors.template = 'Pick a template.';
  const lead = text(f, 'lead');
  if (!people.includes(lead)) errors.lead = 'Pick who leads the project.';
  const budgetMinor = money(text(f, 'budget'), 'INR');
  if (budgetMinor === null || budgetMinor < 0n)
    errors.budget = 'Enter the budget in rupees, like 80,000.';
  const startOn = text(f, 'startOn');
  const dueOn = text(f, 'dueOn');
  if (!ISO_DATE.test(startOn)) errors.startOn = 'Pick a start date.';
  if (!ISO_DATE.test(dueOn)) errors.dueOn = 'Pick a due date.';
  else if (ISO_DATE.test(startOn) && dueOn < startOn)
    errors.dueOn = 'The due date is before the start. Pick a later date.';

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name,
      clientId,
      template: template as ProjectInput['template'],
      lead,
      budgetMinor: budgetMinor!,
      startOn,
      dueOn,
    },
  };
}

// ---------- Invoices ----------

/** One line as the invoice editor sends it: strings, as typed. */
export type LineFields = { description: string; sac: string; quantity: string; rate: string };

export type InvoiceInput = {
  clientId: string;
  currency: string;
  dueOn: string;
  exchangeRate: string | null;
  lines: InvoiceLineInput[];
  issue: boolean;
};

export function checkLines(
  raw: LineFields[],
  currency: string,
): { lines: InvoiceLineInput[]; errors: Record<number, Errors> } {
  const lines: InvoiceLineInput[] = [];
  const errors: Record<number, Errors> = {};
  raw.forEach((line, i) => {
    const e: Errors = {};
    const description = line.description.trim();
    if (!description) e.description = 'Describe the work.';
    const quantity = line.quantity.trim();
    if (!/^\d+(\.\d{1,3})?$/.test(quantity) || Number(quantity) <= 0)
      e.quantity = 'Use a number above 0.';
    const rateMinor = money(line.rate.trim(), currency);
    if (rateMinor === null || rateMinor <= 0n || !line.rate.trim()) e.rate = 'Enter the rate.';
    const sac = line.sac.trim();
    if (sac && !/^\d{4,8}$/.test(sac)) e.sac = 'SAC codes have 4 to 8 digits.';
    if (Object.keys(e).length) errors[i] = e;
    else
      lines.push({
        description,
        sac: sac || undefined,
        quantity,
        rateMinor: rateMinor!,
        taxRateBp: 1800,
      });
  });
  return { lines, errors };
}

export function checkInvoice(
  f: Fields,
  clients: { id: string; currency: string; country: string }[],
): Checked<InvoiceInput> & { lineErrors?: Record<number, Errors> } {
  const errors: Errors = {};
  const client = clients.find((c) => c.id === text(f, 'clientId'));
  if (!client) errors.clientId = 'Pick a client.';
  const currency = client?.currency ?? 'INR';
  const dueOn = text(f, 'dueOn');
  if (!ISO_DATE.test(dueOn)) errors.dueOn = 'Pick a due date.';

  let exchangeRate: string | null = null;
  if (currency !== 'INR') {
    exchangeRate = text(f, 'exchangeRate');
    if (!/^\d+(\.\d{1,8})?$/.test(exchangeRate) || Number(exchangeRate) <= 0) {
      errors.exchangeRate = `Enter how many rupees one ${currency} is on the invoice date, like 84.20.`;
    }
  }

  let raw: LineFields[] = [];
  try {
    raw = JSON.parse(f.lines ?? '[]') as LineFields[];
  } catch {
    raw = [];
  }
  if (raw.length === 0) errors.lines = 'Add at least one line.';
  const { lines, errors: lineErrors } = checkLines(raw, currency);
  if (Object.keys(lineErrors).length) errors.lines = 'Fix the lines marked below.';

  if (Object.keys(errors).length) return { ok: false, errors, lineErrors };
  return {
    ok: true,
    value: {
      clientId: client!.id,
      currency,
      dueOn,
      exchangeRate,
      lines,
      issue: f.intent === 'issue',
    },
  };
}

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'wise', label: 'Wise' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'other', label: 'Other' },
];

export type PaymentInput = {
  amountMinor: bigint;
  receivedOn: string;
  method: PaymentMethod;
  reference: string | null;
  status: 'paid' | 'partially_paid';
};

export function checkPayment(
  f: Fields,
  invoice: { currency: string; totalMinor: bigint; paidMinor: bigint },
  today: string,
): Checked<PaymentInput> {
  const errors: Errors = {};
  const amountMinor = money(text(f, 'amount'), invoice.currency);
  let status: PaymentInput['status'] = 'partially_paid';
  if (amountMinor === null || !text(f, 'amount')) errors.amount = 'Enter the amount received.';
  else {
    const result = applyPayment(invoice.totalMinor, invoice.paidMinor, amountMinor, (m) =>
      formatMoney(m, invoice.currency),
    );
    if (result.ok) status = result.status;
    else errors.amount = result.error;
  }
  const receivedOn = text(f, 'receivedOn');
  if (!ISO_DATE.test(receivedOn)) errors.receivedOn = 'Pick the date the money came in.';
  else if (receivedOn > today)
    errors.receivedOn = 'That date is in the future. Pick today or earlier.';
  const method = text(f, 'method') as PaymentMethod;
  if (!PAYMENT_METHODS.some((m) => m.value === method)) errors.method = 'Pick how it was paid.';

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      amountMinor: amountMinor!,
      receivedOn,
      method,
      reference: optional(f, 'reference'),
      status,
    },
  };
}

// ---------- Settings ----------

export type SettingsInput = {
  name: string;
  gstin: string | null;
  stateCode: string | null;
  lutArn: string | null;
  invoicePrefix: string;
  paymentTermsDays: number;
};

export function checkSettings(f: Fields): Checked<SettingsInput> {
  const errors: Errors = {};
  const name = text(f, 'name');
  if (name.length < 2) errors.name = 'Give your workspace a name of at least 2 letters.';
  let gstin: string | null = null;
  let stateCode: string | null = null;
  if (text(f, 'gstin')) {
    const result = validateGstin(text(f, 'gstin'));
    if (result.ok) {
      gstin = result.gstin;
      stateCode = result.stateCode;
    } else errors.gstin = result.error;
  }
  const lutArn = optional(f, 'lutArn');
  if (lutArn && !/^[A-Z0-9]{15}$/i.test(lutArn))
    errors.lutArn = 'A LUT ARN has 15 letters and numbers.';
  const invoicePrefix = text(f, 'invoicePrefix');
  const prefix = validateInvoicePrefix(invoicePrefix);
  if (!invoicePrefix) errors.invoicePrefix = 'Add a prefix, like OSS.';
  else if (!prefix.ok) errors.invoicePrefix = prefix.error;
  const terms = Number(text(f, 'paymentTermsDays'));
  if (!Number.isInteger(terms) || terms < 0 || terms > 120)
    errors.paymentTermsDays = 'Use a whole number of days from 0 to 120.';
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name,
      gstin,
      stateCode,
      lutArn: lutArn?.toUpperCase() ?? null,
      invoicePrefix: invoicePrefix.toUpperCase(),
      paymentTermsDays: terms,
    },
  };
}

// ---------- Tasks ----------

export type TaskInput = {
  title: string;
  projectId: string;
  phase: string | null;
  assignee: string;
  dueOn: string | null;
  priority: 'low' | 'normal' | 'high';
  status: 'todo' | 'in_progress' | 'in_review' | 'done';
  description: string;
};

const TASK_STATUS_IDS = ['todo', 'in_progress', 'in_review', 'done'] as const;
const TASK_PRIORITY_IDS = ['low', 'normal', 'high'] as const;

export function checkTask(f: Fields, projectIds: string[], people: string[]): Checked<TaskInput> {
  const errors: Errors = {};
  const title = text(f, 'title');
  if (!title) errors.title = 'Say what needs doing, like “Homepage hero copy”.';
  else if (title.length > 200) errors.title = 'Keep the title under 200 characters.';
  const projectId = text(f, 'projectId');
  if (!projectIds.includes(projectId)) errors.projectId = 'Pick a project.';
  const assignee = text(f, 'assignee');
  if (!people.includes(assignee)) errors.assignee = 'Pick who does it.';
  const dueOn = optional(f, 'dueOn');
  if (dueOn && !ISO_DATE.test(dueOn)) errors.dueOn = 'Pick a date.';
  const priority = (text(f, 'priority') || 'normal') as TaskInput['priority'];
  if (!TASK_PRIORITY_IDS.includes(priority)) errors.priority = 'Pick a priority.';
  const status = (text(f, 'status') || 'todo') as TaskInput['status'];
  if (!TASK_STATUS_IDS.includes(status)) errors.status = 'Pick a status.';
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      title,
      projectId,
      phase: optional(f, 'phase'),
      assignee,
      dueOn,
      priority,
      status,
      description: text(f, 'description'),
    },
  };
}

export function checkComment(f: Fields): Checked<{ text: string }> {
  const body = text(f, 'text');
  if (!body) return { ok: false, errors: { text: 'Write a comment first.' } };
  if (body.length > 2000)
    return { ok: false, errors: { text: 'Keep comments under 2,000 characters.' } };
  return { ok: true, value: { text: body } };
}

// ---------- Quotes and proposals ----------

export type QuoteInput = {
  /** "lead:<id>" or "client:<id>". */
  leadId: string | null;
  clientId: string | null;
  country: string;
  currency: string;
  stateCode: string | null;
  validUntil: string;
  lines: InvoiceLineInput[];
  discountMinor: bigint;
};

export function checkQuote(
  f: Fields,
  options: { leadIds: string[]; clientIds: string[]; today: string },
): Checked<QuoteInput> & { lineErrors?: Record<number, Errors> } {
  const errors: Errors = {};
  const [kind, id] = text(f, 'for').split(':');
  let leadId: string | null = null;
  let clientId: string | null = null;
  if (kind === 'lead' && id && options.leadIds.includes(id)) leadId = id;
  else if (kind === 'client' && id && options.clientIds.includes(id)) clientId = id;
  else errors.for = 'Pick a lead or a client.';

  const country = CLIENT_COUNTRIES.find((c) => c.value === text(f, 'country'));
  if (!country) errors.country = 'Pick the client’s country.';
  const currency = country?.currency ?? 'INR';
  const stateCode = country?.value === 'IN' ? optional(f, 'stateCode') : null;
  if (stateCode && !/^\d{2}$/.test(stateCode))
    errors.stateCode = 'Use the two-digit state code, like 29.';

  const validUntil = text(f, 'validUntil');
  if (!ISO_DATE.test(validUntil)) errors.validUntil = 'Pick a date.';
  else if (validUntil < options.today) errors.validUntil = 'Pick today or a later date.';

  let raw: LineFields[] = [];
  try {
    raw = JSON.parse(f.lines ?? '[]') as LineFields[];
  } catch {
    raw = [];
  }
  if (raw.length === 0) errors.lines = 'Add at least one line.';
  const { lines, errors: lineErrors } = checkLines(raw, currency);
  if (Object.keys(lineErrors).length) errors.lines = 'Fix the lines marked below.';

  const discountMinor = money(text(f, 'discount'), currency);
  const subtotal = lines.reduce(
    (t, l) => t + divRoundHalfUp(parseDecimal(String(l.quantity), 3) * l.rateMinor, 1000n),
    0n,
  );
  if (discountMinor === null || discountMinor < 0n)
    errors.discount = 'Enter the discount as an amount, like 5,000.';
  else if (discountMinor > subtotal && !errors.lines)
    errors.discount = 'The discount is more than the subtotal. Lower it.';

  if (Object.keys(errors).length) return { ok: false, errors, lineErrors };
  return {
    ok: true,
    value: {
      leadId,
      clientId,
      country: country!.value,
      currency,
      stateCode,
      validUntil,
      lines,
      discountMinor: discountMinor!,
    },
  };
}

/** The editable blocks of a proposal, as the editor sends them (one field per block). */
export function checkProposalText(f: Fields): Checked<{
  about: string;
  goals: string[];
  included: string[];
  excluded: string[];
  paymentTerms: string;
  terms: string;
}> {
  const lines = (key: string) =>
    text(f, key)
      .split('\n')
      .map((l) => l.replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean);
  const value = {
    about: text(f, 'about'),
    goals: lines('goals'),
    included: lines('included'),
    excluded: lines('excluded'),
    paymentTerms: text(f, 'paymentTerms'),
    terms: text(f, 'terms'),
  };
  const errors: Errors = {};
  if (value.included.length === 0) errors.included = 'List at least one thing that’s included.';
  if (!value.paymentTerms) errors.paymentTerms = 'Say how and when you get paid.';
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value };
}

export function checkSend(f: Fields): Checked<{ email: string; message: string }> {
  const email = text(f, 'email').toLowerCase();
  if (!isEmail(email))
    return { ok: false, errors: { email: 'Enter the client’s email, like name@company.in.' } };
  return { ok: true, value: { email, message: text(f, 'message') } };
}

export function checkSignName(f: Fields): Checked<{ name: string }> {
  const name = text(f, 'name');
  if (name.length < 2) return { ok: false, errors: { name: 'Type your full name to sign.' } };
  return { ok: true, value: { name } };
}

export function checkCode(f: Fields): Checked<{ code: string }> {
  const code = text(f, 'code').replace(/\s/g, '');
  if (!/^\d{6}$/.test(code)) return { ok: false, errors: { code: 'The code has 6 digits.' } };
  return { ok: true, value: { code } };
}

// ---------- Enquiry form ----------

export const BUDGET_RANGES = [
  'Under ₹50,000',
  '₹50,000 to ₹2 L',
  '₹2 L to ₹5 L',
  'Over ₹5 L',
] as const;

export type EnquiryInput = {
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  service: string;
  budget: string | null;
  message: string;
};

export function checkEnquiry(f: Fields): Checked<EnquiryInput> {
  const errors: Errors = {};
  const name = text(f, 'name');
  if (!name) errors.name = 'Tell us your name.';
  const contact = text(f, 'contact');
  let email: string | null = null;
  let phone: string | null = null;
  if (!contact) errors.contact = 'Add an email or a phone number so we can reply.';
  else if (contact.includes('@')) {
    if (isEmail(contact)) email = contact.toLowerCase();
    else errors.contact = 'That email looks incomplete. It should look like name@company.in.';
  } else {
    phone = normaliseIndianPhone(contact) ?? (/^\+\d[\d\s-]{6,}$/.test(contact) ? contact : null);
    if (!phone) errors.contact = 'Enter a 10-digit mobile number, or a number starting with +.';
  }
  const service = text(f, 'service');
  if (!(DEFAULT_SERVICES as readonly string[]).includes(service) && service !== 'Something else')
    errors.service = 'Pick what you need.';
  const budget = optional(f, 'budget');
  if (budget && !(BUDGET_RANGES as readonly string[]).includes(budget))
    errors.budget = 'Pick a budget range.';
  const message = text(f, 'message');
  if (!message) errors.message = 'Tell us a little about the project.';
  else if (message.length > 3000) errors.message = 'Keep the message under 3,000 characters.';
  if (f.consent !== 'on') errors.consent = 'Tick this so we can reply to you.';
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: { name, email, phone, company: optional(f, 'company'), service, budget, message },
  };
}
