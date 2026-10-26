/** CSV for data export: RFC 4180 quoting, a UTF-8 BOM so spreadsheets read ₹ correctly. */
const FORMULA_START = /^[=+\-@\t\r]/;

function cell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text: string;
  if (value instanceof Date) text = value.toISOString();
  else if (typeof value === 'object') text = JSON.stringify(value);
  else text = String(value);
  // A text cell starting like a formula is prefixed so spreadsheets don't run it.
  if (typeof value === 'string' && FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv<T extends Record<string, unknown>>(
  rows: readonly T[],
  columns: readonly (keyof T & string)[] = rows[0]
    ? (Object.keys(rows[0]) as (keyof T & string)[])
    : [],
): string {
  const lines = [columns.map((c) => cell(c)).join(',')];
  for (const row of rows) lines.push(columns.map((c) => cell(row[c])).join(','));
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}
