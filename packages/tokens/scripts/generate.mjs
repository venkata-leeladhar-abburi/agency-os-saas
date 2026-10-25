// Generates the Tailwind CSS v4 + shadcn/ui theme from tokens/tokens.json.
// Usage: node scripts/generate.mjs [--check]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const root = resolve(here, '../../..');
export const tokensPath = resolve(root, 'tokens/tokens.json');
export const outputs = [resolve(here, '../globals.css'), resolve(root, 'tokens/globals.css')];

const SIDEBAR_ALIASES = [
  ['sidebar-primary', 'primary'],
  ['sidebar-primary-foreground', 'primary-foreground'],
  ['sidebar-accent', 'sidebar-active'],
  ['sidebar-accent-foreground', 'sidebar-active-foreground'],
  ['sidebar-border', 'border'],
  ['sidebar-ring', 'ring'],
];

const ref = (value) => {
  const match = /^\{(.+)\}$/.exec(value);
  if (!match) throw new Error(`Semantic colour must reference a scale step, got ${value}`);
  return `var(--color-${match[1]})`;
};

export function generate(tokens) {
  const colors = tokens.color.tokens;
  const raw = colors.filter((t) => typeof t.value === 'string');
  const semantic = colors.filter((t) => typeof t.value === 'object');
  const styles = tokens.type.groups.flatMap((g) => g.styles);
  const shadows = tokens.shadow.tokens;
  const L = [];

  L.push(
    '/* Agency OS — Tailwind CSS v4 + shadcn/ui theme, generated from tokens.json. Do not edit by hand:',
    '   change tokens.json and regenerate. Light is the default; dark applies under [data-theme="dark"] or .dark. */',
    '@import "tailwindcss";',
    '@import "tw-animate-css";',
    '',
    '@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *, .dark, .dark *));',
    '',
    '/* 1. Raw scales. Only these colours exist: Tailwind\'s default palette is removed. */',
    '@theme {',
    '  --color-*: initial;',
    '  --color-white: #ffffff;',
    '  --color-transparent: transparent;',
    '  --color-current: currentColor;',
  );
  for (const t of raw) L.push(`  --color-${t.name}: ${t.value};`);
  L.push('');
  for (const t of tokens.radius.tokens) L.push(`  --${t.name}: ${t.value};`);
  L.push('');
  for (const t of tokens.size.tokens) {
    if (t.name.endsWith('-max')) L.push(`  --container-${t.name.slice(0, -4)}: ${t.value};`);
    else L.push(`  --spacing-${t.name}: ${t.value};`);
  }
  L.push('');
  L.push(`  --font-sans: var(--font-geist-sans), ${tokens.type.families.sans};`);
  L.push(`  --font-mono: var(--font-geist-mono), ${tokens.type.families.mono};`);
  L.push('');
  for (const s of styles) {
    L.push(`  --text-${s.name}: ${s.fontSize};`);
    L.push(`  --text-${s.name}--line-height: ${s.lineHeight};`);
    if (s.letterSpacing) L.push(`  --text-${s.name}--letter-spacing: ${s.letterSpacing};`);
    L.push(`  --text-${s.name}--font-weight: ${s.fontWeight};`);
  }
  L.push('', '  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);', '}', '');

  L.push('/* 2. Semantic tokens (shadcn names plus ours). Components use only these. */');
  for (const theme of tokens.color.themes) {
    if (theme.id === 'light') L.push(':root,', '[data-theme="light"] {');
    else L.push('', `[data-theme="${theme.id}"],`, `.${theme.id} {`);
    for (const t of semantic) L.push(`  --${t.name}: ${ref(t.value[theme.id])};`);
    for (const [alias, target] of SIDEBAR_ALIASES) L.push(`  --${alias}: var(--${target});`);
    for (const s of shadows) L.push(`  --elevation-${s.name.replace('shadow-', '')}: ${s.value[theme.id]};`);
    L.push(`  color-scheme: ${theme.id};`, '}');
  }
  L.push('');

  L.push(
    '/* 3. Expose the semantic tokens to Tailwind: bg-background, text-muted-foreground, border-input, ring-ring, shadow-md … */',
    '@theme inline {',
  );
  for (const t of semantic) L.push(`  --color-${t.name}: var(--${t.name});`);
  for (const [alias] of SIDEBAR_ALIASES) L.push(`  --color-${alias}: var(--${alias});`);
  for (const s of shadows) {
    const size = s.name.replace('shadow-', '');
    L.push(`  --shadow-${size}: var(--elevation-${size});`);
  }
  L.push('}', '');

  L.push(
    '@layer base {',
    '  * { @apply border-border; }',
    '  html { -webkit-text-size-adjust: 100%; }',
    '  body { @apply bg-background text-foreground font-sans text-body antialiased; font-feature-settings: "cv11"; }',
    '  :focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }',
    '  .tabular, td.num, [data-money] { font-variant-numeric: tabular-nums; }',
    '  @media (prefers-reduced-motion: reduce) {',
    '    *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }',
    '  }',
    '}',
    '',
  );
  const o = styles.find((s) => s.name === 'overline');
  L.push(
    `@utility text-overline-caps { font-size: ${o.fontSize}; line-height: ${o.lineHeight}; font-weight: ${o.fontWeight}; letter-spacing: ${o.letterSpacing}; text-transform: uppercase; }`,
    '',
  );
  return L.join('\n');
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const css = generate(JSON.parse(readFileSync(tokensPath, 'utf8')));
  if (process.argv.includes('--check')) {
    const stale = outputs.filter((p) => !existsSync(p) || readFileSync(p, 'utf8') !== css);
    if (stale.length) {
      console.error(`Out of date: ${stale.join(', ')}. Run pnpm --filter @agency-os/tokens generate.`);
      process.exit(1);
    }
    console.log('globals.css matches tokens.json');
  } else {
    for (const p of outputs) writeFileSync(p, css);
    console.log(`Wrote ${outputs.join(', ')}`);
  }
}
