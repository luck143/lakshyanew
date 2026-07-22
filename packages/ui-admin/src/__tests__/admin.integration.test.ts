// packages/ui-admin/src/__tests__/admin.integration.test.ts
// Proves the dynamic-admin loop against the live API (shared Docker Postgres):
//   GET /api/meta/:resource  ->  buildView()  ->  CRUD via API (app.inject)
// No per-resource admin code is written; the generic renderer drives everything.

import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { app } from '@lakshya/api/src/server.js';
import { signToken } from '@lakshya/api/src/auth.js';
import { buildView } from '../view.js';

const TENANT = '00000000-0000-0000-0000-0000000000t0';
const token = signToken({ uid: 'a', tenantId: TENANT, role: 'network', permissions: ['role_superadmin'], status: 'active' } as any);
const auth = { authorization: `Bearer ${token}` };

beforeAll(async () => {
  process.env.DATABASE_URL = 'postgresql://lakshya:lakshya_pass@localhost:5432/lakshya?schema=public';
  try {
    execSync('npx prisma migrate deploy', { cwd: new URL('../../apps/api', import.meta.url).pathname, stdio: 'ignore' });
  } catch {
    /* DB already migrated by the api suite */
  }
  await app.ready();
}, 60000);

afterAll(async () => { await app.close(); });

function inj(method: string, url: string, payload?: any) {
  return app.inject({ method, url, headers: auth, payload });
}

describe('admin dynamic loop (metadata -> view-model -> CRUD)', () => {
  it('builds a view-model from /api/meta/topic with zero per-resource code', async () => {
    const metaRes = await inj('GET', '/api/meta/topic');
    const view = buildView(metaRes.json().data);
    expect(view.columns.map((c) => c.key)).toEqual(expect.arrayContaining(['name', 'status']));
    expect(view.formFields.map((f) => f.key)).toEqual(expect.arrayContaining(['name', 'status']));
    expect(view.filterFields.map((f) => f.key)).toEqual(expect.arrayContaining(['status']));
  });

  it('builds a view-model for blogpost (different shape, same generic code)', async () => {
    const metaRes = await inj('GET', '/api/meta/blogpost');
    const view = buildView(metaRes.json().data);
    expect(view.columns.map((c) => c.key)).toEqual(expect.arrayContaining(['title', 'status']));
    const status = view.formFields.find((f) => f.key === 'status')!;
    expect(status.type).toBe('select');
    expect(status.options).toEqual({ draft: 'Draft', published: 'Published', archived: 'Archived' });
  });

  it('full CRUD via the generic API, driven by the same metadata', async () => {
    const name = 'AdminLoop-' + randomUUID().slice(0, 6);
    const created = await inj('POST', '/api/topic', { name, status: 'active' });
    expect(created.statusCode).toBe(201);
    const id = created.json().data.id;

    const patched = await inj('PATCH', `/api/topic/${id}`, { status: 'hidden' });
    expect(patched.json().data.status).toBe('hidden');

    const got = await inj('GET', `/api/topic/${id}`);
    expect(got.json().data.id).toBe(id);

    const del = await inj('DELETE', `/api/topic/${id}`);
    expect(del.json().status).toBe(1);
  });
});
