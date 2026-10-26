// Colours from tokens/tokens.json for places CSS variables can't reach: PDFs and the
// brand colour check. Semantic names resolve through the theme to the scale.
import { tokens, type ThemeId } from '@agency-os/tokens';

type ColourToken = { name: string; value: string | Record<ThemeId, string> };

const all = tokens.color.tokens as ColourToken[];
const byName = new Map(all.map((t) => [t.name, t.value]));

/** The hex value of a scale or semantic colour token: "primary", "neutral-0", "{violet-600}". */
export function tokenColour(name: string, theme: ThemeId = 'light'): string {
  const value = byName.get(name.replace(/^\{|\}$/g, ''));
  if (value === undefined) throw new Error(`No colour token named ${name}`);
  const v = typeof value === 'string' ? value : value[theme];
  return v.startsWith('{') ? tokenColour(v, theme) : v;
}
