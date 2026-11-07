// Colour maths for the agency's brand colour (design-system.md §2): WCAG 2.1 contrast.

/** "#7C3AED", "7c3aed" or "#7ce" → "#7c3aed"; anything else → null. */
export function parseHexColour(input: string): string | null {
  const s = input.trim().replace(/^#/, '').toLowerCase();
  if (/^[0-9a-f]{3}$/.test(s)) return `#${[...s].map((c) => c + c).join('')}`;
  if (/^[0-9a-f]{6}$/.test(s)) return `#${s}`;
  return null;
}

function channels(hex: string): [number, number, number] {
  const n = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16)) as [number, number, number];
}

/** WCAG relative luminance of an sRGB colour, 0 (black) to 1 (white). */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = channels(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The WCAG contrast ratio between two colours, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (hi + 0.05) / (lo + 0.05);
}

/** Mixes a colour towards black: 0.15 keeps 85% of it. Used for the hover shade. */
export function darken(hex: string, amount: number): string {
  return `#${channels(hex)
    .map((v) =>
      Math.round(v * (1 - amount))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

/** The ratio rounded down to one decimal, so "4.4:1" never hides a 4.49 that fails. */
export function formatRatio(ratio: number): string {
  return `${(Math.floor(ratio * 10) / 10).toFixed(1)}:1`;
}

export type BrandColourCheck = {
  colour: string;
  /** Contrast of the button text on the colour. */
  ratio: number;
  /** True when the text on it reaches the minimum, so the portal can use it. */
  usable: boolean;
};

/** Can the brand colour carry button text? The text colour comes from the tokens. */
export function checkBrandColour(
  colour: string,
  textColour: string,
  minimum = 4.5,
): BrandColourCheck {
  const ratio = contrastRatio(colour, textColour);
  return { colour, ratio, usable: ratio >= minimum };
}
