// apps/api/src/auth.ts
// JWT auth (HS256, compatible with legacy tokens), RBAC, and tenant context.
// Equivalent of old saasApiHandler (jwt_decode_token, saas_validate_token)
// + apiHandler (api_access_check, is_permission, modules_access).

import jwt from 'jsonwebtoken';
import { config } from './config.js';
import type { PrismaClient } from '@prisma/client';
import { effectiveSoms, type SOM, type Mode } from '@lakshya/core';
import { MODULES_ACCESS } from './modulesAccess.js';

export interface AuthUser {
  uid: string;
  tenantId: string;
  role: string;       // network | publisher | user
  permissions: string[];
  status: string;
  email?: string;
  name?: string;
  soms?: SOM[];        // resolved effective SOMs (filled by loadEffectiveSoms)
}

export function signToken(user: AuthUser): string {
  return jwt.sign(
    {
      uid: user.uid,
      tenantId: user.tenantId,
      role: user.role,
      permissions: user.permissions,
      status: user.status,
      email: user.email,
      name: user.name,
    },
    config.jwtSecret,
    { algorithm: config.jwtAlgorithm, expiresIn: '7d' },
  );
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret, {
      algorithms: [config.jwtAlgorithm],
    }) as Record<string, any>;
    if (!decoded.uid || decoded.status !== 'active') return null;
    return {
      uid: decoded.uid,
      tenantId: decoded.tenantId,
      role: decoded.role,
      permissions: decoded.permissions ?? [],
      status: decoded.status,
      email: decoded.email,
      name: decoded.name,
    };
  } catch {
    return null;
  }
}

// Equivalent of old is_permission()
export function isPermission(user: AuthUser, required?: string | string[]): boolean {
  if (!required || (Array.isArray(required) && required.length === 0)) return true;
  const perms = Array.isArray(required) ? required : [required];
  if (user.permissions.includes('role_superadmin')) return true;
  if (perms.includes('role_admin') && user.permissions.includes('role_admin')) return true;
  return perms.some((p) => user.permissions.includes(p));
}

// Equivalent of old api_access_check()
export function checkAccess(
  user: AuthUser,
  role?: string | string[],
  perm?: string | string[],
): { ok: boolean; reason?: string } {
  if (role) {
    const roles = Array.isArray(role) ? role : [role];
    if (!roles.includes(user.role)) {
      return { ok: false, reason: 'role' };
    }
  }
  if (!isPermission(user, perm)) {
    return { ok: false, reason: 'permission' };
  }
  return { ok: true };
}

// ---- SOM (Scoped Object Model) permission layer ----

// Resolve a user's effective SOMs: own `roles` JSON ∪ all their Role memberships'
// `soms`. Mirrors users_modules_som + users_modules_roles_som.
export async function loadEffectiveSoms(prisma: PrismaClient, user: AuthUser): Promise<SOM[]> {
  const row = await prisma.user.findUnique({
    where: { id: user.uid },
    include: { roleLinks: { include: { role: true } } },
  });
  const own = (Array.isArray(row?.roles) ? row!.roles : []) as unknown as SOM[];
  const roleSoms =
    row?.roleLinks.map((l: any) => (Array.isArray(l.role.soms) ? l.role.soms : []) as SOM[]) ?? [];
  return effectiveSoms(own, roleSoms);
}

// Enforce a SOM grant for (object, mode). Returns {ok} and the resolved row scope.
// If `user.soms` is already loaded we use it; otherwise compute via prisma (if given).
export async function requireSom(
  user: AuthUser,
  object: string,
  mode: Mode,
  prisma?: PrismaClient,
): Promise<{ ok: boolean; scope: 'global' | 'tenant' | 'self' | 'none'; reason?: string }> {
  const soms = user.soms ?? (prisma ? await loadEffectiveSoms(prisma, user) : []);
  const isSuperadmin = user.permissions.includes('role_superadmin');
  const allowed =
    isSuperadmin ||
    (MODULES_ACCESS.some((m) => m.object === object && m.mode === mode) &&
      soms.some((s) => s.object === object && s.mode === mode));
  if (!allowed) return { ok: false, scope: 'none', reason: 'som' };
  if (isSuperadmin) return { ok: true, scope: 'tenant' }; // tenant-scoped by default (ADR-002); global only via an explicit global-scope SOM
  const hit = soms.find((s) => s.object === object && s.mode === mode);
  return { ok: true, scope: hit?.scope ?? 'tenant' };
}
