import { describe, expect, it } from 'vitest';
import { isEmail } from './email';

describe('isEmail', () => {
  it('accepts plausible addresses', () => {
    for (const ok of [' kiran@onestop.in ', 'a.b+c@mail.example.com', 'a@b.cd.e', 'x@y.co'])
      expect(isEmail(ok)).toBe(true);
  });
  it('rejects the rest', () => {
    for (const bad of [
      '',
      'kiran@',
      '@onestop.in',
      'kiran@onestop',
      'kiran@onestop.i',
      'ki ran@onestop.in',
      'a@b@c.in',
      'a@.in',
    ])
      expect(isEmail(bad)).toBe(false);
  });
  it('stays fast on long crafted input (the inputs CodeQL warned about)', () => {
    const started = performance.now();
    expect(isEmail(`!@!.${'!.'.repeat(50_000)}`)).toBe(true);
    expect(isEmail(`a@${'b'.repeat(100_000)}`)).toBe(false);
    expect(isEmail('!.'.repeat(100_000))).toBe(false);
    // Linear time takes a few milliseconds; backtracking on 100,000 characters takes seconds.
    // The margin keeps it steady on a busy CI runner.
    expect(performance.now() - started).toBeLessThan(250);
  });
});
