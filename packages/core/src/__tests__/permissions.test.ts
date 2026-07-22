// packages/core/src/__tests__/permissions.test.ts
import { describe, it, expect } from 'vitest';
import {
  can,
  scopeFor,
  effectiveSoms,
  somsToFlat,
  type SOM,
} from '../permissions.js';

const MASTER: SOM[] = [
  { object: 'topic', mode: 'view' },
  { object: 'topic', mode: 'create' },
  { object: 'topic', mode: 'edit' },
  { object: 'blogpost', mode: 'view' },
  { object: 'network_users', mode: 'manage' },
];

describe('SOM permission engine', () => {
  it('superadmin bypasses everything', () => {
    expect(can({ soms: [], modulesAccess: MASTER, isSuperadmin: true }, 'secret', 'delete')).toBe(true);
    expect(scopeFor({ soms: [], modulesAccess: MASTER, isSuperadmin: true }, 'secret', 'delete')).toBe('tenant');
  });

  it('denies an (object, mode) not in master config even if SOM present', () => {
    const soms: SOM[] = [{ object: 'nope', mode: 'view' }];
    expect(can({ soms, modulesAccess: MASTER }, 'nope', 'view')).toBe(false);
  });

  it('grants when SOM present and allowed by master', () => {
    const soms: SOM[] = [{ object: 'topic', mode: 'view' }];
    expect(can({ soms, modulesAccess: MASTER }, 'topic', 'view')).toBe(true);
    expect(can({ soms, modulesAccess: MASTER }, 'topic', 'delete')).toBe(false);
  });

  it('merges role-derived SOMs with user SOMs', () => {
    const user: SOM[] = [{ object: 'topic', mode: 'view' }];
    const role: SOM[][] = [[{ object: 'blogpost', mode: 'view' }]];
    const eff = effectiveSoms(user, role);
    const ctx = { soms: eff, modulesAccess: MASTER };
    expect(can(ctx, 'topic', 'view')).toBe(true);
    expect(can(ctx, 'blogpost', 'view')).toBe(true);
  });

  it('derives row-level scope (self/tenant/global/none)', () => {
    const soms: SOM[] = [
      { object: 'topic', mode: 'edit', scope: 'self' },
      { object: 'blogpost', mode: 'view', scope: 'tenant' },
    ];
    const ctx = { soms, modulesAccess: MASTER };
    expect(scopeFor(ctx, 'topic', 'edit')).toBe('self');
    expect(scopeFor(ctx, 'blogpost', 'view')).toBe('tenant');
    expect(scopeFor(ctx, 'topic', 'view')).toBe('none'); // not granted
  });

  it('serializes SOMs to flat permission strings', () => {
    const flat = somsToFlat([{ object: 'topic', mode: 'view' }, { object: 'blogpost', mode: 'create', scope: 'global' }]);
    expect(flat).toEqual(['topic:view', 'blogpost:create']);
  });
});
