import { describe, expect, it } from 'vitest';
import { resolveAppUrl } from './app-url';

describe('resolveAppUrl', () => {
  it('prefers NEXT_PUBLIC_APP_URL and drops a trailing slash', () => {
    expect(
      resolveAppUrl({ NEXT_PUBLIC_APP_URL: 'https://app.example.in/', VERCEL_URL: 'x.vercel.app' }),
    ).toBe('https://app.example.in');
  });
  it("uses the deployment's own address on a preview", () => {
    expect(resolveAppUrl({ VERCEL_URL: 'agency-os-git-feature.vercel.app' })).toBe(
      'https://agency-os-git-feature.vercel.app',
    );
  });
  it('is empty when nothing is set, and ignores blank values', () => {
    expect(resolveAppUrl({})).toBe('');
    expect(resolveAppUrl({ NEXT_PUBLIC_APP_URL: '  ', VERCEL_URL: '' })).toBe('');
  });
});
