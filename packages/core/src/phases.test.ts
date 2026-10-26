import { describe, expect, it } from 'vitest';
import { BLANK_TEMPLATE, projectProgress, SEVEN_PHASES, validateTemplate } from './phases';

describe('phase templates', () => {
  it('has the seven phases with their gates', () => {
    expect(SEVEN_PHASES.phases.map((p) => p.name)).toEqual([
      'Connect',
      'Discover',
      'Define',
      'Design',
      'Build',
      'Launch',
      'Grow',
    ]);
    expect(SEVEN_PHASES.phases.map((p) => p.gate?.title ?? null)).toEqual([
      'Proposal accepted',
      null,
      'Strategy and scope sign-off',
      'Design sign-off',
      'Acceptance testing sign-off',
      'Handover accepted',
      null,
    ]);
    expect(SEVEN_PHASES.phases.flatMap((p) => p.checklist)).toHaveLength(47);
    expect(BLANK_TEMPLATE.phases).toHaveLength(1);
  });

  it('checks a saved template', () => {
    expect(validateTemplate({ name: 'Mine', phases: SEVEN_PHASES.phases })).toEqual([]);
    expect(validateTemplate({ name: ' ', phases: [] })).toEqual([
      'Give the template a name.',
      'Add at least one phase.',
    ]);
    expect(
      validateTemplate({
        name: 'X',
        phases: [
          { name: '', clientLine: '', checklist: [], deliverables: [], gate: null },
          {
            name: 'Review',
            clientLine: '',
            checklist: [],
            deliverables: [],
            gate: { title: '', approver: 'client' },
          },
          {
            name: '',
            clientLine: '',
            checklist: [],
            deliverables: [],
            gate: { title: '', approver: 'internal' },
          },
        ],
      }),
    ).toEqual([
      'Phase 1 needs a name.',
      'The gate in Review needs a title.',
      'Phase 3 needs a name.',
      'The gate in phase 3 needs a title.',
    ]);
  });
});

describe('project progress', () => {
  it('counts done checklist items in phases that aren’t skipped', () => {
    expect(
      projectProgress([
        { skipped: false, checklistDone: 7, checklistTotal: 7 },
        { skipped: true, checklistDone: 0, checklistTotal: 7 },
        { skipped: false, checklistDone: 1, checklistTotal: 5 },
      ]),
    ).toBe(66);
    expect(projectProgress([])).toBe(0);
    expect(projectProgress([{ skipped: false, checklistDone: 0, checklistTotal: 0 }])).toBe(0);
  });
});
