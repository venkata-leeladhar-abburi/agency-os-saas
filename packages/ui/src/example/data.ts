/**
 * Example data for stories and the /prototype screens. Every name and amount here is
 * example data from the design reference; screens that show it carry the "Example data" badge.
 */
import { calculateInvoice, formatMoney } from '@agency-os/core';
import {
  BookOpenText,
  CheckSquareOffset,
  FolderSimple,
  FunnelSimple,
  GearSix,
  House,
  Question,
  Receipt,
  SquaresFour,
  UsersThree,
  UserCircle,
} from '@phosphor-icons/react';
import type { LeadCardData, PipelineColumn } from '../patterns/pipeline-board';
import type { SidebarGroup, SidebarItem } from '../patterns/sidebar';

export const PEOPLE = {
  owner: 'Kiran Rao',
  designer: 'Ananya Iyer',
  developer: 'Arjun Mehta',
  pm: 'Meera Pillai',
  client: 'Srinivas Beere',
  intlClient: 'Sarah Lewis',
};

export const WORKSPACE = { name: 'One Stop Solutions', plan: 'Agency · Growth', slug: 'one-stop' };

const ws = (path: string) => `/prototype/${WORKSPACE.slug}/${path}`;

export const OWNER_NAV: SidebarGroup[] = [
  {
    items: [
      { value: 'today', label: 'Today', icon: House, href: ws('today') },
      { value: 'dashboard', label: 'Dashboard', icon: SquaresFour, href: ws('dashboard') },
    ],
  },
  {
    label: 'Sell',
    items: [
      {
        value: 'leads',
        label: 'Leads',
        icon: FunnelSimple,
        href: ws('leads'),
        count: 12,
        alert: true,
      },
      { value: 'clients', label: 'Clients', icon: UsersThree, href: ws('clients') },
    ],
  },
  {
    label: 'Deliver',
    items: [
      { value: 'projects', label: 'Projects', icon: FolderSimple, href: ws('projects'), count: 9 },
      { value: 'tasks', label: 'Tasks', icon: CheckSquareOffset, href: ws('tasks') },
    ],
  },
  {
    label: 'Money',
    items: [
      { value: 'invoices', label: 'Invoices', icon: Receipt, href: ws('invoices'), count: 2 },
    ],
  },
  {
    label: 'Agency',
    items: [
      { value: 'team', label: 'Team', icon: UserCircle, href: ws('team') },
      { value: 'playbook', label: 'Playbook', icon: BookOpenText, href: ws('playbook') },
      { value: 'settings', label: 'Settings', icon: GearSix, href: ws('settings') },
    ],
  },
];

export const FOOTER_NAV: SidebarItem[] = [
  { value: 'help', label: 'Help', icon: Question, href: ws('help') },
];

const inr = (rupees: number) => formatMoney(BigInt(rupees) * 100n, 'INR', { decimals: 0 });
const lakh = (rupees: number) => formatMoney(BigInt(rupees) * 100n, 'INR', { compact: true });

const lead = (
  id: string,
  name: string,
  service: string,
  rupees: number,
  source: string,
  owner: string,
  due?: string,
  overdue?: boolean,
): LeadCardData => ({ id, name, service, value: inr(rupees), source, owner, due, overdue });

export const LEADS = {
  kite: lead('kite', 'Kite & Co', 'Website', 80_000, 'Instagram', PEOPLE.owner, 'Call today'),
  lumen: lead(
    'lumen',
    'Lumen Foods',
    'Brand + website',
    1_50_000,
    'Referral',
    PEOPLE.designer,
    'Follow up was due Mon',
    true,
  ),
  orbit: lead('orbit', 'Orbit Fitness', 'App', 45_000, 'Marketplace', PEOPLE.developer),
  mitra: lead(
    'mitra',
    'Mitra Clinic',
    'Booking app',
    60_000,
    'Website',
    PEOPLE.developer,
    'Thu, 11:30 am',
  ),
  tara: lead('tara', 'Tara Textiles', 'ERP', 1_10_000, 'IndiaMART', PEOPLE.owner),
  northwind: lead(
    'northwind',
    'Northwind',
    'Mobile app',
    2_40_000,
    'Marketplace',
    PEOPLE.owner,
    'Viewed 2 h ago',
  ),
  saffron: lead('saffron', 'Saffron Stays', 'Website', 90_000, 'Referral', PEOPLE.designer),
};

export const PIPELINE: PipelineColumn[] = [
  { id: 'new', name: 'New', total: lakh(2_75_000), cards: [LEADS.kite, LEADS.lumen, LEADS.orbit] },
  { id: 'contacted', name: 'Contacted', total: lakh(1_70_000), cards: [LEADS.mitra, LEADS.tara] },
  { id: 'proposal', name: 'Proposal', total: lakh(2_40_000), cards: [LEADS.northwind] },
  { id: 'won', name: 'Won', total: lakh(90_000), won: true, cards: [LEADS.saffron] },
];

/** The dashboard's smaller board: three stages, as in the reference screen. */
export const PIPELINE_SUMMARY: PipelineColumn[] = [
  { id: 'new', name: 'New', total: lakh(2_30_000), cards: [LEADS.kite, LEADS.lumen] },
  { id: 'proposal', name: 'Proposal', total: lakh(2_40_000), cards: [LEADS.northwind] },
  { id: 'won', name: 'Won', total: lakh(90_000), won: true, cards: [LEADS.saffron] },
];

export const METRICS = {
  revenue: {
    label: 'Revenue · October',
    value: inr(4_86_000),
    delta: 12,
    note: 'vs September',
    spark: [3, 4, 3.6, 5, 4.4, 5.6, 6.2],
  },
  pending: { label: 'Pending', value: inr(1_20_000), note: '6 invoices' },
  overdue: { label: 'Overdue', value: inr(38_500), delta: 8, note: '2 invoices · reminders on' },
  pipeline: { label: 'Pipeline value', value: lakh(12_40_000), note: 'Win rate 38%' },
};

export const TODAY = [
  { time: '10:00', title: 'Standup', meta: 'Google Meet' },
  { time: '11:30', title: 'Discovery call', meta: 'Kite & Co' },
  { time: '15:00', title: 'Design review', meta: 'Acme Labs' },
  { time: 'Due', title: 'INV OSS/26-27/014', meta: `Northwind · ${inr(29_500)}` },
  { time: 'Task', title: 'Follow up', meta: 'Lumen Foods' },
];

export const TEAM_LOAD = [
  { team: 'Design', load: 78 },
  { team: 'Frontend', load: 104 },
  { team: 'Backend', load: 62 },
  { team: 'QA', load: 40 },
];

export const AT_RISK = [
  {
    id: 'acme',
    client: 'Acme Labs',
    project: 'Website redesign',
    why: 'Design gate 2 days late',
    progress: 42,
    tone: 'default' as const,
  },
  {
    id: 'northwind',
    client: 'Northwind',
    project: 'Mobile app',
    why: 'Budget 92% used',
    progress: 92,
    tone: 'danger' as const,
  },
  {
    id: 'mitra',
    client: 'Mitra Clinic',
    project: 'Booking app',
    why: 'Waiting for content',
    progress: 30,
    tone: 'default' as const,
  },
];

/** Invoices from the worked tax cases (supplier in Andhra Pradesh, state 37). */
export const TAX_INVOICE = calculateInvoice({
  currency: 'INR',
  supplierStateCode: '37',
  placeOfSupply: { kind: 'india', stateCode: '37' },
  lines: [
    {
      description: 'Website design and build',
      sac: '998314',
      quantity: 1,
      rateMinor: 3_500_000n,
      taxRateBp: 1800,
    },
    {
      description: 'CMS setup and training',
      sac: '998314',
      quantity: 1,
      rateMinor: 500_000n,
      taxRateBp: 1800,
    },
  ],
});

export const EXPORT_INVOICE = calculateInvoice({
  currency: 'USD',
  supplierStateCode: '37',
  placeOfSupply: { kind: 'export', country: 'US' },
  hasValidLut: true,
  exchangeRateToInr: '84.20',
  lines: [
    {
      description: 'Design sprint (5 days)',
      sac: '998391',
      quantity: 1,
      rateMinor: 200_000n,
      taxRateBp: 1800,
    },
  ],
});

export const LUT_ARN = 'AD3609260012345';

/* ---------- Lists for the hi-fi prototype ---------- */

export type ExampleLeadRow = {
  id: string;
  name: string;
  contact: string;
  stage: 'New' | 'Contacted' | 'Proposal' | 'Won' | 'Lost';
  valueMinor: bigint;
  source: string;
  owner: string;
  followUp: string;
  overdue?: boolean;
};

export const LEAD_ROWS: ExampleLeadRow[] = [
  {
    id: 'kite',
    name: 'Kite & Co',
    contact: 'Kiran (founder)',
    stage: 'New',
    valueMinor: 8_000_000n,
    source: 'Instagram',
    owner: PEOPLE.owner,
    followUp: 'Today',
  },
  {
    id: 'lumen',
    name: 'Lumen Foods',
    contact: 'Priya, marketing',
    stage: 'New',
    valueMinor: 15_000_000n,
    source: 'Referral',
    owner: PEOPLE.designer,
    followUp: 'Mon (overdue)',
    overdue: true,
  },
  {
    id: 'orbit',
    name: 'Orbit Fitness',
    contact: 'Rahul',
    stage: 'New',
    valueMinor: 4_500_000n,
    source: 'Marketplace',
    owner: PEOPLE.developer,
    followUp: 'Wed',
  },
  {
    id: 'mitra',
    name: 'Mitra Clinic',
    contact: 'Dr. Lakshmi',
    stage: 'Contacted',
    valueMinor: 6_000_000n,
    source: 'Website',
    owner: PEOPLE.developer,
    followUp: 'Thu, 11:30 am',
  },
  {
    id: 'tara',
    name: 'Tara Textiles',
    contact: 'Venkat',
    stage: 'Contacted',
    valueMinor: 11_000_000n,
    source: 'IndiaMART',
    owner: PEOPLE.owner,
    followUp: 'Fri',
  },
  {
    id: 'northwind',
    name: 'Northwind',
    contact: PEOPLE.intlClient,
    stage: 'Proposal',
    valueMinor: 24_000_000n,
    source: 'Marketplace',
    owner: PEOPLE.owner,
    followUp: 'Fri',
  },
  {
    id: 'saffron',
    name: 'Saffron Stays',
    contact: 'Anil',
    stage: 'Won',
    valueMinor: 9_000_000n,
    source: 'Referral',
    owner: PEOPLE.designer,
    followUp: '—',
  },
];

export type ExampleClient = {
  id: string;
  name: string;
  contact: string;
  city: string;
  projects: number;
  billedMinor: bigint;
  outstandingMinor: bigint;
  currency: string;
  portal: 'Active' | 'Invited' | 'Not invited';
};

export const CLIENTS: ExampleClient[] = [
  {
    id: 'acme',
    name: 'Acme Labs',
    contact: PEOPLE.client,
    city: 'Vijayawada',
    projects: 2,
    billedMinor: 18_880_000n,
    outstandingMinor: 4_720_000n,
    currency: 'INR',
    portal: 'Active',
  },
  {
    id: 'northwind',
    name: 'Northwind',
    contact: PEOPLE.intlClient,
    city: 'London',
    projects: 1,
    billedMinor: 200_000n,
    outstandingMinor: 120_000n,
    currency: 'USD',
    portal: 'Active',
  },
  {
    id: 'saffron',
    name: 'Saffron Stays',
    contact: 'Anil',
    city: 'Goa',
    projects: 1,
    billedMinor: 4_500_000n,
    outstandingMinor: 0n,
    currency: 'INR',
    portal: 'Invited',
  },
  {
    id: 'mitra',
    name: 'Mitra Clinic',
    contact: 'Dr. Lakshmi',
    city: 'Hyderabad',
    projects: 1,
    billedMinor: 3_000_000n,
    outstandingMinor: 0n,
    currency: 'INR',
    portal: 'Active',
  },
  {
    id: 'kite',
    name: 'Kite & Co',
    contact: 'Kiran',
    city: 'Bengaluru',
    projects: 0,
    billedMinor: 0n,
    outstandingMinor: 0n,
    currency: 'INR',
    portal: 'Not invited',
  },
];

export type ExampleProject = {
  id: string;
  name: string;
  client: string;
  lead: string;
  phase: number;
  health: 'On track' | 'At risk' | 'Late';
  nextGate: string;
  due: string;
  progress: number;
};

export const PROJECTS: ExampleProject[] = [
  {
    id: 'acme-web',
    name: 'Website redesign',
    client: 'Acme Labs',
    lead: PEOPLE.designer,
    phase: 3,
    health: 'At risk',
    nextGate: 'Design sign-off · 2 days late',
    due: '20 Dec 2026',
    progress: 42,
  },
  {
    id: 'northwind-app',
    name: 'Mobile app',
    client: 'Northwind',
    lead: PEOPLE.developer,
    phase: 4,
    health: 'At risk',
    nextGate: 'Acceptance testing',
    due: '15 Jan 2027',
    progress: 68,
  },
  {
    id: 'mitra-booking',
    name: 'Booking app',
    client: 'Mitra Clinic',
    lead: PEOPLE.pm,
    phase: 2,
    health: 'On track',
    nextGate: 'Strategy and scope',
    due: '28 Feb 2027',
    progress: 30,
  },
  {
    id: 'saffron-web',
    name: 'Website',
    client: 'Saffron Stays',
    lead: PEOPLE.designer,
    phase: 1,
    health: 'On track',
    nextGate: 'Strategy and scope',
    due: '31 Jan 2027',
    progress: 12,
  },
  {
    id: 'beere-erp',
    name: 'Beere Kesava ERP',
    client: 'Acme Labs',
    lead: PEOPLE.designer,
    phase: 3,
    health: 'On track',
    nextGate: 'Dashboard design',
    due: '31 Mar 2027',
    progress: 45,
  },
];

export type ExampleTask = {
  id: string;
  title: string;
  project: string;
  assignee: string;
  due: string;
  priority: 'Low' | 'Normal' | 'High';
  status: 'To do' | 'In progress' | 'In review' | 'Done';
  overdue?: boolean;
};

export const TASKS: ExampleTask[] = [
  {
    id: 't1',
    title: 'Homepage hero copy',
    project: 'Acme Labs · Design',
    assignee: PEOPLE.designer,
    due: 'Fri 30 Oct',
    priority: 'High',
    status: 'In progress',
  },
  {
    id: 't2',
    title: 'Fix checkout bug',
    project: 'Northwind · Build',
    assignee: PEOPLE.developer,
    due: 'Today',
    priority: 'High',
    status: 'To do',
  },
  {
    id: 't3',
    title: 'QA on Android',
    project: 'Northwind · Build',
    assignee: PEOPLE.developer,
    due: 'Today',
    priority: 'Normal',
    status: 'To do',
  },
  {
    id: 't4',
    title: 'Prepare staging',
    project: 'Acme Labs · Build',
    assignee: PEOPLE.developer,
    due: 'Thu',
    priority: 'Normal',
    status: 'In review',
  },
  {
    id: 't5',
    title: 'Competitor analysis',
    project: 'Mitra Clinic · Discover',
    assignee: PEOPLE.pm,
    due: 'Wed (overdue)',
    priority: 'Normal',
    status: 'To do',
    overdue: true,
  },
  {
    id: 't6',
    title: 'Brand colours',
    project: 'Saffron Stays · Design',
    assignee: PEOPLE.designer,
    due: 'Mon',
    priority: 'Low',
    status: 'Done',
  },
  {
    id: 't7',
    title: 'Sitemap and scope',
    project: 'Mitra Clinic · Define',
    assignee: PEOPLE.pm,
    due: 'Next week',
    priority: 'Normal',
    status: 'In progress',
  },
  {
    id: 't8',
    title: 'Wireframes for key pages',
    project: 'Acme Labs · Design',
    assignee: PEOPLE.designer,
    due: 'Done 20 Oct',
    priority: 'Normal',
    status: 'Done',
  },
];

export type ExampleInvoice = {
  id: string;
  number: string;
  client: string;
  amount: string;
  issued: string;
  due: string;
  status: 'draft' | 'due' | 'overdue' | 'paid' | 'partially_paid';
  statusText: string;
};

export const INVOICES: ExampleInvoice[] = [
  {
    id: 'i14',
    number: 'OSS/26-27/014',
    client: 'Northwind',
    amount: '₹29,500.00',
    issued: '13 Oct',
    due: '20 Oct',
    status: 'overdue',
    statusText: '5 days overdue',
  },
  {
    id: 'i15',
    number: 'OSS/26-27/015',
    client: 'Acme Labs',
    amount: '₹47,200.00',
    issued: '26 Oct',
    due: '2 Nov',
    status: 'due',
    statusText: 'Due 2 Nov',
  },
  {
    id: 'i16',
    number: 'OSS/26-27/016',
    client: 'Northwind',
    amount: '$2,000.00',
    issued: '22 Oct',
    due: '5 Nov',
    status: 'partially_paid',
    statusText: '$1,200.00 due',
  },
  {
    id: 'i13',
    number: 'OSS/26-27/013',
    client: 'Saffron Stays',
    amount: '₹45,000.00',
    issued: '1 Oct',
    due: '8 Oct',
    status: 'paid',
    statusText: 'Paid',
  },
  {
    id: 'i12',
    number: 'OSS/26-27/012',
    client: 'Acme Labs',
    amount: '₹47,200.00',
    issued: '15 Sep',
    due: '22 Sep',
    status: 'paid',
    statusText: 'Paid',
  },
  {
    id: 'draft',
    number: 'Draft',
    client: 'Mitra Clinic',
    amount: '₹30,000.00',
    issued: '—',
    due: '—',
    status: 'draft',
    statusText: 'Draft',
  },
];

export const MEMBERS = [
  { name: PEOPLE.owner, email: 'kiran@onestop.in', role: 'Owner', projects: 5, openTasks: 3 },
  {
    name: PEOPLE.designer,
    email: 'ananya@onestop.in',
    role: 'Project lead',
    projects: 3,
    openTasks: 6,
  },
  { name: PEOPLE.developer, email: 'arjun@onestop.in', role: 'Member', projects: 2, openTasks: 8 },
  { name: PEOPLE.pm, email: 'meera@onestop.in', role: 'Finance', projects: 1, openTasks: 2 },
];
