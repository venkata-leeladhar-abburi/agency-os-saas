import { describe, expect, it } from 'vitest';
import { addMoney, money } from './money';

describe('addMoney', () => {
  it('adds amounts in minor units', () => {
    expect(addMoney(money(100n, 'INR'), money(250n, 'INR'))).toEqual(money(350n, 'INR'));
  });
  it('refuses to mix currencies', () => {
    expect(() => addMoney(money(1n, 'INR'), money(1n, 'USD'))).toThrow('Currency mismatch');
  });
});
