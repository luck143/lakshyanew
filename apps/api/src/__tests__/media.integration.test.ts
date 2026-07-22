// apps/api/src/__tests__/media.integration.test.ts
// Phase 7: Media & File Management — upload writes a file to disk, creates a
// Media row, and the file is served back at /media/:file. Also proves the
// `media` field type is exposed in resource metadata (drives admin UI).
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { app } from '../server.js';
import { signToken } from '../auth.js';

const TENANT = '00000000-0000-0000-0000-0000000000p7';
const admin = { uid: 'p7-admin', tenantId: TENANT, role: 'network', permissions: ['role_superadmin'], status: 'active' } as any;
const token = signToken(admin);
const auth = { authorization: `Bearer ${token}` };
const inj = (m: string, u: string, p?: any) => app.inject({ method: m, url: u, headers: auth, payload: p });

const MEDIA_DIR = path.resolve(process.cwd(), 'media');

beforeAll(async () => {
  process.env.DATABASE_URL = 'postgresql://lakshya:lakshya_pass@localhost:5432/lakshya?schema=public';
  try { execSync('npx prisma migrate deploy', { cwd: __dirname + '/../..', stdio: 'ignore' }); } catch {}
  await app.ready();
}, 60000);
afterAll(async () => { await app.close(); });

describe('Phase 7 — Media & File Management', () => {
  it('uploads a file: writes to disk + creates Media row', async () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC', 'base64');
    const b64 = png.toString('base64');
    const res = await inj('POST', '/api/media/upload', { name: 'logo-' + randomUUID().slice(0, 6), mimeType: 'image/png', base64: b64 });
    expect(res.statusCode).toBe(201);
    const data = res.json().data;
    expect(data.mimeType).toBe('image/png');
    expect(data.path).toMatch(/^\/media\//);
    // file physically on disk
    const file = path.basename(data.path);
    expect(existsSync(path.join(MEDIA_DIR, file))).toBe(true);
    const onDisk = await readFile(path.join(MEDIA_DIR, file));
    expect(onDisk.length).toBe(png.length);
  });

  it('serves the uploaded file at /media/:file', async () => {
    // upload then fetch
    const png = Buffer.from('hello-media-bytes');
    const res = await inj('POST', '/api/media/upload', { name: 'doc-' + randomUUID().slice(0, 6), mimeType: 'application/octet-stream', base64: png.toString('base64') });
    const file = path.basename(res.json().data.path);
    const get = await app.inject({ method: 'GET', url: `/media/${file}` });
    expect(get.statusCode).toBe(200);
    expect(get.body).toBe('hello-media-bytes');
  });

  it('lists Media rows (generic CRUD over the Media resource)', async () => {
    const res = await inj('GET', '/api/media?limit=5');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json().data.data)).toBe(true);
  });

  it('exposes the media field type in Product metadata (drives admin UI)', async () => {
    const res = await inj('GET', '/api/meta/product');
    expect(res.json().data.fields.create.cover.type).toBe('media');
  });

  it('media nav group appears in the admin nav', async () => {
    const res = await inj('GET', '/api/meta/nav');
    const media = res.json().data.find((s: any) => s.group === 'Media');
    expect(media).toBeTruthy();
    expect(media.items.map((i: any) => i.name)).toContain('media');
  });

  it('denies upload to a user without media SOM', async () => {
    // craft a token that lacks media SOM by giving a non-superadmin role without grants
    const viewer = { uid: 'p7-view', tenantId: TENANT, role: 'network', permissions: [], status: 'active' } as any;
    const vt = signToken(viewer);
    const res = await app.inject({ method: 'POST', url: '/api/media/upload', headers: { authorization: `Bearer ${vt}` }, payload: { base64: 'AAA=' } });
    expect(res.statusCode).toBe(403);
  });
});
