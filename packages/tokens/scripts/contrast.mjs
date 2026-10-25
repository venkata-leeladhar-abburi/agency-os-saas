// WCAG 2.1 contrast check for the semantic colour pairs in tokens/tokens.json, in every theme.
// Usage: node scripts/contrast.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { tokensPath } from './generate.mjs';

// [foreground, background, minimum ratio]. Text pairs need 4.5:1; control borders, focus and charts 3:1.
export const PAIRS = [
  ['foreground', 'background', 4.5],
  ['foreground', 'card', 4.5],
  ['card-foreground', 'card', 4.5],
  ['popover-foreground', 'popover', 4.5],
  ['muted-foreground', 'background', 4.5],
  ['muted-foreground', 'card', 4.5],
  ['muted-foreground', 'popover', 4.5],
  ['subtle-foreground', 'background', 4.5],
  ['subtle-foreground', 'card', 4.5],
  ['primary-foreground', 'primary', 4.5],
  ['primary-foreground', 'primary-hover', 4.5],
  ['secondary-foreground', 'secondary', 4.5],
  ['accent-foreground', 'accent', 4.5],
  ['highlight-foreground', 'highlight', 4.5],
  ['brand-soft-foreground', 'brand-soft', 4.5],
  ['link', 'card', 4.5],
  ['link', 'background', 4.5],
  ['destructive-foreground', 'destructive', 4.5],
  ['success', 'success-soft', 4.5],
  ['warning', 'warning-soft', 4.5],
  ['danger', 'danger-soft', 4.5],
  ['info', 'info-soft', 4.5],
  ['success', 'card', 4.5],
  ['warning', 'card', 4.5],
  ['danger', 'card', 4.5],
  ['info', 'card', 4.5],
  ['sidebar-foreground', 'sidebar', 4.5],
  ['sidebar-active-foreground', 'sidebar-active', 4.5],
  ['foreground', 'muted', 4.5],
  ['foreground', 'accent', 4.5],
  ['input', 'card', 3],
  ['input', 'popover', 3],
  ['input', 'background', 3],
  ['ring', 'card', 3],
  ['ring', 'background', 3],
  ['chart-1', 'card', 3],
  ['chart-2', 'card', 3],
  ['chart-3', 'card', 3],
  ['chart-4', 'card', 3],
  ['chart-5', 'card', 3],
  ['chart-6', 'card', 3],
];

function luminance(hex) {
  const n = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(n.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function check(tokens) {
  const scale = new Map();
  const semantic = new Map();
  for (const t of tokens.color.tokens) {
    if (typeof t.value === 'string') scale.set(t.name, t.value);
    else semantic.set(t.name, t.value);
  }
  const resolveColor = (name, theme) => {
    const v = semantic.get(name)?.[theme];
    if (!v) throw new Error(`Unknown semantic colour ${name}`);
    const hex = scale.get(v.slice(1, -1));
    if (!hex) throw new Error(`Unknown scale step ${v}`);
    return hex;
  };
  const results = [];
  for (const { id: theme } of tokens.color.themes) {
    for (const [fg, bg, min] of PAIRS) {
      const r = ratio(resolveColor(fg, theme), resolveColor(bg, theme));
      results.push({ theme, fg, bg, min, ratio: r, pass: r >= min });
    }
  }
  return results;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const results = check(JSON.parse(readFileSync(tokensPath, 'utf8')));
  for (const r of results) {
    const mark = r.pass ? 'pass' : 'FAIL';
    console.log(`${mark}  ${r.theme.padEnd(5)}  ${r.fg} on ${r.bg}: ${r.ratio.toFixed(2)} (needs ${r.min})`);
  }
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length} of ${results.length} pairs pass.`);
  if (failed.length) process.exit(1);
}
