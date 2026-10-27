/**
 * A plausible email address: something before a single @, no spaces, and a domain with a dot
 * that has a character before it and at least two after ("kiran@onestop.in"). Checked by
 * hand rather than with one regular expression, so a long crafted input can't make it
 * backtrack (CodeQL js/polynomial-redos).
 */
export function isEmail(input: string): boolean {
  const s = input.trim();
  const at = s.indexOf('@');
  if (at < 1 || at !== s.lastIndexOf('@') || /\s/.test(s)) return false;
  const domain = s.slice(at + 1);
  for (let i = 1; i <= domain.length - 3; i++) if (domain[i] === '.') return true;
  return false;
}
