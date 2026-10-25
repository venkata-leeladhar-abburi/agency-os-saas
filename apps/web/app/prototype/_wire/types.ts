import type { ReactNode } from 'react';
import type { Role } from './nav';

/** Standard states every screen designs, plus screen-specific ones such as "signed". */
export type StateId = 'default' | 'loading' | 'empty' | 'error' | 'no-access' | (string & {});

export type ScreenProps = { state: StateId };

export type ScreenDef = {
  id: string;
  slug: string;
  name: string;
  release: 'R0' | 'R1';
  priority: 'P1' | 'P2';
  who: string;
  /** app: sidebar and top bar; portal: client portal; bare: public and sign-in pages. */
  frame: 'app' | 'portal' | 'bare';
  role?: Role;
  active?: string;
  crumbs?: string[];
  /** The page owns the primary action, so the top bar's New is secondary. */
  pagePrimary?: boolean;
  states: { id: StateId; label: string }[];
  /** What the screen is for and its primary action, shown in the prototype index. */
  purpose: string;
  render: (props: ScreenProps) => ReactNode;
};

export const STANDARD = [
  { id: 'default', label: 'Default' },
  { id: 'loading', label: 'Loading' },
  { id: 'empty', label: 'Empty' },
  { id: 'error', label: 'Error' },
  { id: 'no-access', label: 'No access' },
];

export const NO_EMPTY = STANDARD.filter((s) => s.id !== 'empty');
export const PUBLIC = STANDARD.filter((s) => s.id !== 'empty' && s.id !== 'no-access');
