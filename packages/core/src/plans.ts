/**
 * Agency OS plans and their limits (defaults-and-content.md §8, open question 5 default).
 * Upgrade prompts appear at the limit, never before; limits never block viewing or exporting.
 */
export const PLANS = ['free', 'solo', 'starter', 'growth', 'enterprise'] as const;
export type Plan = (typeof PLANS)[number];

export const LIMITED_RESOURCES = [
  'members',
  'portal_clients',
  'open_leads',
  'quotes_per_month',
  'proposals_per_month',
  'invoices_per_month',
] as const;
export type LimitedResource = (typeof LIMITED_RESOURCES)[number];

export type PlanDetails = {
  name: string;
  /** Monthly price in paise; null while the price is open. */
  priceMinor: number | null;
  currency: 'INR';
  /** null means unlimited. */
  limits: Record<LimitedResource, number | null>;
  ownBranding: boolean;
  /** Hidden plans can be assigned but are not offered (Solo waits for research A5). */
  offered: boolean;
};

const unlimited: Record<LimitedResource, null> = {
  members: null,
  portal_clients: null,
  open_leads: null,
  quotes_per_month: null,
  proposals_per_month: null,
  invoices_per_month: null,
};

export const PLAN_DETAILS: Record<Plan, PlanDetails> = {
  free: {
    name: 'Free',
    priceMinor: 0,
    currency: 'INR',
    limits: {
      members: 1,
      portal_clients: 1,
      open_leads: 25,
      quotes_per_month: 3,
      proposals_per_month: 3,
      invoices_per_month: 3,
    },
    ownBranding: false,
    offered: true,
  },
  solo: {
    name: 'Solo',
    priceMinor: null,
    currency: 'INR',
    limits: { ...unlimited, members: 1 },
    ownBranding: true,
    offered: false,
  },
  starter: {
    name: 'Agency Starter',
    priceMinor: 149_900,
    currency: 'INR',
    limits: { ...unlimited, members: 5, portal_clients: 10 },
    ownBranding: true,
    offered: true,
  },
  growth: {
    name: 'Agency Growth',
    priceMinor: 349_900,
    currency: 'INR',
    limits: { ...unlimited, members: 20 },
    ownBranding: true,
    offered: true,
  },
  enterprise: {
    name: 'Agency Enterprise',
    priceMinor: 799_900,
    currency: 'INR',
    limits: unlimited,
    ownBranding: true,
    offered: true,
  },
};

const RESOURCE_LABELS: Record<LimitedResource, [one: string, many: string]> = {
  members: ['member', 'members'],
  portal_clients: ['client with a portal', 'clients with a portal'],
  open_leads: ['open lead', 'open leads'],
  quotes_per_month: ['quote a month', 'quotes a month'],
  proposals_per_month: ['proposal a month', 'proposals a month'],
  invoices_per_month: ['invoice a month', 'invoices a month'],
};

export type LimitCheck = {
  allowed: boolean;
  limit: number | null;
  used: number;
  /** The cheapest offered plan that allows it, when this one does not. */
  upgradeTo?: Plan;
  /** Shown at the limit: says what the plan includes and how to get more. */
  message?: string;
};

export function limitOf(plan: Plan, resource: LimitedResource): number | null {
  return PLAN_DETAILS[plan].limits[resource];
}

/** Can the workspace add `adding` more of `resource`, given it already has `used`? */
export function checkLimit(
  plan: Plan,
  resource: LimitedResource,
  used: number,
  adding = 1,
): LimitCheck {
  const limit = limitOf(plan, resource);
  if (limit === null || used + adding <= limit) return { allowed: true, limit, used };
  const upgradeTo = PLANS.find((p) => {
    const l = limitOf(p, resource);
    return PLAN_DETAILS[p].offered && (l === null || used + adding <= l);
  });
  const [one, many] = RESOURCE_LABELS[resource];
  const includes = `Your ${PLAN_DETAILS[plan].name} plan includes ${limit} ${limit === 1 ? one : many}.`;
  const next = upgradeTo
    ? ` Upgrade to ${PLAN_DETAILS[upgradeTo].name} to add more.`
    : ' Contact us to add more.';
  return { allowed: false, limit, used, upgradeTo, message: includes + next };
}
