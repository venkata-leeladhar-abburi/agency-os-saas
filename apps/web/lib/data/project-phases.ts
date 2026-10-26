import { BLANK_TEMPLATE, SEVEN_PHASES } from '@agency-os/core';

/** The phase names of a project's template. */
export function phaseNames(template: 'seven_phases' | 'blank'): string[] {
  return (template === 'seven_phases' ? SEVEN_PHASES : BLANK_TEMPLATE).phases.map((p) => p.name);
}
