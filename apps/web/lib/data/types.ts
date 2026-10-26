import type { InvoiceLineInput, LeadSource, LostReason } from '@agency-os/core';

/** The records the workspace screens work with. The database rows map onto these. */

export type StageId = 'new' | 'contacted' | 'proposal' | 'won' | 'lost';

export const STAGES: { id: StageId; name: string }[] = [
  { id: 'new', name: 'New' },
  { id: 'contacted', name: 'Contacted' },
  { id: 'proposal', name: 'Proposal' },
  { id: 'won', name: 'Won' },
  { id: 'lost', name: 'Lost' },
];

export type ActivityKind = 'created' | 'note' | 'stage' | 'won' | 'lost' | 'invoice' | 'payment';

export type Activity = {
  id: string;
  kind: ActivityKind;
  who: string;
  /** What happened, after the name: "moved it to Proposal". */
  text: string;
  /** ISO timestamp. */
  at: string;
};

export type Lead = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  stage: StageId;
  valueMinor: bigint;
  source: LeadSource;
  service: string;
  owner: string;
  /** ISO timestamp of the next follow-up, or null. */
  followUpAt: string | null;
  notes: string;
  lostReason: LostReason | null;
  clientId: string | null;
  activities: Activity[];
  createdAt: string;
};

export type PortalStatus = 'active' | 'invited' | 'not_invited';

export type Client = {
  id: string;
  name: string;
  contactName: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  /** ISO country code; IN bills GST by state. */
  country: string;
  currency: string;
  gstin: string | null;
  stateCode: string | null;
  notes: string;
  portal: PortalStatus;
  createdAt: string;
  activities: Activity[];
};

export type GateStatus = 'draft' | 'waiting' | 'approved' | 'changes';

export type Project = {
  id: string;
  name: string;
  clientId: string;
  lead: string;
  template: 'seven_phases' | 'blank';
  /** Index of the phase in progress. */
  phase: number;
  budgetMinor: bigint;
  usedMinor: bigint;
  startOn: string;
  dueOn: string;
  gate: { title: string; status: GateStatus; approver: string; sentAt: string | null } | null;
  activities: Activity[];
  createdAt: string;
};

export type PaymentMethod = 'bank_transfer' | 'upi' | 'card' | 'cash' | 'wise' | 'paypal' | 'other';

export type Payment = {
  id: string;
  amountMinor: bigint;
  receivedOn: string;
  method: PaymentMethod;
  reference: string | null;
};

export type Invoice = {
  id: string;
  /** Given when the invoice is issued; drafts have none. */
  number: string | null;
  clientId: string;
  currency: string;
  issuedOn: string | null;
  dueOn: string;
  lines: InvoiceLineInput[];
  /** INR per unit of the invoice currency, for invoices outside India. */
  exchangeRate: string | null;
  payments: Payment[];
  createdAt: string;
};

export type WorkspaceSettings = {
  name: string;
  gstin: string | null;
  stateCode: string | null;
  lutArn: string | null;
  invoicePrefix: string;
  paymentTermsDays: number;
};
