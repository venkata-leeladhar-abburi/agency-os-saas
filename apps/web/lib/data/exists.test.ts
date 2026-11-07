import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { recordAt, recordExists } from './exists';

describe('which record a workspace path shows', () => {
  it('reads record pages, and leaves other pages alone', () => {
    expect(recordAt('/w/acme/leads/123', 'acme')).toEqual({ kind: 'lead', id: '123' });
    expect(recordAt('/w/acme/leads/123/', 'acme')).toEqual({ kind: 'lead', id: '123' });
    expect(recordAt('/w/acme/sales/quotes/q1', 'acme')).toEqual({ kind: 'quote', id: 'q1' });
    expect(recordAt('/w/acme/sales/proposals/p1', 'acme')).toEqual({
      kind: 'proposal',
      id: 'p1',
    });
    expect(recordAt('/w/acme/knowledge/k1/edit', 'acme')).toEqual({ kind: 'knowledge', id: 'k1' });
    expect(recordAt('/w/acme/knowledge/folders/f1', 'acme')).toEqual({
      kind: 'knowledge-folder',
      id: 'f1',
    });
    for (const path of [
      '/w/acme',
      '/w/acme/leads',
      '/w/acme/leads/new',
      '/w/acme/leads/import',
      '/w/acme/knowledge/new',
      '/w/acme/knowledge/folders',
      '/w/acme/settings/members',
      '/w/acme-labs/leads/123',
      '/p/acme/projects/1',
      '',
    ])
      expect(recordAt(path, 'acme')).toBeNull();
  });
});

describe('whether the record is there, in example mode', () => {
  beforeAll(() => {
    vi.stubEnv('EXAMPLE_MODE', 'true');
  });
  afterAll(() => {
    vi.unstubAllEnvs();
  });
  it('looks in the example store', async () => {
    expect(await recordExists('lead', 'kite', 'one-stop')).toBe(true);
    expect(await recordExists('invoice', 'inv-14', 'one-stop')).toBe(true);
    expect(await recordExists('knowledge-folder', 'kb-delivery', 'one-stop')).toBe(true);
    expect(await recordExists('lead', 'nope', 'one-stop')).toBe(false);
    expect(await recordExists('client', 'kite', 'one-stop')).toBe(false);
  });
});
