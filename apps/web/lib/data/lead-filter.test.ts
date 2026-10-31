import { describe, expect, it } from 'vitest';
import { leads } from './index';
import {
  hasLeadFilter,
  leadFilterFromQuery,
  leadFilterQuery,
  parseLeadFilter,
} from './lead-filter';

describe('lead filters', () => {
  it('keeps only real sources, a sensible owner and due=1', () => {
    expect(parseLeadFilter({ source: 'referral', owner: ' Arjun Mehta ', due: '1' })).toEqual({
      source: 'referral',
      owner: 'Arjun Mehta',
      due: true,
    });
    expect(parseLeadFilter({ source: 'carrier-pigeon', owner: '  ', due: 'yes' })).toEqual({});
    expect(parseLeadFilter({ owner: 'x'.repeat(121) })).toEqual({});
  });

  it('writes a link in one order and reads it back', () => {
    const q = leadFilterQuery({ due: true, owner: 'Kiran Rao', source: 'website' });
    expect(q).toBe('source=website&owner=Kiran+Rao&due=1');
    expect(leadFilterFromQuery(q)).toEqual({ source: 'website', owner: 'Kiran Rao', due: true });
    expect(leadFilterQuery({})).toBe('');
    expect(hasLeadFilter({})).toBe(false);
    expect(hasLeadFilter({ due: true })).toBe(true);
  });
});

describe('the leads list, filtered', () => {
  it('filters rows and the board, and counts options from every lead', async () => {
    const all = await leads();
    const referral = await leads(undefined, { source: 'referral' });
    expect(referral.rows.length).toBeGreaterThan(0);
    expect(referral.rows.length).toBeLessThan(all.rows.length);
    expect(referral.rows.every((r) => r.source === 'Referral')).toBe(true);
    expect(referral.board.flatMap((c) => c.cards)).toHaveLength(referral.rows.length);
    expect(referral.total).toBe(all.rows.length);
    expect(referral.owners).toEqual(all.owners);
    const due = await leads(undefined, { due: true });
    expect(due.rows).toHaveLength(all.dueCount);
    expect(due.rows.every((r) => r.stage !== 'Won' && r.stage !== 'Lost')).toBe(true);
    expect((await leads(undefined, { owner: 'Nobody' })).rows).toEqual([]);
  });
});
