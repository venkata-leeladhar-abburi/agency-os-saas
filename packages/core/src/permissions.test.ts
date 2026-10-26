import { describe, expect, it } from 'vitest';
import { can, PERMISSIONS, permissionRows, ROLES, scopeOf } from './permissions';
import { initialsPrefix, inviteExpiry, slugify, workspaceDefaults } from './workspace';

describe('permissions', () => {
  it('gives owners everything', () => {
    for (const p of PERMISSIONS) expect(can('owner', p)).toBe(true);
  });
  it('keeps billing and invoice deletion from admins', () => {
    expect(can('admin', 'billing.manage')).toBe(false);
    expect(can('admin', 'invoices.delete')).toBe(false);
    expect(can('admin', 'members.write')).toBe(true);
  });
  it('limits project leads and members to their own records', () => {
    expect(scopeOf('project_lead', 'projects.write')).toBe('own');
    expect(can('project_lead', 'projects.write')).toBe(false);
    expect(can('project_lead', 'projects.write', true)).toBe(true);
    expect(can('member', 'leads.read')).toBe(false);
    expect(can('member', 'tasks.write', true)).toBe(true);
  });
  it('lets finance handle money but not leads', () => {
    expect(can('finance', 'invoices.write')).toBe(true);
    expect(can('finance', 'dashboard.money')).toBe(true);
    expect(can('finance', 'leads.write')).toBe(false);
  });
  it('produces one row per granted permission', () => {
    const rows = permissionRows();
    expect(rows.filter((r) => r.role === 'owner')).toHaveLength(PERMISSIONS.length);
    expect(new Set(rows.map((r) => r.role))).toEqual(new Set(ROLES));
  });
});

describe('workspace defaults', () => {
  it('sets India to INR, en-IN and IST', () => {
    expect(workspaceDefaults('in')).toEqual({
      currency: 'INR',
      locale: 'en-IN',
      timeZone: 'Asia/Kolkata',
    });
    expect(workspaceDefaults('GB').currency).toBe('GBP');
    expect(() => workspaceDefaults('ZZ')).toThrow('No defaults');
  });
  it('makes slugs and prefixes', () => {
    expect(slugify('One Stop Solutions')).toBe('one-stop-solutions');
    expect(slugify('Kite & Co')).toBe('kite-and-co');
    expect(slugify('Café Déjà')).toBe('cafe-deja');
    expect(slugify('!!!')).toBe('workspace');
    expect(slugify('a'.repeat(60))).toHaveLength(48);
    expect(initialsPrefix('One Stop Solutions')).toBe('OSS');
    expect(initialsPrefix('---')).toBe('INV');
  });
  it('expires invites after 7 days', () => {
    expect(inviteExpiry(new Date('2026-10-26T00:00:00Z')).toISOString()).toBe(
      '2026-11-02T00:00:00.000Z',
    );
  });
});
