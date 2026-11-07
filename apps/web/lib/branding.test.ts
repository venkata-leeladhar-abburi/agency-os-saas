import { contrastRatio } from '@agency-os/core';
import { describe, expect, it } from 'vitest';
import { brandStyleSheet, reviewBrandColour } from './branding';
import { tokenColour } from './token-colours';

describe('tokenColour', () => {
  it('resolves semantic tokens through the theme', () => {
    expect(tokenColour('primary')).toBe(tokenColour('violet-600'));
    expect(tokenColour('background', 'dark')).toBe(tokenColour('neutral-975'));
  });
  it('throws for a name that is not a token', () => {
    expect(() => tokenColour('nope')).toThrow();
  });
});

describe('brand colour', () => {
  it('the default primary passes its own check', () => {
    expect(reviewBrandColour(tokenColour('primary')).usable).toBe(true);
  });

  it('applies a dark enough colour in both themes', () => {
    const css = brandStyleSheet('#0F766E')!;
    expect(css).toContain('[data-brand]{--primary:#0f766e;--primary-hover:#0d645e');
    expect(css).toContain('.dark [data-brand]');
  });

  it('keeps the Agency OS colours for a light colour or anything that is not a colour', () => {
    expect(brandStyleSheet('#facc15')).toBeNull();
    expect(brandStyleSheet('red;}body{display:none')).toBeNull();
    expect(brandStyleSheet(null)).toBeNull();
  });

  it('only swaps the ring and soft text where they stay readable', () => {
    // Very dark navy: fine for buttons, too dark for a ring on the dark page.
    const css = brandStyleSheet('#0b1f3a')!;
    const [light, dark] = css.split('}');
    expect(light).toContain('--ring:#0b1f3a');
    expect(dark).not.toContain('--ring');
    expect(dark).not.toContain('--brand-soft-foreground');
    expect(contrastRatio('#0b1f3a', tokenColour('background', 'dark'))).toBeLessThan(3);
  });
});
