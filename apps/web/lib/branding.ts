// The agency's brand colour in the client portal (design-system.md §2). It replaces
// primary, ring and brand-soft-foreground only where the result stays readable;
// otherwise the portal keeps the Agency OS colours.
import { checkBrandColour, contrastRatio, darken, parseHexColour } from '@agency-os/core';
import type { ThemeId } from '@agency-os/tokens';
import { tokenColour } from './token-colours';

const HOVER_DARKEN = 0.15;

export type BrandReview = {
  colour: string;
  ratio: number;
  usable: boolean;
};

/** Checks a colour against white button text (the primary-foreground token). */
export function reviewBrandColour(colour: string): BrandReview {
  return checkBrandColour(colour, tokenColour('primary-foreground'));
}

function overrides(colour: string, theme: ThemeId): Record<string, string> {
  const vars: Record<string, string> = {
    '--primary': colour,
    '--primary-hover': darken(colour, HOVER_DARKEN),
  };
  // Focus rings need 3:1 against the page; text on the soft brand tint needs 4.5:1.
  if (contrastRatio(colour, tokenColour('background', theme)) >= 3) vars['--ring'] = colour;
  if (contrastRatio(colour, tokenColour('brand-soft', theme)) >= 4.5)
    vars['--brand-soft-foreground'] = colour;
  return vars;
}

const block = (selector: string, vars: Record<string, string>) =>
  `${selector}{${Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(';')}}`;

/**
 * A style sheet that applies the brand colour inside `[data-brand]`, per theme, or null
 * when there's no usable colour. The colour is re-parsed here, so only a hex value can
 * ever reach the style sheet.
 */
export function brandStyleSheet(stored: string | null): string | null {
  const colour = stored ? parseHexColour(stored) : null;
  if (!colour || !reviewBrandColour(colour).usable) return null;
  return [
    block(':root:not(.dark):not([data-theme="dark"]) [data-brand]', overrides(colour, 'light')),
    block('.dark [data-brand],[data-theme="dark"] [data-brand]', overrides(colour, 'dark')),
  ].join('');
}
