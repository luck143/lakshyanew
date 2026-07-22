// apps/admin-publisher/src/__tests__/publisher.surface.test.ts
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { buildApp, type AdminSurface } from '@lakshya/admin/src/server.js';
import { signToken } from '@lakshya/api/src/auth.js';
import { app as apiApp } from '@lakshya/api/src/server.js';

process.env.DATABASE_URL = 'postgresql://lakshya:lakshya_pass@localhost:5432/lakshya?schema=public';
try { execSync('npx prisma migrate deploy', { cwd: new URL('../../apps/api', import.meta.url).pathname, stdio: 'ignore' }); } catch {}

const pubUser = { uid: 'pub-1', tenantId: '00000000-0000-0000-0000-0000000000t0', role: 'publisher', permissions: ['role_superadmin'], status: 'active' } as any;
const netUser = { uid: 'net-1', tenantId: '00000000-0000-0000-0000-0000000000t0', role: 'network', permissions: ['role_superadmin'], status: 'active' } as any;

const pubSurface: AdminSurface = { role: 'publisher', token: signToken(pubUser), title: 'Lakshya Publisher', basePath: '/panel/publisher' };
const netSurface: AdminSurface = { role: 'network', token: signToken(netUser), title: 'Lakshya Admin', basePath: '/panel/network' };

async function start(surface: AdminSurface) {
  if (!apiApp.ready) await apiApp.ready();
  return buildApp(surface);
}

describe('Phase 6 — publisher-scoped admin surface', () => {
  it('publisher surface hides network-only Access Control (Users/Roles)', async () => {
    const app = await start(pubSurface);
    const res = await app.inject({ method: 'GET', url: '/' });
    expect(res.statusCode).toBe(200);
    const body = res.body;
    expect(body).toContain('Lakshya Publisher');       // publisher title
    expect(body).not.toContain('>Users<');              // Access Control hidden
    expect(body).not.toContain('>Roles<');
    expect(body).toContain('Categories');               // e-commerce visible to publisher
    await app.close();
  });

  it('network surface shows Access Control (Users/Roles)', async () => {
    const app = await start(netSurface);
    const res = await app.inject({ method: 'GET', url: '/' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('>Users<');
    expect(res.body).toContain('>Roles<');
    await app.close();
  });

  it('publisher is denied a network-only resource via the API (scope gate)', async () => {
    const res = await apiApp.inject({ method: 'GET', url: '/api/role', headers: { authorization: `Bearer ${pubSurface.token}` } });
    expect(res.statusCode).toBe(403); // Role is network-only -> publisher denied
    const netRes = await apiApp.inject({ method: 'GET', url: '/api/role', headers: { authorization: `Bearer ${netSurface.token}` } });
    expect(netRes.statusCode).toBe(200); // network sees roles
  });
});
