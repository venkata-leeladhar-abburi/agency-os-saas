// Server only. The setup checklist, and example data that can be loaded and removed.
import { exampleRecords, EXAMPLE_LISTS } from './example-store';
import { store } from './shared';

export type OnboardingStep = {
  id: 'services' | 'lead' | 'quote' | 'portal' | 'invoice';
  done: boolean;
};

/** The five steps (defaults-and-content.md §5), done from the workspace's own records only. */
export async function onboarding() {
  const s = store();
  const own = <T extends { example?: boolean }>(list: T[]) => list.filter((r) => !r.example);
  const steps: OnboardingStep[] = [
    { id: 'services', done: s.settings.services.length > 0 && s.settings.logo !== null },
    { id: 'lead', done: own(s.leads).length > 0 },
    { id: 'quote', done: own(s.proposals).some((p) => p.status !== 'draft') },
    { id: 'portal', done: own(s.clients).some((c) => c.portal !== 'not_invited') },
    { id: 'invoice', done: own(s.invoices).length > 0 },
  ];
  const hasExample = EXAMPLE_LISTS.some((l) =>
    (s[l] as { example?: boolean }[]).some((r) => r.example),
  );
  const fresh = exampleRecords();
  const allExamples = EXAMPLE_LISTS.every((l) => {
    const ids = new Set((s[l] as { id: string }[]).map((r) => r.id));
    return (fresh[l] as { id: string }[]).every((r) => ids.has(r.id));
  });
  return {
    steps,
    done: steps.filter((x) => x.done).length,
    /** Every example record is in the workspace (nothing to load). */
    allExamples,
    show: !s.settings.onboardingDismissed && steps.some((x) => !x.done),
    dismissed: s.settings.onboardingDismissed,
    hasExample,
  };
}

export async function dismissOnboarding() {
  store().settings.onboardingDismissed = true;
}

export async function showOnboarding() {
  store().settings.onboardingDismissed = false;
}

export type RemoveResult = { removed: number; kept: string[] };

/**
 * Removes example records. An example record the workspace's own records still point to (a
 * client on your invoice, say) stays, and the result names it.
 */
export async function removeExampleData(): Promise<RemoveResult> {
  const s = store();
  const own = {
    clients: new Set<string>(),
    projects: new Set<string>(),
    leads: new Set<string>(),
    quotes: new Set<string>(),
  };
  for (const i of s.invoices) if (!i.example) own.clients.add(i.clientId);
  for (const p of s.projects) if (!p.example) own.clients.add(p.clientId);
  for (const t of s.tasks) if (!t.example) own.projects.add(t.projectId);
  for (const m of s.messages) if (!m.example) own.projects.add(m.projectId);
  for (const p of s.proposals) if (!p.example) own.quotes.add(p.quoteId);
  for (const q of s.quotes) {
    if (q.example && !own.quotes.has(q.id)) continue;
    if (q.leadId) own.leads.add(q.leadId);
    if (q.clientId) own.clients.add(q.clientId);
  }
  for (const p of s.projects) if (own.projects.has(p.id)) own.clients.add(p.clientId);
  for (const l of s.leads) if (!l.example && l.clientId) own.clients.add(l.clientId);

  const kept: string[] = [];
  let removed = 0;
  const sweep = <T extends { id: string; example?: boolean }>(
    list: T[],
    keep: Set<string> | null,
    label: (r: T) => string,
  ) =>
    list.filter((r) => {
      if (!r.example) return true;
      if (keep?.has(r.id)) {
        kept.push(label(r));
        return true;
      }
      removed += 1;
      return false;
    });

  s.leads = sweep(s.leads, own.leads, (l) => `the lead ${l.company ?? l.name}`);
  s.clients = sweep(s.clients, own.clients, (c) => `the client ${c.name}`);
  s.projects = sweep(s.projects, own.projects, (p) => `the project ${p.name}`);
  s.quotes = sweep(s.quotes, own.quotes, (q) => `the quote ${q.number}`);
  s.invoices = sweep(s.invoices, null, () => '');
  s.tasks = sweep(s.tasks, null, () => '');
  s.proposals = sweep(s.proposals, null, () => '');
  s.notifications = sweep(s.notifications, null, () => '');
  s.messages = sweep(s.messages, null, () => '');
  return { removed, kept };
}

/** Puts the example records back (any already there are left as they are). */
export async function loadExampleData(): Promise<number> {
  const s = store();
  const fresh = exampleRecords();
  let added = 0;
  for (const list of EXAMPLE_LISTS) {
    const current = s[list] as { id: string }[];
    const ids = new Set(current.map((r) => r.id));
    for (const r of fresh[list] as { id: string }[]) {
      if (ids.has(r.id)) continue;
      current.push(r);
      added += 1;
    }
  }
  return added;
}
