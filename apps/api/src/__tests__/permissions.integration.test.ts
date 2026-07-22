// apps/api/src/__tests__/permissions.integration.test.ts
// Phase 4: SOM (Scoped Object Model) permission enforcement end-to-end.
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { app } from '../server.js';
import { signToken } from '../auth.js';
import { prisma } from '../crud.js';

const TENANT = '00000000-0000-0000-0000-0000000000p4';
const admin = { uid: 'p4-admin', tenantId: TENANT, role: 'network', permissions: ['role_superadmin'], status: 'active' } as any;
const adminToken = signToken(admin);
const auth = (t: string) => ({ authorization: `Bearer ${t}` });

beforeAll(async () => {
  process.env.DATABASE_URL = 'postgresql://lakshya:lakshya_pass@localhost:5432/lakshya?schema=public';
  try { execSync('npx prisma migrate deploy', { cwd: __dirname + '/../..', stdio: 'ignore' }); } catch {}
  await app.ready();
}, 60000);
afterAll(async () => { await app.close(); });

describe('Phase 4 — SOM permissions', () => {
  it('superadmin can create a Role with SOM triples', async () => {
    const key = 'editor-' + randomUUID().slice(0, 6);
    const res = await app.inject({ method: 'POST', url: '/api/role', headers: auth(adminToken), payload: {
      key, name: 'Editor-' + randomUUID().slice(0, 6), status: 'active',
      soms: [{ object: 'topic', mode: 'view' }, { object: 'topic', mode: 'create' }, { object: 'topic', mode: 'edit' }],
    } });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.key).toBe(key);
    // role is visible in nav
    const nav = await app.inject({ method: 'GET', url: '/api/meta/nav', headers: auth(adminToken) });
    expect(nav.json().data.find((s: any) => s.group === 'Access Control')).toBeDefined();
  });

  it('a user with editor Role can create a topic but a viewer-only user cannot', async () => {
    // create the editor role
    const roleKey = 'ed-' + randomUUID().slice(0, 6);
    const role = await app.inject({ method: 'POST', url: '/api/role', headers: auth(adminToken), payload: {
      key: roleKey, name: 'Ed-' + randomUUID().slice(0, 6), status: 'active',
      soms: [{ object: 'topic', mode: 'view' }, { object: 'topic', mode: 'create' }],
    } });
    const roleId = role.json().data.id;

    // a viewer role (view only)
    const vKey = 'vw-' + randomUUID().slice(0, 6);
    const vrole = await app.inject({ method: 'POST', url: '/api/role', headers: auth(adminToken), payload: {
      key: vKey, name: 'Vw-' + randomUUID().slice(0, 6), status: 'active', soms: [{ object: 'topic', mode: 'view' }],
    } });
    const vRoleId = vrole.json().data.id;

    // create a user (editor) + link to editor role
    const uEmail = 'ed-' + randomUUID().slice(0, 6) + '@x.io';
    const editorUser = await app.inject({ method: 'POST', url: '/api/user', headers: auth(adminToken), payload: {
      email: uEmail, name: 'Ed-' + randomUUID().slice(0, 6), role: 'network', status: 'active',
    } });
    const editorUid = editorUser.json().data.id;
    await prisma.userRole.create({ data: { tenantId: TENANT, userId: editorUid, roleId } });

    // create a viewer user
    const vEmail = 'vw-' + randomUUID().slice(0, 6) + '@x.io';
    const viewerUser = await app.inject({ method: 'POST', url: '/api/user', headers: auth(adminToken), payload: {
      email: vEmail, name: 'Vw-' + randomUUID().slice(0, 6), role: 'network', status: 'active',
    } });
    const viewerUid = viewerUser.json().data.id;
    await prisma.userRole.create({ data: { tenantId: TENANT, userId: viewerUid, roleId: vRoleId } });

    const edToken = signToken({ uid: editorUid, tenantId: TENANT, role: 'network', permissions: [], status: 'active' } as any);
    const vwToken = signToken({ uid: viewerUid, tenantId: TENANT, role: 'network', permissions: [], status: 'active' } as any);

    // editor can list + create
    expect((await app.inject({ method: 'GET', url: '/api/topic', headers: auth(edToken) })).statusCode).toBe(200);
    const create = await app.inject({ method: 'POST', url: '/api/topic', headers: auth(edToken), payload: { name: 'T-' + randomUUID().slice(0,6), status: 'active' } });
    expect(create.statusCode).toBe(201);

    // viewer can list but CANNOT create (no topic:create SOM)
    expect((await app.inject({ method: 'GET', url: '/api/topic', headers: auth(vwToken) })).statusCode).toBe(200);
    const deny = await app.inject({ method: 'POST', url: '/api/topic', headers: auth(vwToken), payload: { name: 'T-' + randomUUID().slice(0,6), status: 'active' } });
    expect(deny.statusCode).toBe(403);
  });

  it('a user without any SOM for a resource is denied (role gate + SOM gate)', async () => {
    const uEmail = 'no-' + randomUUID().slice(0, 6) + '@x.io';
    const u = await app.inject({ method: 'POST', url: '/api/user', headers: auth(adminToken), payload: { email: uEmail, name: 'No-' + randomUUID().slice(0, 6), role: 'network', status: 'active' } });
    const uid = u.json().data.id;
    const token = signToken({ uid, tenantId: TENANT, role: 'network', permissions: [], status: 'active' } as any);
    const res = await app.inject({ method: 'GET', url: '/api/topic', headers: auth(token) });
    expect(res.statusCode).toBe(403); // no topic:view SOM
  });
});
