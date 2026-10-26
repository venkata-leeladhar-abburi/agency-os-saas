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

/** Parses CSV text (RFC 4180, with or without a BOM, CRLF or LF) into rows of cells. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cellText = '';
  let quoted = false;
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  for (; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cellText += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cellText += ch;
    } else if (ch === '"' && cellText === '') quoted = true;
    else if (ch === ',') {
      row.push(cellText);
      cellText = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cellText);
      rows.push(row);
      row = [];
      cellText = '';
    } else cellText += ch;
  }
  if (cellText !== '' || row.length > 0) {
    row.push(cellText);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}
