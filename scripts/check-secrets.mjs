// Fails when a secret is about to be committed: an env file other than
// `.env.example`, or text that looks like a live key or connection string.
// `--staged` checks what is staged (pre-commit hook); the default checks every tracked file (CI).
// A line can opt out with the comment `secrets-ignore` and a reason.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ENV_FILE = /(^|\/)\.env(\..+)?$/;
const ALLOWED_ENV_FILE = /(^|\/)\.env\.example$/;
const SKIP_CONTENT = /\.(png|jpe?g|webp|gif|ico|woff2?|pdf|lock|svg)$|(^|\/)pnpm-lock\.yaml$/;

export const RULES = [
  { name: 'private key block', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  {
    name: 'JWT (Supabase or similar key)',
    re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
  },
  { name: 'Razorpay live key', re: /\brzp_live_[A-Za-z0-9]{8,}/ },
  {
    name: 'Razorpay secret assignment',
    re: /RAZORPAY_(?:KEY_SECRET|WEBHOOK_SECRET)\s*=\s*['"]?[A-Za-z0-9]{12,}/,
  },
  { name: 'Resend API key', re: /\bre_[A-Za-z0-9]{20,}/ },
  {
    name: 'Postgres URL with password',
    re: /postgres(?:ql)?:\/\/[^:\s/]+:(?!\[?(?:YOUR|PASSWORD|password|\*|<))[^@\s]{6,}@(?!localhost\b|127\.0\.0\.1)/,
  },
];

export function scan(file, text) {
  const problems = [];
  if (ENV_FILE.test(file) && !ALLOWED_ENV_FILE.test(file)) {
    problems.push(`${file}: env files must not be committed (use .env.example for names only)`);
  }
  if (SKIP_CONTENT.test(file)) return problems;
  text.split('\n').forEach((line, i) => {
    if (line.includes('secrets-ignore')) return;
    for (const rule of RULES) {
      if (rule.re.test(line)) problems.push(`${file}:${i + 1}: ${rule.name}`);
    }
  });
  return problems;
}

function listFiles(staged) {
  const args = staged
    ? ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']
    : ['ls-files', '-z'];
  return execFileSync('git', args, { encoding: 'utf8' }).split('\0').filter(Boolean);
}

function main() {
  const staged = process.argv.includes('--staged');
  const problems = [];
  for (const file of listFiles(staged)) {
    let text = '';
    try {
      text = staged
        ? execFileSync('git', ['show', `:${file}`], { encoding: 'utf8', maxBuffer: 20e6 })
        : readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    problems.push(...scan(file, text));
  }
  if (problems.length) {
    console.error(
      'Possible secrets found. Remove them and set the value in the environment settings instead:',
    );
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log('Secret check passed.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
