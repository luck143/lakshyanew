// apps/admin/src/__tests__/admin.render.test.ts
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { buildApp } from '../server.js';

let app: any;

beforeAll(async () => {
  process.env.DATABASE_URL = 'postgresql://lakshya:***@localhost:5432/lakshya?schema=public';
  process.env.ADMIN_TENANT = '00000000-0000-0000-0000-0000000000t0';
  try {
    execSync('npx prisma migrate deploy', { cwd: new URL('../../apps/api', import.meta.url).pathname, stdio: 'ignore' });
  } catch { /* already migrated */ }
  app = await buildApp();
  await app.ready();
}, 60000);

afterAll(async () => { if (app) await app.close(); });

describe('served admin renders metadata-driven UI over HTTP', () => {
  it('GET / shows the sidebar with a Content section', async () => {
    const res = await app.inject({ method: 'GET', url: '/' });
    expect(res.statusCode).toBe(200);
    const body = res.body;
    expect(body).toContain('Content');
    expect(body).toContain('Topics');
    expect(body).toContain('/topic');
  });

  it('GET /topic renders a table and list chrome, with advanced UI controls', async () => {
    const res = await app.inject({ method: 'GET', url: '/topic' });
    expect(res.statusCode).toBe(200);
    const body = res.body;
    expect(body).toContain('<table>');
    expect(body).toContain('Name');
    expect(body).toContain('Quick create');
    expect(body).toContain('Theme');
    expect(body).toContain('Export CSV');
  });

  it('GET /topic/:id renders an edit form with the row values', async () => {
    const { randomUUID } = await import('node:crypto');
    const { app: apiApp } = await import('@lakshya/api/src/server.js');
    const { signToken } = await import('@lakshya/api/src/auth.js');
    const token = signToken({ uid: 'a', tenantId: '00000000-0000-0000-0000-0000000000t0', role: 'network', permissions: ['role_superadmin'], status: 'active' } as any);
    const uniq = 'EditRender-' + randomUUID().slice(0, 6);
    const mk = await apiApp.inject({ method: 'POST', url: '/api/topic', headers: { authorization: `Bearer ${token}` }, payload: { name: uniq } });
    expect(mk.statusCode).toBe(201);
    const eid = mk.json().data.id;
    const res = await app.inject({ method: 'GET', url: `/topic/${eid}` });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Edit Topic');
    expect(res.body).toContain(uniq);
  });

  it('unknown resource returns 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/nope' });
    expect(res.statusCode).toBe(404);
    expect(res.body).toContain('Unknown resource');
  });

  it('GET /product renders relation metadata in list/create path', async () => {
    const { app: apiApp } = await import('@lakshya/api/src/server.js');
    const { signToken } = await import('@lakshya/api/src/auth.js');
    const token = signToken({ uid: 'a', tenantId: '00000000-0000-0000-0000-0000000000t0', role: 'network', permissions: ['role_superadmin'], status: 'active' } as any);
    const res = await app.inject({ method: 'GET', url: '/product' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('<table>');
    expect(res.body).toContain('Products');
    const metaRes = await apiApp.inject({ method: 'GET', url: '/api/meta/product', headers: { authorization: `Bearer ${token}` } });
    expect(metaRes.statusCode).toBe(200);
    const meta = metaRes.json();
    const relationFields = Object.entries(meta.data.fields?.create ?? {})
      .filter(([, v]: any) => v?.type === 'relation')
      .map(([k]) => k);
    expect(relationFields.length).toBeGreaterThan(0);
  });
});
