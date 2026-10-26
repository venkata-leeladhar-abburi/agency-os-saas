// Server only. Helpers shared by the data modules.
import { exampleStore } from './example-store';
import type { Activity } from './types';

export const EXAMPLE_USER = { name: 'Kiran Rao', email: 'kiran@example.in' };

export const store = () => exampleStore();

export const newId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;

export const activity = (
  kind: Activity['kind'],
  text: string,
  who = EXAMPLE_USER.name,
): Activity => ({
  id: newId('a'),
  kind,
  who,
  text,
  at: new Date().toISOString(),
});
