// apps/api/src/__tests__/imgen.integration.test.ts
// Phase 14: imgen — uploading an image auto-generates a 200px webp thumbnail variant
// (sharp), recorded as a MediaVariant and served at /media/variant/:file.
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { app } from '../server.js';
import { signToken } from '../auth.js';

const TENANT = '00000000-0000-0000-0000-0000000000p14';
const admin = { uid: 'p14-admin', tenantId: TENANT, role: 'network', permissions: ['role_superadmin'], status: 'active' } as any;
const token = signToken(admin);
const auth = { authorization: `Bearer ${token}` };

async function uploadImage(): Promise<any> {
  const png = await sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 30, g: 120, b: 200 } } }).png().toBuffer();
  const res = await app.inject({ method: 'POST', url: '/api/media/upload', headers: auth, payload: { name: 'pic', mimeType: 'image/png', base64: png.toString('base64') } });
  return res;
}

beforeAll(async () => {
  process.env.DATABASE_URL = 'postgresql://lakshya:lakshya_pass@localhost:5432/lakshya?schema=public';
  try { execSync('npx prisma migrate deploy', { cwd: __dirname + '/../..', stdio: 'ignore' }); } catch {}
  await app.ready();
}, 60000);
afterAll(async () => { await app.close(); });

describe('Phase 14 — imgen media variants', () => {
  it('uploads an image and auto-creates a 200px thumbnail variant', async () => {
    const res = await uploadImage();
    expect(res.statusCode).toBe(201);
    const mediaId = res.json().data.id;
    const variants = await app.inject({ method: 'GET', url: `/api/mediavariant?filters=${encodeURIComponent(JSON.stringify({ mediaId }))}`, headers: auth });
    expect(variants.statusCode).toBe(200);
    const list = variants.json().data.data as any[];
    expect(list.length).toBe(1);
    expect(list[0].format).toBe('thumbnail');
    expect(list[0].width).toBeLessThanOrEqual(200);
    expect(list[0].height).toBeLessThanOrEqual(200);
    expect(list[0].path).toMatch(/^\/media\/variant\//);
  });

  it('serves the generated variant as webp', async () => {
    const res = await uploadImage();
    const mediaId = res.json().data.id;
    const variants = await app.inject({ method: 'GET', url: `/api/mediavariant?filters=${encodeURIComponent(JSON.stringify({ mediaId }))}`, headers: auth });
    const vpath = (variants.json().data.data as any[])[0].path; // /media/variant/<file>
    const served = await app.inject({ method: 'GET', url: vpath });
    expect(served.statusCode).toBe(200);
    expect(served.headers['content-type']).toContain('image/webp');
    expect(served.rawPayload.length).toBeGreaterThan(0);
  });

  it('non-image uploads do NOT create a variant', async () => {
    const buf = Buffer.from('hello world');
    const res = await app.inject({ method: 'POST', url: '/api/media/upload', headers: auth, payload: { name: 't', mimeType: 'text/plain', base64: buf.toString('base64') } });
    expect(res.statusCode).toBe(201);
    const mediaId = res.json().data.id;
    const variants = await app.inject({ method: 'GET', url: `/api/mediavariant?filters=${encodeURIComponent(JSON.stringify({ mediaId }))}`, headers: auth });
    expect((variants.json().data.data as any[]).length).toBe(0);
  });
});
