import { describe, expect, it } from 'vitest';
import { toCsv } from './csv';

describe('toCsv', () => {
  it('writes a header, quotes where needed and ends lines with CRLF', () => {
    const csv = toCsv([
      { name: 'Kite & Co', note: 'Said "yes", then paused', amount: 486000n, paid: true },
      { name: 'Northwind\nStudio', note: null, amount: 0, paid: false },
    ]);
    expect(csv).toBe(
      '\uFEFFname,note,amount,paid\r\n' +
        'Kite & Co,"Said ""yes"", then paused",486000,true\r\n' +
        '"Northwind\nStudio",,0,false\r\n',
    );
  });

  it('formats dates and objects, and follows the given columns', () => {
    const csv = toCsv(
      [{ when: new Date('2026-10-25T00:00:00Z'), meta: { a: 1 }, skip: 'x' }],
      ['meta', 'when'],
    );
    expect(csv).toBe('\uFEFFmeta,when\r\n"{""a"":1}",2026-10-25T00:00:00.000Z\r\n');
  });

  it('defuses text that a spreadsheet would run as a formula', () => {
    expect(toCsv([{ v: '=HYPERLINK("x")' }, { v: '-1' }, { v: -1 }])).toBe(
      '\uFEFFv\r\n"\'=HYPERLINK(""x"")"\r\n\'-1\r\n-1\r\n',
    );
  });

  it('writes an empty file for no rows', () => {
    expect(toCsv([])).toBe('\uFEFF\r\n');
  });
});
