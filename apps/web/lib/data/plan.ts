// Server only. The workspace's plan, what it has used, and the check before adding more.
import {
  checkLimit,
  formatMoney,
  LIMITED_RESOURCES,
  limitOf,
  PLAN_DETAILS,
  PLANS,
  type LimitCheck,
  type LimitedResource,
  type Plan,
} from '@agency-os/core';
import { store } from './shared';
import { istDate } from './views';

/**
 * How much of each limit is in use. Example records don't count, so trying the product with
 * example data never pushes a workspace into an upgrade.
 */
export async function usage(now = new Date()): Promise<Record<LimitedResource, number>> {
  const s = store();
  const own = <T extends { example?: boolean }>(list: T[]) => list.filter((r) => !r.example);
  const month = istDate(now).slice(0, 7);
  const thisMonth = (at: string | null) => Boolean(at) && istDate(at!).slice(0, 7) === month;
  const pendingInvites = s.invitations.filter(
    (i) => !i.revokedAt && !i.acceptedAt && new Date(i.expiresAt) > now,
  ).length;
  return {
    members: s.members.length + pendingInvites,
    portal_clients: own(s.clients).filter((c) => c.portal !== 'not_invited').length,
    open_leads: own(s.leads).filter((l) => l.stage !== 'won' && l.stage !== 'lost').length,
    quotes_per_month: own(s.quotes).filter((q) => thisMonth(q.createdAt)).length,
    proposals_per_month: own(s.proposals).filter((p) => thisMonth(p.createdAt)).length,
    invoices_per_month: own(s.invoices).filter((i) => thisMonth(i.issuedOn ?? i.createdAt)).length,
  };
}

/** Before adding: is there room on the plan? Viewing and exporting are never checked. */
export async function checkRoom(resource: LimitedResource, adding = 1): Promise<LimitCheck> {
  const used = (await usage())[resource];
  return checkLimit(store().settings.plan, resource, used, adding);
}

export async function planOverview() {
  const plan = store().settings.plan;
  const used = await usage();
  return {
    plan,
    details: PLAN_DETAILS[plan],
    rows: LIMITED_RESOURCES.map((r) => ({ resource: r, used: used[r], limit: limitOf(plan, r) })),
    offered: PLANS.filter((p) => PLAN_DETAILS[p].offered).map((p) => ({
      id: p,
      ...PLAN_DETAILS[p],
    })),
  };
}

export async function setPlan(plan: Plan) {
  store().settings.plan = plan;
}

/** What the limit dialog shows: the plan you're on and the offered plans above it. */
export type LimitInfo = {
  title: string;
  message: string;
  upgradeTo: string | null;
  /** Offered plans with room, cheapest first: name, price and what they include. */
  plans: { name: string; price: string; detail: string }[];
  /** Set each time, so the dialog opens again after it was closed. */
  at: number;
};

export const LIMIT_TITLES: Record<LimitedResource, (limit: number, plan: string) => string> = {
  members: (n, plan) => `You’ve reached ${n} ${n === 1 ? 'member' : 'members'} on the ${plan} plan`,
  portal_clients: (n, plan) =>
    `You’ve reached ${n} ${n === 1 ? 'client' : 'clients'} with a portal on the ${plan} plan`,
  open_leads: (n, plan) => `You’ve reached ${n} open leads on the ${plan} plan`,
  quotes_per_month: (n, plan) => `You’ve sent ${n} quotes this month on the ${plan} plan`,
  proposals_per_month: (n, plan) => `You’ve made ${n} proposals this month on the ${plan} plan`,
  invoices_per_month: (n, plan) => `You’ve made ${n} invoices this month on the ${plan} plan`,
};

const count = (n: number | null, one: string, many: string) =>
  n === null ? `unlimited ${many}` : `${n} ${n === 1 ? one : many}`;

/** What a plan includes, in one line for the dialog and the plans page. */
export function planSummary(plan: Plan): string {
  const l = PLAN_DETAILS[plan].limits;
  return [
    count(l.members, 'member', 'members'),
    count(l.portal_clients, 'client with a portal', 'clients with a portal'),
    count(l.open_leads, 'open lead', 'open leads'),
  ].join(' · ');
}

export function planPrice(plan: Plan): string {
  const minor = PLAN_DETAILS[plan].priceMinor;
  if (minor === null) return 'Price to be set';
  return minor === 0 ? 'Free' : `${formatMoney(minor, 'INR', { decimals: 0 })} a month`;
}

export function limitInfo(
  resource: LimitedResource,
  check: LimitCheck,
  current: Plan = store().settings.plan,
): LimitInfo {
  const plan = PLAN_DETAILS[current].name;
  const needed = check.used + 1;
  const plans = PLANS.filter((p) => {
    const l = limitOf(p, resource);
    return p !== current && PLAN_DETAILS[p].offered && (l === null || l >= needed);
  }).map((p) => ({ name: PLAN_DETAILS[p].name, price: planPrice(p), detail: planSummary(p) }));
  return {
    title: LIMIT_TITLES[resource](check.limit ?? 0, plan),
    message: check.message ?? '',
    upgradeTo: check.upgradeTo ? PLAN_DETAILS[check.upgradeTo].name : null,
    plans,
    at: Date.now(),
  };
}

/** The check every "add" action runs: null when there's room, else what the dialog shows. */
export async function needsUpgrade(
  resource: LimitedResource,
  adding = 1,
): Promise<LimitInfo | null> {
  const check = await checkRoom(resource, adding);
  return check.allowed ? null : limitInfo(resource, check);
}
