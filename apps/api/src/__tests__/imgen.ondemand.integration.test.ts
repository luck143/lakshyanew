// apps/api/src/__tests__/imgen.ondemand.integration.test.ts
// Phase 16: imgen on-demand variants — GET /media/:id/variant?w=&h=&f= generates (and
// caches) arbitrary resized/transcoded variants via sharp.
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { app } from '../server.js';
import { signToken } from '../auth.js';

const TENANT = '00000000-0000-0000-0000-0000000000p16';
const admin = { uid: 'p16-admin', tenantId: TENANT, role: 'network', permissions: ['role_superadmin'], status: 'active' } as any;
const token = signToken(admin);
const auth = { authorization: `Bearer ${token}` };

async function uploadImage(): Promise<string> {
  const png = await sharp({ create: { width: 1200, height: 800, channels: 3, background: { r: 10, g: 200, b: 90 } } }).png().toBuffer();
  const res = await app.inject({ method: 'POST', url: '/api/media/upload', headers: auth, payload: { name: 'big', mimeType: 'image/png', base64: png.toString('base64') } });
  return res.json().data.id;
}

beforeAll(async () => {
  process.env.DATABASE_URL = 'postgresql://lakshya:lakshya_pass@localhost:5432/lakshya?schema=public';
  try { execSync('npx prisma migrate deploy', { cwd: __dirname + '/../..', stdio: 'ignore' }); } catch {}
  await app.ready();
}, 60000);
afterAll(async () => { await app.close(); });

describe('Phase 16 — imgen on-demand variants', () => {
  it('generates a 400px webp variant on demand and serves it', async () => {
    const id = await uploadImage();
    const v = await app.inject({ method: 'GET', url: `/media/${id}/variant?w=400&f=webp` });
    expect(v.statusCode).toBe(200);
    expect(v.headers['content-type']).toContain('image/webp');
    const meta = await sharp(v.rawPayload).metadata();
    expect(meta.width).toBe(400);
    const variants = await app.inject({ method: 'GET', url: `/api/mediavariant?filters=${encodeURIComponent(JSON.stringify({ mediaId: id }))}`, headers: auth });
    const fmts = (variants.json().data.data as any[]).map((x) => x.format);
    expect(fmts).toContain('400x_-webp');
  });

  it('supports avif output', async () => {
    const id = await uploadImage();
    const v = await app.inject({ method: 'GET', url: `/media/${id}/variant?w=300&f=avif` });
    expect(v.statusCode).toBe(200);
    expect(v.headers['content-type']).toContain('image/avif');
  });

  it('caches variants: repeat request does not create a second variant row', async () => {
    const id = await uploadImage();
    await app.inject({ method: 'GET', url: `/media/${id}/variant?w=250&f=webp` });
    const before = (await app.inject({ method: 'GET', url: `/api/mediavariant?filters=${encodeURIComponent(JSON.stringify({ mediaId: id }))}`, headers: auth })).json().data.data.length;
    // re-request same signature -> should serve cached, no new row
    const v2 = await app.inject({ method: 'GET', url: `/media/${id}/variant?w=250&f=webp` });
    expect(v2.statusCode).toBe(200);
    const after = (await app.inject({ method: 'GET', url: `/api/mediavariant?filters=${encodeURIComponent(JSON.stringify({ mediaId: id }))}`, headers: auth })).json().data.data.length;
    expect(after).toBe(before);
  });
});
