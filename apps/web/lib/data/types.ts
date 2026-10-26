import type { InvoiceLineInput, LeadSource, LostReason, ProposalBlock } from '@agency-os/core';

/** The records the workspace screens work with. The database rows map onto these. */

export type StageId = 'new' | 'contacted' | 'proposal' | 'won' | 'lost';

export const STAGES: { id: StageId; name: string }[] = [
  { id: 'new', name: 'New' },
  { id: 'contacted', name: 'Contacted' },
  { id: 'proposal', name: 'Proposal' },
  { id: 'won', name: 'Won' },
  { id: 'lost', name: 'Lost' },
];

export type ActivityKind =
  | 'created'
  | 'note'
  | 'stage'
  | 'won'
  | 'lost'
  | 'invoice'
  | 'payment'
  | 'sent'
  | 'viewed'
  | 'signed'
  | 'declined'
  | 'enquiry'
  | 'imported';

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

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';
export type TaskPriority = 'low' | 'normal' | 'high';

export const TASK_STATUSES: { id: TaskStatus; name: string }[] = [
  { id: 'todo', name: 'To do' },
  { id: 'in_progress', name: 'In progress' },
  { id: 'in_review', name: 'In review' },
  { id: 'done', name: 'Done' },
];

export const TASK_PRIORITIES: { id: TaskPriority; name: string }[] = [
  { id: 'low', name: 'Low' },
  { id: 'normal', name: 'Normal' },
  { id: 'high', name: 'High' },
];

export type Comment = { id: string; who: string; text: string; at: string };

export type Task = {
  id: string;
  title: string;
  projectId: string;
  /** The phase name it belongs to, if any. */
  phase: string | null;
  assignee: string;
  dueOn: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  description: string;
  subtasks: { id: string; title: string; done: boolean }[];
  comments: Comment[];
  createdAt: string;
};

export type Quote = {
  id: string;
  number: string;
  /** Who it's for: a lead, a client, or both once the lead is won. */
  leadId: string | null;
  clientId: string | null;
  recipient: string;
  /** Where the client is, for GST: ISO country and, in India, the state code. */
  country: string;
  stateCode: string | null;
  currency: string;
  validUntil: string;
  lines: InvoiceLineInput[];
  discountMinor: bigint;
  createdAt: string;
};

export type ProposalStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined';

export type Signature = {
  name: string;
  email: string;
  /** ISO timestamp. */
  at: string;
  ip: string;
};

export type Proposal = {
  id: string;
  quoteId: string;
  title: string;
  /** The client's email: where the link and the signing code go. */
  email: string | null;
  status: ProposalStatus;
  blocks: ProposalBlock[];
  /** The unguessable part of the public link. */
  token: string;
  views: number;
  lastViewedAt: string | null;
  sentAt: string | null;
  validUntil: string;
  signature: Signature | null;
  declineReason: string | null;
  /** The signing code waiting to be entered, with when it stops working. */
  pendingCode: { code: string; expiresAt: string; tries: number } | null;
  activities: Activity[];
  createdAt: string;
};
