/**
 * Roles and permissions from docs/02-product/information-architecture.md (R0/R1).
 * This matrix is the source of truth: the database's role_permissions table is seeded from it,
 * and a test checks the two agree.
 */

export const ROLES = ['owner', 'admin', 'project_lead', 'member', 'finance', 'hr'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  project_lead: 'Project lead',
  member: 'Member',
  finance: 'Finance',
  hr: 'HR',
};

export const PERMISSIONS = [
  'workspace.manage',
  'billing.manage',
  'members.read',
  'members.write',
  'leads.read',
  'leads.write',
  'leads.delete',
  'sales_docs.read',
  'sales_docs.write',
  'clients.read',
  'clients.write',
  'clients.delete',
  'projects.read',
  'projects.write',
  'projects.delete',
  'gates.request',
  'gates.approve',
  'tasks.read',
  'tasks.write',
  'tasks.delete',
  'invoices.read',
  'invoices.write',
  'invoices.delete',
  'files.read',
  'files.write',
  'messages.read',
  'messages.write',
  'dashboard.money',
  'audit.read',
  'data.export',
  'knowledge.read',
  'knowledge.write',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** `own` limits the permission to records the member is assigned to (checked per table). */
export type Scope = 'all' | 'own';

const all = (...p: Permission[]) =>
  Object.fromEntries(p.map((x) => [x, 'all'])) as Partial<Record<Permission, Scope>>;
const own = (...p: Permission[]) =>
  Object.fromEntries(p.map((x) => [x, 'own'])) as Partial<Record<Permission, Scope>>;

export const ROLE_PERMISSIONS: Record<Role, Partial<Record<Permission, Scope>>> = {
  owner: all(...PERMISSIONS),
  admin: {
    ...all(...PERMISSIONS.filter((p) => p !== 'billing.manage' && p !== 'invoices.delete')),
  },
  project_lead: {
    ...all(
      'members.read',
      'leads.read',
      'sales_docs.read',
      'tasks.read',
      'knowledge.read',
      'knowledge.write',
    ),
    ...own(
      'clients.read',
      'projects.read',
      'projects.write',
      'gates.request',
      'tasks.write',
      'tasks.delete',
      'invoices.read',
      'files.read',
      'files.write',
      'messages.read',
      'messages.write',
    ),
  },
  member: {
    // Members add their own knowledge items and edit those (docs/02-product/knowledge-base.md).
    ...all('members.read', 'knowledge.read'),
    ...own(
      'knowledge.write',
      'clients.read',
      'projects.read',
      'tasks.read',
      'tasks.write',
      'files.read',
      'files.write',
      'messages.read',
      'messages.write',
    ),
  },
  finance: {
    ...all(
      'members.read',
      'leads.read',
      'sales_docs.read',
      'clients.read',
      'projects.read',
      'invoices.read',
      'invoices.write',
      'invoices.delete',
      'files.read',
      'dashboard.money',
      'knowledge.read',
    ),
  },
  hr: {
    ...all('members.read', 'knowledge.read'),
  },
};

/** The scope a role has for a permission, or undefined when it has none. */
export function scopeOf(role: Role, permission: Permission): Scope | undefined {
  return ROLE_PERMISSIONS[role][permission];
}

/**
 * App-level check before writing (defence in depth; RLS is the guarantee).
 * `isOwnRecord` says whether the record is assigned to the member, for `own` scopes.
 */
export function can(role: Role, permission: Permission, isOwnRecord = false): boolean {
  const scope = scopeOf(role, permission);
  return scope === 'all' || (scope === 'own' && isOwnRecord);
}

/** Every (role, permission, scope) row, for seeding the database. */
export function permissionRows(): { role: Role; permission: Permission; scope: Scope }[] {
  return ROLES.flatMap((role) =>
    (Object.entries(ROLE_PERMISSIONS[role]) as [Permission, Scope][]).map(
      ([permission, scope]) => ({ role, permission, scope }),
    ),
  );
}
