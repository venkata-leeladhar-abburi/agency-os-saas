// Server only. The example workspace, kept in memory so the screens and forms can be used
// end to end before the database is reachable. Every name and amount is example data from the
// design reference; the screens show the "Example data" badge. Restarting the server resets it.
import { SEVEN_PHASES, standardProposal } from '@agency-os/core';
import type { KnowledgeFolder, KnowledgeItem } from './knowledge-types';
import { NOTIFICATION_CATEGORIES } from './types';
import type {
  AuditEntry,
  Client,
  DailyUpdate,
  Invitation,
  Invoice,
  Lead,
  Member,
  Message,
  Notification,
  Project,
  Proposal,
  Quote,
  Task,
  WorkspaceSettings,
} from './types';

export type ExampleStore = {
  settings: WorkspaceSettings;
  leads: Lead[];
  clients: Client[];
  projects: Project[];
  invoices: Invoice[];
  /** Last invoice sequence used this financial year. */
  invoiceSequence: number;
  tasks: Task[];
  quotes: Quote[];
  proposals: Proposal[];
  /** Last quote sequence used this financial year. */
  quoteSequence: number;
  notifications: Notification[];
  messages: Message[];
  members: Member[];
  invitations: Invitation[];
  dailyUpdates: DailyUpdate[];
  audit: AuditEntry[];
  /** Saved views on the leads page (example mode has one person). */
  savedViews: { id: string; name: string; query: string }[];
  /** The signed-in person's own profile (example mode has one person). */
  profile: { name: string; phone: string | null };
  /** The knowledge base: folders (counts are worked out) and items (authors by name). */
  knowledgeFolders: Omit<KnowledgeFolder, 'items'>[];
  knowledgeItems: Omit<KnowledgeItem, 'canEdit' | 'clientCount'>[];
};

const OWNER = 'Kiran Rao';
const DESIGNER = 'Ananya Iyer';
const DEVELOPER = 'Arjun Mehta';
const PM = 'Meera Pillai';

const day = 24 * 60 * 60 * 1000;
const IST_OFFSET = 5.5 * 60 * 60 * 1000;
/** Today's calendar date in IST, as UTC midnight of that date (the screens count days in IST). */
const istMidnight = () => {
  const d = new Date(Date.now() + IST_OFFSET);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};
/** hh:00 IST, offsetDays from today in IST. */
const iso = (offsetDays: number, hour = 11) =>
  new Date(istMidnight() + offsetDays * day + hour * 60 * 60 * 1000 - IST_OFFSET).toISOString();
/**
 * Something that happened today at hh:00 IST, or minutesAgo ago if that hour hasn't come yet
 * (just after midnight), so example history is never in the future.
 */
const todayAt = (hour: number, minutesAgo: number) => {
  const at = iso(0, hour);
  return Date.parse(at) <= Date.now()
    ? at
    : new Date(Date.now() - minutesAgo * 60_000).toISOString();
};
/** The IST calendar date offsetDays from today. */
const date = (offsetDays: number) =>
  new Date(istMidnight() + offsetDays * day).toISOString().slice(0, 10);
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
      portalVisitedAt: iso(-50),
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
      portalVisitedAt: null,
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
      portalVisitedAt: null,
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
      portalVisitedAt: iso(-20),
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
        title: 'Homepage design',
        status: 'waiting',
        approver: 'Srinivas Beere',
        sentAt: iso(-2),
      },
      gateHistory: [
        {
          title: 'Sitemap and scope',
          phase: 'Define',
          decision: 'approved',
          by: 'Srinivas Beere',
          comment: null,
          at: iso(-12, 16),
        },
      ],
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
      gateHistory: [],
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
      gateHistory: [],
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
      gateHistory: [],
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
      reminders: true,
      remindersSent: [
        { on: date(-9), sentAt: iso(-9, 9) },
        { on: date(-6), sentAt: iso(-6, 9) },
        { on: date(-3), sentAt: iso(-3, 9) },
      ],
      payToken: 'example-pay-14-K7d2Qx',
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
      reminders: true,
      remindersSent: [],
      payToken: 'example-pay-15-K7d2Qx',
      createdAt: todayAt(11, 30),
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
      reminders: true,
      remindersSent: [],
      payToken: 'example-pay-16-K7d2Qx',
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
      reminders: true,
      remindersSent: [{ on: date(-21), sentAt: iso(-21, 9) }],
      payToken: 'example-pay-13-K7d2Qx',
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
      reminders: true,
      remindersSent: [],
      payToken: 'example-pay-draft-K7d2Qx',
      createdAt: iso(-1),
    },
  ];

  const task = (
    id: string,
    title: string,
    projectId: string,
    phase: string,
    assignee: string,
    dueDays: number | null,
    priority: Task['priority'],
    status: Task['status'],
    extra: Partial<Task> = {},
  ): Task => ({
    id,
    title,
    projectId,
    phase,
    assignee,
    dueOn: dueDays === null ? null : date(dueDays),
    priority,
    status,
    description: '',
    subtasks: [],
    comments: [],
    createdAt: iso(-7),
    ...extra,
  });

  const tasks: Task[] = [
    task('t1', 'Homepage hero copy', 'acme-web', 'Design', DESIGNER, 4, 'high', 'in_progress', {
      description: 'Two options for the headline, one in Telugu.',
      subtasks: [
        { id: 's1', title: 'Draft English headline', done: true },
        { id: 's2', title: 'Telugu translation', done: false },
      ],
      comments: [
        {
          id: 'c1',
          who: OWNER,
          text: '@Ananya Iyer can we keep it under 8 words?',
          at: iso(-1, 16),
        },
        { id: 'c2', who: DESIGNER, text: 'Yes, both options are 7 words.', at: todayAt(9, 60) },
      ],
    }),
    task('t2', 'Fix checkout bug', 'northwind-app', 'Build', DEVELOPER, 0, 'high', 'todo'),
    task('t3', 'QA on Android', 'northwind-app', 'Build', DEVELOPER, 0, 'normal', 'todo'),
    task('t4', 'Prepare staging', 'acme-web', 'Build', DEVELOPER, 3, 'normal', 'in_review'),
    task('t5', 'Competitor analysis', 'mitra-booking', 'Discover', PM, -2, 'normal', 'todo'),
    task('t6', 'Brand colours', 'saffron-web', 'Design', DESIGNER, -1, 'low', 'done'),
    task('t7', 'Sitemap and scope', 'mitra-booking', 'Define', PM, 8, 'normal', 'in_progress'),
    task('t8', 'Wireframes for key pages', 'acme-web', 'Design', DESIGNER, -6, 'normal', 'done'),
  ];

  const quotes: Quote[] = [
    {
      id: 'q-northwind',
      number: 'OSS/Q26-27/004',
      leadId: 'northwind-lead',
      clientId: 'northwind',
      recipient: 'Northwind',
      country: 'GB',
      stateCode: null,
      currency: 'USD',
      validUntil: date(10),
      lines: [
        {
          description: 'Mobile app, phase one',
          sac: '998314',
          quantity: '1',
          rateMinor: 240_000n,
          taxRateBp: 1800,
        },
        {
          description: 'Design system',
          sac: '998314',
          quantity: '1',
          rateMinor: 60_000n,
          taxRateBp: 1800,
        },
      ],
      discountMinor: 0n,
      createdAt: iso(-5),
    },
  ];

  const blocks = standardProposal({
    clientName: 'Northwind',
    date: date(-4),
    preparedBy: OWNER,
    quoteId: 'q-northwind',
    scope: ['Mobile app, phase one', 'Design system'],
    phases: SEVEN_PHASES.phases.map((p) => ({ name: p.name, clientSignOff: Boolean(p.gate) })),
  });

  const proposals: Proposal[] = [
    {
      id: 'p-northwind',
      quoteId: 'q-northwind',
      title: 'Proposal for Northwind',
      email: 'sarah@northwind.example',
      status: 'viewed',
      blocks,
      token: 'example-northwind-7Hq2xP9',
      views: 3,
      lastViewedAt: todayAt(8, 90),
      sentAt: iso(-4),
      validUntil: date(10),
      signature: null,
      declineReason: null,
      pendingCode: null,
      activities: [
        {
          id: 'pa2',
          kind: 'viewed',
          who: 'Northwind',
          text: 'viewed the proposal',
          at: todayAt(8, 90),
        },
        { id: 'pa1', kind: 'sent', who: OWNER, text: 'sent the proposal', at: iso(-4) },
      ],
      createdAt: iso(-5),
    },
  ];

  const notifications: Notification[] = [
    {
      id: 'n1',
      category: 'proposal_viewed',
      title: 'Northwind viewed your proposal',
      detail: 'Opened 3 times',
      href: '/sales/proposals/p-northwind',
      at: todayAt(8, 90),
      read: false,
    },
    {
      id: 'n2',
      category: 'message',
      title: 'Srinivas Beere sent a message',
      detail: 'Acme Labs · Website redesign',
      href: '/projects/acme-web',
      at: iso(-1, 18),
      read: false,
    },
    {
      id: 'n3',
      category: 'payment_received',
      title: 'Payment received: ₹44,999.30 for OSS/26-27/013',
      detail: 'Saffron Stays · UPI',
      href: '/invoices/inv-13',
      at: iso(-20, 15),
      read: true,
    },
    {
      id: 'n4',
      category: 'gate_decided',
      title: 'Srinivas Beere approved: Sitemap and scope',
      detail: 'Acme Labs · Website redesign',
      href: '/projects/acme-web',
      at: iso(-12, 16),
      read: true,
    },
  ];

  const messages: Message[] = [
    {
      id: 'm1',
      projectId: 'acme-web',
      who: DESIGNER,
      fromClient: false,
      text: 'Hi Srinivas, the homepage designs are ready for you to look at. Desktop and phone versions are attached to the approval.',
      at: iso(-2, 10),
    },
    {
      id: 'm2',
      projectId: 'acme-web',
      who: 'Srinivas Beere',
      fromClient: true,
      text: 'Looks good. Can the headline be in Telugu as well?',
      at: iso(-1, 18),
    },
  ];

  const members: Member[] = [
    {
      id: 'u-kiran',
      name: OWNER,
      email: 'kiran@onestop.example',
      role: 'owner',
      title: 'Founder',
      joinedAt: iso(-200),
    },
    {
      id: 'u-ananya',
      name: DESIGNER,
      email: 'ananya@onestop.example',
      role: 'project_lead',
      title: 'Designer',
      joinedAt: iso(-150),
    },
    {
      id: 'u-arjun',
      name: DEVELOPER,
      email: 'arjun@onestop.example',
      role: 'member',
      title: 'Developer',
      joinedAt: iso(-120),
    },
    {
      id: 'u-meera',
      name: PM,
      email: 'meera@onestop.example',
      role: 'finance',
      title: 'Accounts',
      joinedAt: iso(-90),
    },
  ];

  const invitations: Invitation[] = [
    {
      id: 'inv-rahul',
      email: 'rahul@onestop.example',
      role: 'member',
      token: 'example-invite-rahul-Qm3x8',
      invitedBy: OWNER,
      createdAt: iso(-2),
      expiresAt: iso(5),
      revokedAt: null,
      acceptedAt: null,
    },
  ];

  const dailyUpdates: DailyUpdate[] = [
    {
      id: 'd1',
      member: DESIGNER,
      on: date(0),
      done: 'Homepage hero, both options',
      next: 'Mobile layouts for Acme Labs',
      blockers: '',
      at: todayAt(10, 45),
    },
    {
      id: 'd2',
      member: DEVELOPER,
      on: date(0),
      done: 'Checkout API fix',
      next: 'QA on Android',
      blockers: 'Waiting for Northwind’s payment keys',
      at: todayAt(10, 45),
    },
  ];

  const audit: AuditEntry[] = [
    {
      id: 'au2',
      at: iso(-2),
      actor: OWNER,
      action: 'member.invited',
      subject: 'rahul@onestop.example',
      detail: 'As Member',
      ip: '203.0.113.24',
    },
    {
      id: 'au1',
      at: iso(-13),
      actor: PM,
      action: 'invoice.issued',
      subject: 'OSS/26-27/014',
      detail: 'Acme Labs · ₹29,500.00',
      ip: '203.0.113.31',
    },
  ];

  const knowledgeFolders: ExampleStore['knowledgeFolders'] = [
    {
      id: 'kb-onboarding',
      parentId: null,
      name: 'Client onboarding',
      description: 'From signed proposal to kickoff.',
    },
    { id: 'kb-kickoff', parentId: 'kb-onboarding', name: 'Kickoff', description: null },
    {
      id: 'kb-delivery',
      parentId: null,
      name: 'Delivery process',
      description: 'How we design, build, test and launch.',
    },
    {
      id: 'kb-prompts',
      parentId: null,
      name: 'Prompts and AI',
      description: 'Prompts that work, and how we use them.',
    },
    {
      id: 'kb-design',
      parentId: null,
      name: 'Design system',
      description: 'Components, tools and references.',
    },
    {
      id: 'kb-guides',
      parentId: null,
      name: 'Client guides',
      description: 'Shared with clients in their portal.',
    },
  ];
  const kb = (
    item: Pick<KnowledgeItem, 'id' | 'folderId' | 'kind' | 'title'> &
      Partial<Omit<KnowledgeItem, 'canEdit' | 'clientCount'>>,
  ): Omit<KnowledgeItem, 'canEdit' | 'clientCount'> => ({
    summary: null,
    body: '',
    url: null,
    tags: [],
    visibility: 'team',
    roles: [],
    allClients: false,
    clientIds: [],
    status: 'published',
    updatedAt: iso(-3),
    updatedBy: OWNER,
    createdBy: OWNER,
    ...item,
  });
  const knowledgeItems: ExampleStore['knowledgeItems'] = [
    kb({
      id: 'kb-kickoff-checklist',
      folderId: 'kb-kickoff',
      kind: 'checklist',
      title: 'Kickoff call checklist',
      summary: 'Everything to cover in the first call after the proposal is signed.',
      body: '## Before the call\n\n- [x] Send the intake questionnaire\n- [x] Share the calendar invite with the agenda\n- [ ] Set up the project from the seven-phase template\n\n## On the call\n\n1. Introduce the team and who to contact for what\n2. Walk through the phases and sign-offs\n3. Agree how feedback is given (see **How to give feedback**)\n4. Confirm the first deadline\n\n> Send the recap within 24 hours.',
      tags: ['onboarding', 'calls'],
      updatedAt: todayAt(10, 40),
      updatedBy: PM,
      createdBy: PM,
    }),
    kb({
      id: 'kb-discovery',
      folderId: 'kb-onboarding',
      kind: 'process',
      title: 'How we run a discovery call',
      summary: 'Questions to ask, and what to write down, before we quote.',
      body: "## Goal\n\nUnderstand the problem well enough to quote with confidence.\n\n## Questions\n\n- What does success look like in six months?\n- Who decides, and who signs?\n- What has been tried before?\n- What is the budget range and the deadline?\n\n## After the call\n\nWrite the recap in the lead's notes and set a follow-up.",
      tags: ['sales', 'calls'],
      updatedAt: iso(-6),
    }),
    kb({
      id: 'kb-launch-qa',
      folderId: 'kb-delivery',
      kind: 'checklist',
      title: 'Website launch QA',
      summary: 'Run before every launch.',
      body: '- [ ] Every page works on a phone and a laptop\n- [ ] Forms send to the right inbox\n- [ ] Page titles and descriptions are set\n- [ ] Analytics is recording\n- [ ] Redirects from the old site work\n- [ ] The client has signed off the content',
      tags: ['qa', 'launch'],
      roles: ['owner', 'admin', 'project_lead', 'member'],
      updatedAt: iso(-2),
      updatedBy: DEVELOPER,
      createdBy: DEVELOPER,
    }),
    kb({
      id: 'kb-status-update',
      folderId: 'kb-delivery',
      kind: 'template',
      title: 'Weekly status update',
      summary: 'What we send clients every Friday.',
      body: 'Hi {client},\n\n**Done this week:** …\n\n**Next week:** …\n\n**Needs you:** …\n\nThe project is on track for {deadline}.',
      tags: ['clients', 'writing'],
      updatedAt: iso(-9),
      updatedBy: PM,
      createdBy: PM,
    }),
    kb({
      id: 'kb-retro',
      folderId: 'kb-delivery',
      kind: 'learning',
      title: 'Learnings from the Acme Labs redesign',
      summary: 'Share designs earlier; agree content owners on day one.',
      body: '## What went well\n\n- Weekly demos kept sign-offs quick\n\n## What we will change\n\n- Share rough designs in week one, not week three\n- Name one content owner on the client side at kickoff',
      tags: ['retro'],
      updatedAt: iso(-14),
    }),
    kb({
      id: 'kb-proposal-prompt',
      folderId: 'kb-prompts',
      kind: 'prompt',
      title: 'Proposal first draft',
      summary: 'Turns discovery notes into a first draft of the scope.',
      body: 'You are writing the scope section of a proposal for a {service} project.\n\nUse these discovery notes:\n\n```\n{notes}\n```\n\nWrite the goals, what is in scope, what is out of scope and the timeline in plain English. Keep it under 400 words.',
      tags: ['ai', 'proposals'],
      updatedAt: iso(-1),
      updatedBy: OWNER,
    }),
    kb({
      id: 'kb-followup-prompt',
      folderId: 'kb-prompts',
      kind: 'prompt',
      title: 'Follow-up email after a quiet week',
      summary: 'My draft, not shared yet.',
      body: 'Write a short, friendly follow-up to {name} about the proposal we sent on {date}.',
      tags: ['ai', 'sales'],
      visibility: 'private',
      status: 'draft',
      updatedAt: todayAt(9, 120),
    }),
    kb({
      id: 'kb-figma',
      folderId: 'kb-design',
      kind: 'tool',
      title: 'Figma',
      summary: 'Where every design lives. Ask Ananya for access.',
      url: 'https://www.figma.com',
      tags: ['design', 'tools'],
      updatedAt: iso(-20),
      updatedBy: DESIGNER,
      createdBy: DESIGNER,
    }),
    kb({
      id: 'kb-pricing-block',
      folderId: 'kb-design',
      kind: 'component',
      title: 'Pricing table block',
      summary: 'The three-column pricing table we reuse on landing pages.',
      body: '## When to use it\n\nLanding pages with up to three plans.\n\n## Rules\n\n- Highlight one plan only\n- Prices include GST, and say so',
      tags: ['design', 'components'],
      updatedAt: iso(-11),
      updatedBy: DESIGNER,
      createdBy: DESIGNER,
    }),
    kb({
      id: 'kb-inspiration',
      folderId: 'kb-design',
      kind: 'website',
      title: 'Landing page references',
      summary: 'Sites we point clients to for direction.',
      url: 'https://www.example.com/references',
      tags: ['design', 'inspiration'],
      updatedAt: iso(-25),
      updatedBy: DESIGNER,
      createdBy: DESIGNER,
    }),
    kb({
      id: 'kb-feedback-guide',
      folderId: 'kb-guides',
      kind: 'process',
      title: 'How to give feedback on designs',
      summary: 'One round, one list, in your portal.',
      body: '## How it works\n\n1. Open the design from your portal\n2. Write all your comments in one message\n3. Tell us which ones are must-haves\n\nWe reply within one working day. If something blocks you, message us in the portal.',
      tags: ['clients'],
      visibility: 'clients',
      allClients: true,
      updatedAt: iso(-4),
      updatedBy: PM,
      createdBy: PM,
    }),
    kb({
      id: 'kb-acme-login',
      folderId: 'kb-guides',
      kind: 'process',
      title: 'Logging in to your website',
      summary: 'Where to sign in and how to edit your pages.',
      body: "## Signing in\n\nGo to your site's admin page and sign in with the email we set up for you.\n\n## Editing a page\n\n- Open **Pages**\n- Choose the page\n- Press **Publish** when you are done",
      tags: ['clients', 'handoff'],
      visibility: 'clients',
      clientIds: ['acme'],
      updatedAt: iso(-1, 15),
      updatedBy: DEVELOPER,
      createdBy: DEVELOPER,
    }),
    kb({
      id: 'kb-sprint-board',
      folderId: 'kb-delivery',
      kind: 'board',
      title: 'Sprint planning board',
      summary: 'The board we copy for each two-week sprint.',
      url: 'https://www.example.com/boards/sprint',
      tags: ['planning'],
      roles: ['owner', 'admin', 'project_lead'],
      updatedAt: iso(-8),
      updatedBy: PM,
      createdBy: PM,
    }),
  ];

  const store: ExampleStore = {
    settings: {
      name: 'One Stop Solutions',
      gstin: '37ABCDE1234F1ZZ',
      stateCode: '37',
      lutArn: 'AD3609260012345',
      invoicePrefix: 'OSS',
      paymentTermsDays: 7,
      services: ['Website', 'Brand identity', 'UI/UX design', 'Mobile app'],
      notificationPrefs: Object.fromEntries(
        NOTIFICATION_CATEGORIES.map((c) => [c.id, { inApp: c.inApp, email: c.email }]),
      ) as WorkspaceSettings['notificationPrefs'],
      onboardingDismissed: false,
      plan: 'growth',
      address: '4th floor, Siripuram Junction, Visakhapatnam, Andhra Pradesh 530003',
      bank: {
        accountName: 'One Stop Solutions',
        accountNumber: '123456789012',
        ifsc: 'ABCD0123456',
        swift: null,
      },
      invoiceFooter: 'Thank you for your business.',
      brandColour: null,
      logo: null,
    },
    leads,
    clients,
    projects,
    invoices,
    invoiceSequence: 16,
    tasks,
    quotes,
    proposals,
    quoteSequence: 4,
    notifications,
    messages,
    members,
    invitations,
    dailyUpdates,
    audit,
    savedViews: [],
    profile: { name: OWNER, phone: null },
    knowledgeFolders,
    knowledgeItems,
  };
  for (const list of EXAMPLE_LISTS) for (const record of store[list]) record.example = true;
  return store;
}

/** The record lists that hold example data. */
export const EXAMPLE_LISTS = [
  'leads',
  'clients',
  'projects',
  'invoices',
  'tasks',
  'quotes',
  'proposals',
  'notifications',
  'messages',
  'knowledgeFolders',
  'knowledgeItems',
] as const;

/** A fresh copy of the example records, for "Load example data". */
export function exampleRecords(): Pick<ExampleStore, (typeof EXAMPLE_LISTS)[number]> {
  const fresh = seed();
  return Object.fromEntries(EXAMPLE_LISTS.map((l) => [l, fresh[l]])) as Pick<
    ExampleStore,
    (typeof EXAMPLE_LISTS)[number]
  >;
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
