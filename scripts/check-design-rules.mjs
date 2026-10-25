// Fails when app or UI code breaks the design-system rules in CLAUDE.md:
// raw colours, arbitrary colour classes, other icon libraries or other fonts.
// A line can opt out with the comment `design-rules-ignore` and a reason.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOTS = ['apps/web/app', 'apps/web/src', 'apps/web/components', 'packages/ui/src'];
const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', 'storybook-static']);
const EXTENSIONS = /\.(tsx?|css)$/;

export const RULES = [
  {
    name: 'raw hex colour',
    re: /(?<![\w&/-])#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b(?!-)/,
  },
  { name: 'raw rgb/hsl/oklch colour', re: /\b(?:rgba?|hsla?|oklch|oklab)\(/ },
  {
    name: 'arbitrary colour class',
    re: /\b(?:bg|text|border|ring|fill|stroke|from|to|via|outline|shadow)-\[(?:#|rgb|hsl|oklch|color:)/,
  },
  {
    name: 'icon library other than Phosphor',
    re: /from ['"](?:lucide-react|react-icons|@heroicons|@radix-ui\/react-icons|@tabler\/icons)/,
  },
  { name: 'font other than Geist', re: /from ['"]next\/font\/google['"]|fonts\.googleapis\.com/ },
];

function* files(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (EXTENSIONS.test(entry)) yield path;
  }
}

export function findViolations(source) {
  const found = [];
  source.split('\n').forEach((line, i) => {
    if (line.includes('design-rules-ignore')) return;
    for (const rule of RULES)
      if (rule.re.test(line)) found.push({ line: i + 1, rule: rule.name, text: line.trim() });
  });
  return found;
}

function main() {
  const root = process.cwd();
  let count = 0;
  for (const dir of ROOTS) {
    for (const path of files(join(root, dir))) {
      for (const v of findViolations(readFileSync(path, 'utf8'))) {
        count++;
        console.error(`${relative(root, path)}:${v.line}  ${v.rule}  ${v.text}`);
      }
    }
  }
  if (count) {
    console.error(
      `\n${count} design-rule violation(s). Use tokens from tokens/tokens.json, Phosphor icons and Geist.`,
    );
    process.exit(1);
  }
  console.log('Design rules: no raw colours, other icon libraries or other fonts.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
