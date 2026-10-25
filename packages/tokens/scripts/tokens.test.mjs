import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { check, ratio } from './contrast.mjs';
import { generate, outputs, tokensPath } from './generate.mjs';

const tokens = JSON.parse(readFileSync(tokensPath, 'utf8'));

describe('generate', () => {
  it('produces the committed globals.css files', () => {
    const css = generate(tokens);
    for (const path of outputs) expect(readFileSync(path, 'utf8')).toBe(css);
  });

  it('removes the default Tailwind palette and defines both themes', () => {
    const css = generate(tokens);
    expect(css).toContain('--color-*: initial;');
    expect(css).toContain(':root,\n[data-theme="light"] {');
    expect(css).toContain('[data-theme="dark"],\n.dark {');
  });

  it('only lets semantic tokens reference scale steps', () => {
    const broken = structuredClone(tokens);
    broken.color.tokens.find((t) => t.name === 'primary').value.light = '#123456';
    expect(() => generate(broken)).toThrow('must reference a scale step');
  });
});

describe('contrast', () => {
  it('computes WCAG ratios', () => {
    expect(ratio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(ratio('#ffffff', '#ffffff')).toBe(1);
  });

  it('passes every pair in both themes', () => {
    const failed = check(tokens).filter((r) => !r.pass);
    expect(failed).toEqual([]);
  });

  it('fails a pair that drops below its minimum', () => {
    const weak = structuredClone(tokens);
    weak.color.tokens.find((t) => t.name === 'muted-foreground').value.light = '{neutral-300}';
    expect(check(weak).some((r) => !r.pass && r.fg === 'muted-foreground')).toBe(true);
  });
});
