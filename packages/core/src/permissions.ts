// packages/core/src/permissions.ts
// SOM — Scoped Object Model. The old system's permission primitive:
//   every grant is a triple { object, mode, scope }.
// Effective user permissions = (own users_modules_som) ∪ (role.users_modules_roles_som),
// and a grant is only honoured if (object, mode) is in the master `modules_access` config.
// Mirrors: is_permission() + modules_access + users_modules_som + users_modules_roles_som.

export type RowScope = 'global' | 'tenant' | 'self' | 'none';
export type Mode = 'view' | 'create' | 'edit' | 'delete' | 'publish' | 'manage';

export interface SOM {
  object: string;          // resource/module name, e.g. "topic", "blogpost", "network_users"
  mode: Mode;              // action
  scope?: RowScope;           // row-level scope; defaults to "tenant"
}

export interface PermissionInput {
  soms: SOM[];                       // user's own + role-derived SOMs
  modulesAccess: SOM[];              // master allowed (object, mode) pairs from config
  isSuperadmin?: boolean;
  role?: string;
}

const DEFAULT_SCOPE: RowScope = 'tenant';

export function normalizeSom(s: SOM): Required<SOM> {
  return { object: s.object, mode: s.mode, scope: s.scope ?? DEFAULT_SCOPE };
}

// Master list allows this (object, mode)?
export function configAllows(modulesAccess: SOM[], object: string, mode: Mode): boolean {
  return modulesAccess.some((m) => m.object === object && m.mode === mode);
}

// Does the user hold a SOM for (object, mode)?
export function hasSom(soms: SOM[], object: string, mode: Mode): boolean {
  return soms.some((s) => s.object === object && s.mode === mode);
}

// Core check. Superadmin bypasses everything. Otherwise the grant must exist AND
// be permitted by the master config.
export function can(
  ctx: PermissionInput,
  object: string,
  mode: Mode,
): boolean {
  if (ctx.isSuperadmin) return true;
  if (!configAllows(ctx.modulesAccess, object, mode)) return false;
  return hasSom(ctx.soms, object, mode);
}

// Row-level scope for a (object, mode): drives the WHERE clause.
//   self   -> filter by owner id (caller supplies uid)
//   tenant -> filter by tenantId
//   global -> no filter
//   none   -> deny (no rows)
export function scopeFor(ctx: PermissionInput, object: string, mode: Mode): RowScope {
  if (ctx.isSuperadmin) return 'tenant'; // tenant-scoped by default (ADR-002); global only via an explicit global-scope SOM
  const hit = ctx.soms.find((s) => s.object === object && s.mode === mode);
  if (!hit) return 'none';
  return hit.scope ?? DEFAULT_SCOPE;
}

// Merge a user's own SOMs with role-derived SOMs (role SOMs win on conflict
// only by union — duplicates are harmless for the set semantics used above).
export function effectiveSoms(userSoms: SOM[], roleSoms: SOM[][]): SOM[] {
  const out = [...userSoms];
  for (const rs of roleSoms) out.push(...rs);
  return out;
}

// Derive a flat permission string[] from SOMs (legacy compatibility / JWT `permissions`).
export function somsToFlat(soms: SOM[]): string[] {
  return soms.map((s) => `${s.object}:${s.mode}`);
}
