import { describe, expect, it } from 'vitest';
import { renderSigningCode, signingCodeSubject } from './signing-code';

const base = {
  agency: { name: 'One Stop Solutions' },
  title: 'Proposal for Example Kite & Co',
  code: '482915',
  minutes: 10,
};

describe('signing code email', () => {
  it('puts the code in the subject and the body, with how long it works', async () => {
    expect(signingCodeSubject(base)).toBe('482915 is your code to sign with One Stop Solutions');
    const { text } = await renderSigningCode(base);
    expect(text).toContain('482915');
    expect(text).toContain('It works for 10 minutes.');
    expect(text).toContain('Proposal for Example Kite & Co');
  });

  it('escapes the title, and has no exclamation marks', async () => {
    const { html, text } = await renderSigningCode({ ...base, title: '<b>Hi</b>' });
    expect(html).not.toContain('<b>Hi</b>');
    expect(text).not.toContain('!');
  });
});
