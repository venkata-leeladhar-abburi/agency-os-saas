import { describe, expect, it } from 'vitest';
import {
  checkBrandColour,
  contrastRatio,
  darken,
  formatRatio,
  parseHexColour,
  relativeLuminance,
} from './colour';

const WHITE = '#ffffff';
const BLACK = '#000000';

describe('parseHexColour', () => {
  it('normalises six and three digit colours, with or without #', () => {
    expect(parseHexColour('#7C3AED')).toBe('#7c3aed');
    expect(parseHexColour('7c3aed')).toBe('#7c3aed');
    expect(parseHexColour(' #0af ')).toBe('#00aaff');
  });
  it('refuses anything else, so nothing but a colour reaches a style sheet', () => {
    for (const bad of ['', '#12345', '#1234567', 'red', '#ggg', '#fff;}body{', 'url(x)'])
      expect(parseHexColour(bad)).toBeNull();
  });
});

describe('contrast', () => {
  it('matches the WCAG end points', () => {
    expect(relativeLuminance(WHITE)).toBeCloseTo(1);
    expect(relativeLuminance(BLACK)).toBe(0);
    expect(contrastRatio(WHITE, BLACK)).toBeCloseTo(21);
    expect(contrastRatio(BLACK, WHITE)).toBeCloseTo(21);
    expect(contrastRatio('#777777', '#777777')).toBe(1);
  });
  it('matches known pairs', () => {
    // #767676 on white is the classic 4.54:1 grey.
    expect(contrastRatio('#767676', WHITE)).toBeCloseTo(4.54, 2);
    expect(contrastRatio('#777777', WHITE)).toBeLessThan(4.5);
  });
  it('rounds the ratio down for display', () => {
    expect(formatRatio(4.4999)).toBe('4.4:1');
    expect(formatRatio(4.54)).toBe('4.5:1');
    expect(formatRatio(21)).toBe('21.0:1');
  });
});

describe('checkBrandColour', () => {
  it('accepts a colour white text reads on', () => {
    const c = checkBrandColour('#0f766e', WHITE);
    expect(c.usable).toBe(true);
    expect(c.ratio).toBeGreaterThan(4.5);
  });
  it('refuses a light colour', () => {
    const c = checkBrandColour('#facc15', WHITE);
    expect(c.usable).toBe(false);
    expect(c.ratio).toBeLessThan(2);
  });
  it('treats exactly the threshold as passing', () => {
    expect(checkBrandColour('#767676', WHITE).usable).toBe(true);
    expect(checkBrandColour('#777777', WHITE).usable).toBe(false);
  });
});

describe('darken', () => {
  it('mixes towards black and keeps white text readable', () => {
    expect(darken('#ffffff', 0.5)).toBe('#808080');
    expect(darken('#0f766e', 0)).toBe('#0f766e');
    expect(darken('#0f766e', 1)).toBe('#000000');
    expect(contrastRatio(darken('#767676', 0.15), WHITE)).toBeGreaterThan(
      contrastRatio('#767676', WHITE),
    );
  });
});
