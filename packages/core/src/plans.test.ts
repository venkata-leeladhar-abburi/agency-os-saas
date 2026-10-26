import { describe, expect, it } from 'vitest';
import { checkLimit, limitOf, PLAN_DETAILS, PLANS } from './plans';

describe('plans and limits', () => {
  it('uses the proposed limits', () => {
    expect(PLAN_DETAILS.free.limits).toEqual({
      members: 1,
      portal_clients: 1,
      open_leads: 25,
      quotes_per_month: 3,
      proposals_per_month: 3,
      invoices_per_month: 3,
    });
    expect(PLAN_DETAILS.starter.priceMinor).toBe(149_900);
    expect(PLAN_DETAILS.growth.priceMinor).toBe(349_900);
    expect(limitOf('enterprise', 'members')).toBeNull();
    expect(PLANS.filter((p) => !PLAN_DETAILS[p].offered)).toEqual(['solo']);
  });

  it('allows up to the limit, then names the cheapest plan that fits', () => {
    expect(checkLimit('free', 'open_leads', 24)).toEqual({ allowed: true, limit: 25, used: 24 });
    expect(checkLimit('free', 'open_leads', 25)).toEqual({
      allowed: false,
      limit: 25,
      used: 25,
      upgradeTo: 'starter',
      message: 'Your Free plan includes 25 open leads. Upgrade to Agency Starter to add more.',
    });
    expect(checkLimit('free', 'members', 1).message).toBe(
      'Your Free plan includes 1 member. Upgrade to Agency Starter to add more.',
    );
    expect(checkLimit('starter', 'members', 5, 3).upgradeTo).toBe('growth');
    expect(checkLimit('starter', 'portal_clients', 10).upgradeTo).toBe('growth');
    expect(checkLimit('growth', 'members', 20).upgradeTo).toBe('enterprise');
  });

  it('never limits unlimited resources', () => {
    expect(checkLimit('growth', 'invoices_per_month', 10_000).allowed).toBe(true);
    expect(checkLimit('solo', 'open_leads', 1_000).allowed).toBe(true);
  });

  it('skips plans that are not offered and says to get in touch at the top', () => {
    expect(checkLimit('free', 'quotes_per_month', 3).upgradeTo).toBe('starter');
    const solo = checkLimit('solo', 'members', 1, 30);
    expect(solo.upgradeTo).toBe('enterprise');
    const top = checkLimit('free', 'members', 1, 1);
    expect(top.allowed).toBe(false);
    expect(checkLimit('starter', 'members', 0, 25).upgradeTo).toBe('enterprise');
  });
});
