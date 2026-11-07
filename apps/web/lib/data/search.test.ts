import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetExampleStore } from './example-store';
import { search } from './search';

// Example mode: the palette searches the example store in memory.
beforeAll(() => {
  vi.stubEnv('EXAMPLE_MODE', 'true');
});
afterAll(() => {
  vi.unstubAllEnvs();
});
beforeEach(() => {
  resetExampleStore();
});

describe('the command palette in example mode', () => {
  it('finds knowledge base items by title, summary and tag, with the kind and folder', async () => {
    const knowledge = async (words: string) =>
      (await search(words, 'one-stop')).filter((i) => i.kind === 'knowledge');
    expect(await knowledge('kickoff')).toEqual([
      {
        id: 'knowledge-kb-kickoff-checklist',
        kind: 'knowledge',
        label: 'Kickoff call checklist',
        meta: 'Knowledge · Checklist · Kickoff',
        href: '/w/one-stop/knowledge/kb-kickoff-checklist',
        keywords: [
          'Everything to cover in the first call after the proposal is signed.',
          'checklist',
          'onboarding',
          'calls',
        ],
      },
    ]);
    expect((await knowledge('before every launch')).map((i) => i.label)).toEqual([
      'Website launch QA',
    ]);
    expect((await knowledge('retro')).map((i) => i.label)).toEqual([
      'Learnings from the Acme Labs redesign',
    ]);
    // Your own private draft is found.
    expect((await knowledge('quiet week')).map((i) => i.meta)).toEqual([
      'Knowledge · Prompt · Prompts and AI',
    ]);
    expect(await knowledge('nothing like it')).toEqual([]);
  });
});
