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
