import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PIPELINE_STAGES,
  LEAD_SOURCE_LABELS,
  LEAD_SOURCES,
  nextFollowUp,
  positionBetween,
  positions,
  toLeadSource,
  zonedTime,
} from './leads';

describe('lead defaults', () => {
  it('has the default stages, with fixed Won and Lost', () => {
    expect(DEFAULT_PIPELINE_STAGES.map((s) => s.name)).toEqual([
      'New',
      'Contacted',
      'Proposal',
      'Won',
      'Lost',
    ]);
    expect(DEFAULT_PIPELINE_STAGES.filter((s) => s.kind !== 'open').map((s) => s.kind)).toEqual([
      'won',
      'lost',
    ]);
    expect(LEAD_SOURCES.map((s) => LEAD_SOURCE_LABELS[s])).toContain('IndiaMART');
  });

  it('matches sources from free text', () => {
    expect(toLeadSource('LinkedIn')).toBe('linkedin');
    expect(toLeadSource(' indiamart ')).toBe('indiamart');
    expect(toLeadSource('Whats App')).toBe('whatsapp');
    expect(toLeadSource('Newspaper')).toBe('other');
    expect(toLeadSource(null)).toBe('other');
  });
});

describe('follow-ups', () => {
  it('is the next working day at 11:00 in the workspace time zone', () => {
    // Monday 26 Oct 2026, 15:00 IST → Tuesday 27 Oct 11:00 IST (05:30 UTC).
    expect(nextFollowUp(new Date('2026-10-26T09:30:00Z'), 'Asia/Kolkata').toISOString()).toBe(
      '2026-10-27T05:30:00.000Z',
    );
    // Friday evening → Monday.
    expect(nextFollowUp(new Date('2026-10-30T14:00:00Z'), 'Asia/Kolkata').toISOString()).toBe(
      '2026-11-02T05:30:00.000Z',
    );
    // Saturday → Monday.
    expect(nextFollowUp(new Date('2026-10-31T06:00:00Z'), 'Asia/Kolkata').toISOString()).toBe(
      '2026-11-02T05:30:00.000Z',
    );
  });

  it('uses the local date, not the UTC date', () => {
    // 23:00 UTC Monday is already Tuesday 04:30 in India → Wednesday.
    expect(nextFollowUp(new Date('2026-10-26T23:00:00Z'), 'Asia/Kolkata').toISOString()).toBe(
      '2026-10-28T05:30:00.000Z',
    );
  });

  it('handles daylight saving', () => {
    // London: BST ends 25 Oct 2026. Friday 23 Oct → Monday 26 Oct 11:00 GMT.
    expect(nextFollowUp(new Date('2026-10-23T12:00:00Z'), 'Europe/London').toISOString()).toBe(
      '2026-10-26T11:00:00.000Z',
    );
    expect(
      zonedTime({ year: 2026, month: 7, day: 1, hour: 11 }, 'Europe/London').toISOString(),
    ).toBe('2026-07-01T10:00:00.000Z');
    expect(
      zonedTime({ year: 2026, month: 3, day: 9, hour: 11 }, 'America/New_York').toISOString(),
    ).toBe('2026-03-09T15:00:00.000Z');
  });
});

describe('board order', () => {
  it('makes keys that sort between their neighbours', () => {
    const [a, b, c] = positions(3);
    expect([c, a, b].sort()).toEqual([a, b, c]);
    const mid = positionBetween(a!, b!);
    expect(a! < mid && mid < b!).toBe(true);
    expect(positionBetween(null, a!) < a!).toBe(true);
    expect(positionBetween(c!, null) > c!).toBe(true);
    expect(positions(2, c!)[0]! > c!).toBe(true);
  });
});
