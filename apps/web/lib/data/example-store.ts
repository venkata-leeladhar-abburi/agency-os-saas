// Server only. The example workspace, kept in memory so the screens and forms can be used
// end to end before the database is reachable. Every name and amount is example data from the
// design reference; the screens show the "Example data" badge. Restarting the server resets it.
import type { Client, Invoice, Lead, Project, WorkspaceSettings } from './types';

export type ExampleStore = {
  settings: WorkspaceSettings;
  leads: Lead[];
  clients: Client[];
  projects: Project[];
  invoices: Invoice[];
  /** Last invoice sequence used this financial year. */
  invoiceSequence: number;
};

const OWNER = 'Kiran Rao';
const DESIGNER = 'Ananya Iyer';
const DEVELOPER = 'Arjun Mehta';
const PM = 'Meera Pillai';

const day = 24 * 60 * 60 * 1000;
const iso = (offsetDays: number, hour = 11) => {
  const d = new Date(Date.now() + offsetDays * day);
  d.setUTCHours(hour - 5, 30, 0, 0); // hh:00 IST
  return d.toISOString();
};
const date = (offsetDays: number) => iso(offsetDays).slice(0, 10);
const rupees = (n: number) => BigInt(n) * 100n;

function lead(
  id: string,
  name: string,
  company: string | null,
  stage: Lead['stage'],
  value: number,
  source: Lead['source'],
  service: string,
  owner: string,
  followUpDays: number | null,
  extra: Partial<Lead> = {},
): Lead {
  return {
    id,
    name,
    company,
    email: `${name.split(' ')[0]!.toLowerCase()}@${(company ?? name).toLowerCase().replace(/[^a-z]+/g, '')}.example`,
    phone: null,
    stage,
    valueMinor: rupees(value),
    source,
    service,
    owner,
    followUpAt: followUpDays === null ? null : iso(followUpDays),
    notes: '',
    lostReason: null,
    clientId: null,
    createdAt: iso(-12),
    activities: [
      { id: `${id}-a1`, kind: 'created', who: owner, text: 'added the lead', at: iso(-12, 10) },
    ],
    ...extra,
  };
}

function seed(): ExampleStore {
  const clients: Client[] = [
    {
      id: 'acme',
      name: 'Acme Labs',
      contactName: 'Srinivas Beere',
      email: 'srinivas@acmelabs.example',
      phone: '+91 98450 12345',
      city: 'Bengaluru',
      country: 'IN',
      currency: 'INR',
      gstin: '29ABCDE1234F1ZW',
      stateCode: '29',
      notes: 'Wants the site live before the Diwali sale.',
      portal: 'active',
      createdAt: iso(-60),
      activities: [],
    },
    {
      id: 'northwind',
      name: 'Northwind',
      contactName: 'Sarah Lewis',
      email: 'sarah@northwind.example',
      phone: '+44 20 7946 0958',
      city: 'London',
      country: 'GB',
      currency: 'USD',
      gstin: null,
      stateCode: null,
      notes: '',
      portal: 'invited',
      createdAt: iso(-40),
      activities: [],
    },
    {
      id: 'mitra',
      name: 'Mitra Clinic',
      contactName: 'Dr Rao',
      email: 'hello@mitraclinic.example',
      phone: '+91 90000 11111',
      city: 'Visakhapatnam',
      country: 'IN',
      currency: 'INR',
      gstin: null,
      stateCode: '37',
      notes: '',
      portal: 'not_invited',
      createdAt: iso(-30),
      activities: [],
    },
    {
      id: 'saffron',
      name: 'Saffron Stays',
      contactName: 'Priya Menon',
      email: 'priya@saffronstays.example',
      phone: null,
      city: 'Kochi',
      country: 'IN',
      currency: 'INR',
      gstin: '32AAACS1234K1ZQ',
      stateCode: '32',
      notes: '',
      portal: 'active',
      createdAt: iso(-25),
      activities: [],
    },
  ];

  const leads: Lead[] = [
    lead('kite', 'Kiran Kumar', 'Kite & Co', 'new', 80_000, 'instagram', 'Website', OWNER, 0),
    lead(
      'lumen',
      'Lakshmi Iyer',
      'Lumen Foods',
      'new',
      1_50_000,
      'referral',
      'Brand identity',
      DESIGNER,
      -2,
    ),
    lead(
      'orbit',
      'Omar Shaikh',
      'Orbit Fitness',
      'new',
      45_000,
      'marketplace',
      'Mobile app',
      DEVELOPER,
      null,
    ),
    lead(
      'mitra-lead',
      'Dr Rao',
      'Mitra Clinic',
      'contacted',
      60_000,
      'website',
      'Web app or SaaS',
      DEVELOPER,
      3,
    ),
    lead(
      'tara',
      'Tarun Shah',
      'Tara Textiles',
      'contacted',
      1_10_000,
      'indiamart',
      'ERP or internal tool',
      OWNER,
      null,
    ),
    lead(
      'northwind-lead',
      'Sarah Lewis',
      'Northwind',
      'proposal',
      2_40_000,
      'marketplace',
      'Mobile app',
      OWNER,
      4,
      {
        phone: '+44 20 7946 0958',
        notes: 'Wants a fixed price for phase one.',
      },
    ),
    lead(
      'saffron-lead',
      'Priya Menon',
      'Saffron Stays',
      'won',
      90_000,
      'referral',
      'Website',
      DESIGNER,
      null,
      {
        clientId: 'saffron',
      },
    ),
  ];

  const projects: Project[] = [
    {
      id: 'acme-web',
      name: 'Website redesign',
      clientId: 'acme',
      lead: DESIGNER,
      template: 'seven_phases',
      phase: 3,
      budgetMinor: rupees(80_000),
      usedMinor: rupees(49_600),
      startOn: date(-30),
      dueOn: date(55),
      gate: {
        title: 'Approve the homepage design',
        status: 'waiting',
        approver: 'Srinivas Beere',
        sentAt: iso(-2),
      },
      activities: [],
      createdAt: iso(-30),
    },
    {
      id: 'northwind-app',
      name: 'Mobile app',
      clientId: 'northwind',
      lead: DEVELOPER,
      template: 'seven_phases',
      phase: 4,
      budgetMinor: rupees(2_40_000),
      usedMinor: rupees(2_20_800),
      startOn: date(-45),
      dueOn: date(80),
      gate: null,
      activities: [],
      createdAt: iso(-45),
    },
    {
      id: 'mitra-booking',
      name: 'Booking app',
      clientId: 'mitra',
      lead: PM,
      template: 'seven_phases',
      phase: 2,
      budgetMinor: rupees(60_000),
      usedMinor: rupees(12_000),
      startOn: date(-10),
      dueOn: date(120),
      gate: null,
      activities: [],
      createdAt: iso(-10),
    },
    {
      id: 'saffron-web',
      name: 'Website',
      clientId: 'saffron',
      lead: DESIGNER,
      template: 'seven_phases',
      phase: 1,
      budgetMinor: rupees(90_000),
      usedMinor: rupees(9_000),
      startOn: date(-5),
      dueOn: date(95),
      gate: null,
      activities: [],
      createdAt: iso(-5),
    },
  ];

  const web = (description: string, rate: number, quantity = 1) => ({
    description,
    sac: '998314',
    quantity,
    rateMinor: rupees(rate),
    taxRateBp: 1800,
  });

  const invoices: Invoice[] = [
    {
      id: 'inv-14',
      number: 'OSS/26-27/014',
      clientId: 'acme',
      currency: 'INR',
      issuedOn: date(-13),
      dueOn: date(-6),
      lines: [web('Design phase, milestone 1', 25_000)],
      exchangeRate: null,
      payments: [],
      createdAt: iso(-13),
    },
    {
      id: 'inv-15',
      number: 'OSS/26-27/015',
      clientId: 'acme',
      currency: 'INR',
      issuedOn: date(0),
      dueOn: date(7),
      lines: [web('Website, 5 pages', 30_000), web('Copywriting', 2_000, 5)],
      exchangeRate: null,
      payments: [],
      createdAt: iso(0),
    },
    {
      id: 'inv-16',
      number: 'OSS/26-27/016',
      clientId: 'northwind',
      currency: 'USD',
      issuedOn: date(-4),
      dueOn: date(10),
      lines: [
        {
          description: 'App design sprint',
          sac: '998314',
          quantity: 1,
          rateMinor: 200_000n,
          taxRateBp: 1800,
        },
      ],
      exchangeRate: '84.20',
      payments: [
        { id: 'p1', amountMinor: 80_000n, receivedOn: date(-2), method: 'wise', reference: null },
      ],
      createdAt: iso(-4),
    },
    {
      id: 'inv-13',
      number: 'OSS/26-27/013',
      clientId: 'saffron',
      currency: 'INR',
      issuedOn: date(-25),
      dueOn: date(-18),
      lines: [web('Discovery workshop', 38_135)],
      exchangeRate: null,
      payments: [
        {
          id: 'p2',
          amountMinor: 4_499_930n,
          receivedOn: date(-20),
          method: 'upi',
          reference: 'UPI 6021',
        },
      ],
      createdAt: iso(-25),
    },
    {
      id: 'inv-draft',
      number: null,
      clientId: 'mitra',
      currency: 'INR',
      issuedOn: null,
      dueOn: date(14),
      lines: [web('Booking app, discovery', 30_000)],
      exchangeRate: null,
      payments: [],
      createdAt: iso(-1),
    },
  ];

  return {
    settings: {
      name: 'One Stop Solutions',
      gstin: '37ABCDE1234F1ZZ',
      stateCode: '37',
      lutArn: 'AD3609260012345',
      invoicePrefix: 'OSS',
      paymentTermsDays: 7,
    },
    leads,
    clients,
    projects,
    invoices,
    invoiceSequence: 16,
  };
}

const globalStore = globalThis as unknown as { __agencyOsExample?: ExampleStore };

/** The one example store for this server process (kept across dev reloads). */
export function exampleStore(): ExampleStore {
  globalStore.__agencyOsExample ??= seed();
  return globalStore.__agencyOsExample;
}

/** For tests: start again from the seed. */
export function resetExampleStore(): ExampleStore {
  globalStore.__agencyOsExample = seed();
  return globalStore.__agencyOsExample;
}
