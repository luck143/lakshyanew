// apps/api/src/__tests__/topic.integration.test.ts
// End-to-end Phase 0 test: auth -> create -> validate -> list -> get -> update
// -> delete, plus metadata endpoint. Runs against the real Docker Postgres.

import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { app } from '../server.js';
import { signToken } from '../auth.js';

const TENANT_ID = '00000000-0000-0000-0000-0000000000t0';
const admin = {
  uid: 'admin-1',
  tenantId: TENANT_ID,
  role: 'network',
  permissions: ['role_superadmin'],
  status: 'active',
};
const token = signToken(admin as any);
const auth = { authorization: `Bearer ${token}` };

beforeAll(async () => {
  // apply migrations to the docker postgres
  process.env.DATABASE_URL =
    'postgresql://lakshya:lakshya_pass@localhost:5432/lakshya?schema=public';
  execSync('npx prisma migrate deploy', { cwd: __dirname + '/../..', stdio: 'ignore' });
  await app.ready();
}, 60000);

afterAll(async () => {
  await app.close();
});

describe('Phase 0 Topic API (metadata-driven)', () => {
  let createdId: string;

  it('GET /api/meta lists registered resources', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/meta', headers: auth });
    expect(res.json().status).toBe(1);
    expect(res.json().data).toEqual(expect.arrayContaining(['topic', 'user', 'tenant']));
  });

  it('GET /api/meta/topic returns admin schema (columns/filters)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/meta/topic', headers: auth });
    const body = res.json();
    expect(body.status).toBe(1);
    expect(body.data.name).toBe('topic');
    expect(body.data.listView.columns).toEqual(
      expect.objectContaining({ name: 'Name', status: 'Status' }),
    );
    expect(body.data.listView.filters).toEqual(
      expect.objectContaining({ status: 'Status' }),
    );
    // generated id must NOT be in create fields
    expect(body.data.fields.create['id']).toBeUndefined();
    expect(body.data.fields.create['name'].required).toBe(true);
  });

  it('POST /api/topic rejects invalid body (validation)', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/topic', headers: auth,
      payload: { status: 'active' }, // missing required name
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().status).toBe(0);
  });

  it('POST /api/topic rejects unknown field (strict schema)', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/topic', headers: auth,
      payload: { name: 'Algebra', hacker: true },
    });
    expect(res.statusCode).toBe(422);
  });

  it('POST /api/topic creates a topic', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/topic', headers: auth,
      payload: { name: 'Algebra ' + randomUUID().slice(0, 8), status: 'active', content: '<p>x</p>' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.status).toBe(1);
    expect(body.data.id).toBeDefined();
    expect(body.data.tenantId).toBe(TENANT_ID);
    createdId = body.data.id;
  });

  it('POST /api/topic rejects duplicate name (unique guard)', async () => {
    const name = 'DupTopic' + randomUUID().slice(0, 6);
    await app.inject({ method: 'POST', url: '/api/topic', headers: auth, payload: { name } });
    const res = await app.inject({ method: 'POST', url: '/api/topic', headers: auth, payload: { name } });
    expect(res.statusCode).toBe(409);
  });

  it('GET /api/topic/:id returns the created row', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/topic/${createdId}`, headers: auth });
    expect(res.json().data.name).toBeTruthy();
    expect(res.json().data.id).toBe(createdId);
  });

  it('PATCH /api/topic/:id updates it', async () => {
    const res = await app.inject({
      method: 'PATCH', url: `/api/topic/${createdId}`, headers: auth,
      payload: { status: 'hidden' },
    });
    expect(res.json().data.status).toBe('hidden');
  });

  it('GET /api/topic lists with tenant filter (no cross-tenant leak)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/topic?limit=10', headers: auth });
    const body = res.json();
    expect(body.status).toBe(1);
    expect(Array.isArray(body.data.data)).toBe(true);
    // every row belongs to our tenant
    for (const row of body.data.data) expect(row.tenantId).toBe(TENANT_ID);
  });

  it('rejects requests without token (401)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/topic' });
    expect(res.statusCode).toBe(401);
  });

  it('DELETE /api/topic/:id removes it', async () => {
    const res = await app.inject({ method: 'DELETE', url: `/api/topic/${createdId}`, headers: auth });
    expect(res.json().status).toBe(1);
    const get = await app.inject({ method: 'GET', url: `/api/topic/${createdId}`, headers: auth });
    expect(get.statusCode).toBe(404);
  });

  it('GET /health works', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.json().data.ok).toBe(true);
  });
});
