/** Phase templates and project progress (defaults-and-content.md §1). */
export type TemplateGate = { title: string; approver: 'client' | 'internal' };
export type TemplatePhase = {
  name: string;
  /** What the portal shows the client. */
  clientLine: string;
  /** Internal checklist; never shown to clients. */
  checklist: string[];
  deliverables: string[];
  gate: TemplateGate | null;
};
export type PhaseTemplate = { key: string; name: string; phases: TemplatePhase[] };

export const SEVEN_PHASES: PhaseTemplate = {
  key: 'seven_phases',
  name: 'Seven phases',
  phases: [
    {
      name: 'Connect',
      clientLine: 'We learn your business and agree the plan.',
      checklist: [
        'Research the lead (site, socials, reviews, 3 competitors)',
        'Send the questionnaire before the call',
        'Run the discovery call and take notes',
        'Send the recap within 24 hours',
        'Draft the proposal (problem, goals, scope, timeline, price)',
        'Walk the client through it',
        'Book the kickoff',
      ],
      deliverables: ['Call recap', 'Proposal'],
      gate: { title: 'Proposal accepted', approver: 'client' },
    },
    {
      name: 'Discover',
      clientLine: 'We study your market, competitors and customers.',
      checklist: [
        'Kickoff: goals, metrics, people, limits',
        'Collect access (analytics, hosting, domain, socials)',
        'Desk research',
        'Competitor analysis',
        'Interview 3 to 5 customers',
        'UX audit if a product exists',
        'Summarise insights',
      ],
      deliverables: ['Competitor analysis', 'Customer insights', 'UX audit'],
      gate: null,
    },
    {
      name: 'Define',
      clientLine: 'Research becomes a plan you approve before design.',
      checklist: [
        'Personas',
        'User flows',
        'Sitemap and scope (must, should, could)',
        'Strategy brief or PRD',
        'Present and log changes',
      ],
      deliverables: ['Personas', 'User flows', 'Strategy brief or PRD', 'Scope'],
      gate: { title: 'Strategy and scope sign-off', approver: 'client' },
    },
    {
      name: 'Design',
      clientLine: 'Every screen designed, for phone and desktop.',
      checklist: [
        'Show 2 to 3 directions',
        'Brand system if in scope',
        'Wireframes for key pages',
        'Hi-fi design, desktop and phone',
        'Copy',
        'Contrast and tap-target checks',
        'Clickable prototype',
        'Test with 3 to 5 users',
        'Design handoff',
      ],
      deliverables: ['Wireframes', 'Designs and prototype', 'Design system'],
      gate: { title: 'Design sign-off', approver: 'client' },
    },
    {
      name: 'Build',
      clientLine: 'We build, test and show you progress every week.',
      checklist: [
        'Architecture and repo set up',
        'Staging environment',
        'Weekly demo on staging',
        'Code review on every change',
        'Integrations (payments, email, analytics)',
        'Security checklist',
        'QA on browsers and phones, accessibility, performance',
        'Client tests on staging',
      ],
      deliverables: ['Staging link', 'Weekly updates', 'QA report', 'Technical docs'],
      gate: { title: 'Acceptance testing sign-off', approver: 'client' },
    },
    {
      name: 'Launch',
      clientLine: 'We go live and hand everything over to you.',
      checklist: [
        'Pre-launch checklist',
        'Deploy; check SSL and DNS',
        'Redirects for redesigns',
        'Search Console and analytics',
        "Move accounts into the client's name",
        'Record a training walkthrough',
        'Send the handover',
        'Book a check-in in two weeks',
      ],
      deliverables: ['Live product', 'Handover kit', 'Training video'],
      gate: { title: 'Handover accepted', approver: 'client' },
    },
    {
      name: 'Grow',
      clientLine: 'Ongoing care, reports and improvements.',
      checklist: ['Monthly report', 'Updates, backups, monitoring', 'Quarterly review and plan'],
      deliverables: ['Monthly report', 'Support channel'],
      gate: null,
    },
  ],
};

export const BLANK_TEMPLATE: PhaseTemplate = {
  key: 'blank',
  name: 'Blank',
  phases: [
    {
      name: 'Work',
      clientLine: 'The work we agreed.',
      checklist: [],
      deliverables: [],
      gate: null,
    },
  ],
};

export const BUILT_IN_TEMPLATES = [SEVEN_PHASES, BLANK_TEMPLATE] as const;

export type PhaseProgress = { skipped: boolean; checklistDone: number; checklistTotal: number };

/** Done checklist items ÷ all checklist items in phases that aren't skipped, as a whole percent. */
export function projectProgress(phases: readonly PhaseProgress[]): number {
  const counted = phases.filter((p) => !p.skipped);
  const total = counted.reduce((s, p) => s + p.checklistTotal, 0);
  if (total === 0) return 0;
  const done = counted.reduce((s, p) => s + p.checklistDone, 0);
  return Math.floor((done * 100) / total);
}

/** Checks a template saved from a project (names, at least one phase). */
export function validateTemplate(t: Pick<PhaseTemplate, 'name' | 'phases'>): string[] {
  const errors: string[] = [];
  if (!t.name.trim()) errors.push('Give the template a name.');
  if (t.phases.length === 0) errors.push('Add at least one phase.');
  t.phases.forEach((p, i) => {
    if (!p.name.trim()) errors.push(`Phase ${i + 1} needs a name.`);
    if (p.gate && !p.gate.title.trim())
      errors.push(`The gate in ${p.name || `phase ${i + 1}`} needs a title.`);
  });
  return errors;
}
