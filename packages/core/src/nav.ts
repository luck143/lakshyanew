// packages/core/src/nav.ts
// Registry-driven navigation/sidebar. Builds nav sections from resource
// definitions, filtered by the current user's role + permissions.
// Mirrors the old panel menu generation, but derived from metadata.

import { registry, type Resource, type ScopeRole } from './index.js';

export interface NavItem {
  name: string;
  label: string;
  icon?: string;
  href: string;       // e.g. /panel/network/topic
}
export interface NavSection {
  group: string;
  items: NavItem[];
}

const ROLE_SCOPE: Record<ScopeRole, keyof Resource['scopes']> = {
  network: 'admin',
  publisher: 'publisher',
  user: 'user',
  public: 'public',
};

function roleCanAccess(resource: Resource, role: ScopeRole, perms: string[]): boolean {
  const scopeKey = ROLE_SCOPE[role];
  const scope = resource.scopes[scopeKey];
  if (!scope) return false;
  const access = Array.isArray(scope.access) ? scope.access : [scope.access];
  if (!access.includes(role)) return false;
  if (scope.perm && scope.perm.length) {
    // user must hold ALL required permission flags
    if (!scope.perm.every((p) => perms.includes(p))) return false;
  }
  return true;
}

export interface NavContext {
  role: ScopeRole;
  perms?: string[];        // permission flags the user holds
  basePath?: string;       // e.g. "/panel/network" or "/panel/publisher"
}

export function buildNav(ctx: NavContext): NavSection[] {
  const perms = ctx.perms ?? [];
  const base = ctx.basePath ?? `/panel/${ctx.role}`;
  const visible = registry
    .all()
    .filter((r) => roleCanAccess(r, ctx.role, perms));

  // group by `group` (fallback: "General")
  const byGroup = new Map<string, NavItem[]>();
  for (const r of visible) {
    const g = r.group ?? 'General';
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g)!.push({
      name: r.name,
      label: r.labelPlural ?? r.label,
      icon: r.icon,
      href: `/${r.name}`,
    });
  }
  return [...byGroup.entries()].map(([group, items]) => ({ group, items }));
}

// Flat list of resource names a role may access (used by /api/meta filtering too)
export function accessibleResources(ctx: NavContext): string[] {
  return registry
    .all()
    .filter((r) => roleCanAccess(r, ctx.role, ctx.perms ?? []))
    .map((r) => r.name);
}
