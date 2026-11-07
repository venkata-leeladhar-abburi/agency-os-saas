import tokens from '../../../tokens/tokens.json';

export { tokens };
export type Tokens = typeof tokens;
export type ThemeId = 'light' | 'dark';

type ColourToken = { name: string; value: string | Record<ThemeId, string> };
const colours = new Map(
  (tokens.color.tokens as ColourToken[]).map((t) => [t.name, t.value] as const),
);

/**
 * The hex value of a scale or semantic colour token ("primary", "neutral-0"), for places CSS
 * variables can't reach: PDFs, emails and contrast checks.
 */
export function tokenColour(name: string, theme: ThemeId = 'light'): string {
  const value = colours.get(name.replace(/^\{|\}$/g, ''));
  if (value === undefined) throw new Error(`No colour token named ${name}`);
  const v = typeof value === 'string' ? value : value[theme];
  return v.startsWith('{') ? tokenColour(v, theme) : v;
}
