// Plain data, no icons: the screen page (a server component) reads it.
export type Role = 'owner' | 'lead' | 'member' | 'finance';

/** Remembers the role picked on the home page, so the sidebar stays in that view. */
export const ROLE_COOKIE = 'prototype-role';

export function isRole(value: unknown): value is Role {
  return value === 'owner' || value === 'lead' || value === 'member' || value === 'finance';
}
