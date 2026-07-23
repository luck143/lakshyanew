// apps/api/src/server.ts
// Fastify API server. Generic CRUD routes driven by @lakshya/core registry.
// Response envelope preserves legacy {status,data,message} (ADR-003).
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { registry, adminMeta, accessibleResources, buildNav, type ScopeRole } from '@lakshya/core';
import { config } from './config.js';
import { verifyToken, checkAccess, requireSom, signToken, type AuthUser } from './auth.js';
import {
  createResource,
  updateResource,
  getResource,
  listResource,
  deleteResource,
  publicList,
  publicGet,
  ApiError,
  prisma,
} from './crud.js';
import {
  createGuestCart,
  getGuestCart,
  addGuestCartItem,
  removeGuestCartItem,
  checkoutGuestCart,
} from './guestCart.js';
import { authorizePayment } from './payments.js';
import './resources.js'; // registers resources
import { loadBuilderResources, listBuilderResources, getBuilderResource, createBuilderResource, deleteBuilderResource, dropBuilderTable } from './builder-store.js';

const app = Fastify({ logger: false });

// CORS for webstore cross-origin auth cookies
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
await app.register(cors, {
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant', 'X-Request-Id'],
});

// Register cookie parser for auth routes
await app.register(cookie, {
  secret: config.jwtSecret,
  hook: 'onRequest',
});

// Media storage root (Phase 7). Files written here, served at /media/*
const MEDIA_DIR = path.resolve(process.cwd(), 'media');
if (!existsSync(MEDIA_DIR)) await mkdir(MEDIA_DIR, { recursive: true });

// ---- Security & observability (Phase 21) ----
// Assign a request id, set baseline security headers, and emit a structured access log.
const { logEvent } = (() => {
  try { return require('@lakshya/logger'); } catch { return { logEvent: () => {} }; }
})();
app.addHook('onRequest', async (req) => {
  (req as any).id = (req.headers['x-request-id'] as string) || randomUUID();
});
app.addHook('onResponse', async (req, reply) => {
  const rt = (reply as any).elapsedTime ?? 0;
  try {
    logEvent('api_request', {
      rid: (req as any).id,
      method: req.method,
      url: req.url,
      status: reply.statusCode,
      ms: Math.round(rt),
      tenant: (req.headers['x-tenant'] as string) || '',
      ip: req.ip,
    });
  } catch { /* logging must never break requests */ }
});
app.addHook('onSend', async (_req, reply) => {
  reply.header('x-request-id', (_req as any).id);
  reply.header('x-content-type-options', 'nosniff');
  reply.header('referrer-policy', 'no-referrer');
  reply.header('permissions-policy', 'geolocation=(), camera=(), microphone=()');
});

// ---- Auth pre-handler ----
app.addHook('preHandler', async (req, _reply) => {
  const auth = req.headers['authorization'];
  if (auth && auth.startsWith('Bearer ')) {
    const token = auth.slice(7);
    const user = verifyToken(token);
    if (user) (req as any).user = user;
  }
  // Keep builder resources (persisted in DB) live without restart.
  // Throttled via TTL cache inside loadBuilderResources().
  if ((req as any).url?.startsWith('/api/')) {
    try { await loadBuilderResources(); } catch { /* non-fatal */ }
  }
});

function getUser(req: any): AuthUser {
  const user = req.user as AuthUser | undefined;
  if (!user) throw new ApiError(401, 'Invalid or missing token');
  return user;
}

// resolve scope for a resource+op; default admin
function scopeFor(role: ScopeRole | undefined): ScopeRole {
  return role ?? 'network';
}

// ---- Generic CRUD routes ----
// Boot: load any Resource-Builder definitions from the DB into the
// registry so they are live immediately (no restart, no Prisma regen).
loadBuilderResources()
  .then((n) => { if (n) console.log(`[builder] loaded ${n} resource(s) from store`); })
  .catch((e) => console.warn('[builder] boot load failed:', e?.message));

const crudOps = ['list', 'get', 'create', 'update', 'delete'] as const;

async function requireScope(resourceName: string, op: (typeof crudOps)[number], req: any): Promise<AuthUser> {
  const resource = registry.get(resourceName)!;
  // A publisher user resolves the publisher scope when one is declared;
  // network users (and publisher resources without a publisher scope) use admin.
  const user = getUser(req);
  const scopeKey: 'admin' | 'publisher' =
    user.role === 'publisher' && resource.scopes.publisher ? 'publisher' : 'admin';
  const scope = resource.scopes[scopeKey] ?? resource.scopes.admin ?? resource.scopes.publisher;
  const access = checkAccess(user, scope?.access, scope?.perm);
  if (!access.ok) {
    throw new ApiError(403, access.reason === 'role' ? 'Forbidden: role' : 'Forbidden: permission');
  }
  // SOM (Scoped Object Model) fine-grained gate: enforce (object=resource, mode=op).
  const mode = op === 'list' || op === 'get' ? 'view' : op === 'create' ? 'create' : op === 'update' ? 'edit' : 'delete';
  const som = await requireSom(user, resourceName, mode as any, prisma);
  if (!som.ok) throw new ApiError(403, 'Forbidden: insufficient SOM permission');
  (user as any).rowScope = som.scope; // global | tenant | self
  return user;
}

// LIST  GET /api/:resource
app.get('/api/:resource', async (req, reply) => {
  const { resource } = req.params as any;
  if (!registry.get(resource)) return reply.code(404).send({ status: 0, data: null, message: 'Unknown resource' });
  const user = await requireScope(resource, 'list', req);
  const q = req.query as any;
  const result = await listResource(resource, {
    page: q.page,
    limit: q.limit,
    sortby: q.sortby,
    sortorder: q.sortorder,
    q: typeof q.q === 'string' ? q.q.trim() : undefined,
    filters: q.filters ? JSON.parse(q.filters) : undefined,
    ...(Array.isArray(q.filterRules) ||
    (typeof q.filterRules === 'string' && q.filterRules.trim().length > 0)
      ? { filterRules: typeof q.filterRules === 'string' ? JSON.parse(q.filterRules) : q.filterRules }
      : {}),
  }, user);
  return reply.send({ status: 1, data: result, message: 'ok' });
});

// GET /api/meta  -> list of accessible resources (role-filtered)
app.get('/api/meta', async (req, reply) => {
  const user = getUser(req);
  const role: ScopeRole = (user?.role as ScopeRole) ?? 'network';
  const names = accessibleResources({ role, perms: user?.permissions ?? [] });
  return reply.send({ status: 1, data: names, message: 'ok' });
});

// GET /api/meta/nav -> sidebar sections (role-filtered, registry-driven)
app.get('/api/meta/nav', async (req, reply) => {
  const user = getUser(req);
  const role: ScopeRole = (user?.role as ScopeRole) ?? 'network';
  const sections = buildNav({ role, perms: user?.permissions ?? [], basePath: `/panel/${role}` });
  return reply.send({ status: 1, data: sections, message: 'ok' });
});

// ---- Auth routes (Phase 22): login, register, logout, me ----

// POST /auth/register — create a new user (role=user)
app.post('/auth/register', async (req, reply) => {
  const { email, password, name } = req.body as any;
  if (!email || !password) throw new ApiError(422, 'email and password required');

  const existing = await prisma.user.findFirst({ where: { email } });
  if (existing) throw new ApiError(409, 'email already registered');

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hashed,
      name: name || undefined,
      role: 'user',
      status: 'active',
      tenantId: process.env.DEFAULT_TENANT || 'default',
      roles: [], // SOM triples
    },
  });

  // JWT token with user context
  const token = signToken({
    uid: user.id,
    email: user.email ?? undefined,
    name: user.name ?? undefined,
    role: user.role,
    permissions: [],
    status: user.status,
    tenantId: user.tenantId,
  });

  // Set httpOnly cookie
  reply.setCookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  });

  return reply.send({ status: 1, data: { uid: user.id, email: user.email, name: user.name }, message: 'Registered' });
});

// POST /auth/login — authenticate user, set cookie
app.post('/auth/login', async (req, reply) => {
  const { email, password } = req.body as any;
  if (!email || !password) throw new ApiError(422, 'email and password required');

  const user = await prisma.user.findFirst({ where: { email } });
  if (!user) throw new ApiError(401, 'invalid credentials');

  if (!user.passwordHash) throw new ApiError(401, 'invalid credentials');

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) throw new ApiError(401, 'invalid credentials');

  if (user.status !== 'active') throw new ApiError(403, 'account inactive');

  const token = signToken({
    uid: user.id,
    email: user.email ?? undefined,
    name: user.name ?? undefined,
    role: user.role,
    permissions: [],
    status: user.status,
    tenantId: user.tenantId,
  });

  reply.setCookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });

  return reply.send({ status: 1, data: { uid: user.id, email: user.email, name: user.name }, message: 'Logged in' });
});

// POST /auth/logout — clear cookie
app.post('/auth/logout', async (_req, reply) => {
  reply.clearCookie('token', { path: '/' });
  return reply.send({ status: 1, data: null, message: 'Logged out' });
});

// GET /auth/me — get current user from cookie
app.get('/auth/me', async (req, reply) => {
  const token = (req as any).cookies?.token as string | undefined;
  if (!token) return reply.send({ status: 1, data: null, message: 'Not logged in' });

  const user = verifyToken(token);
  if (!user) return reply.send({ status: 1, data: null, message: 'Invalid token' });

  // Refresh user data from db (status, permissions, etc.)
  const dbUser = await prisma.user.findUnique({ where: { id: user.uid } });
  if (!dbUser) return reply.send({ status: 1, data: null, message: 'User not found' });

  return reply.send({
    status: 1,
    data: {
      uid: dbUser.id,
      email: dbUser.email,
      name: dbUser.name ?? undefined,
      role: dbUser.role,
      permissions: [],
    },
    message: 'ok',
  });
});

// ---- Public (unauthenticated) read for the SEO storefront (ADR-004) ----
function publicTenant(req: any): string {
  return (req.headers['x-tenant'] as string) || process.env.DEFAULT_TENANT || 'default';
}

// GET /api/public/:resource  -> tenant-scoped, webView-filtered listing (no auth)
app.get('/api/public/:resource', async (req, reply) => {
  const { resource } = req.params as any;
  if (!registry.get(resource)) return reply.code(404).send({ status: 0, data: null, message: 'Unknown resource' });
  const q = req.query as any;
  const result = await publicList(resource, {
    page: q.page, limit: q.limit, sortby: q.sortby, sortorder: q.sortorder,
    filters: q.filters ? JSON.parse(q.filters) : undefined,
  }, publicTenant(req));
  return reply.send({ status: 1, data: result, message: 'ok' });
});

// GET /api/public/:resource/:key  -> public detail (by slugField or id, no auth)
app.get('/api/public/:resource/:key', async (req, reply) => {
  const { resource, key } = req.params as any;
  if (!registry.get(resource)) return reply.code(404).send({ status: 0, data: null, message: 'Unknown resource' });
  const row = await publicGet(resource, key, publicTenant(req));
  return reply.send({ status: 1, data: row, message: 'ok' });
});

// ---- Public guest cart (storefront, no auth) — Phase 19 ----
app.post('/api/guest-cart', async (req, reply) => {
  const cart = await createGuestCart(publicTenant(req));
  return reply.code(201).send({ status: 1, data: cart, message: 'Created' });
});

app.get('/api/guest-cart/:id', async (req, reply) => {
  const cart = await getGuestCart(publicTenant(req), (req.params as any).id);
  return reply.send({ status: 1, data: cart, message: 'ok' });
});

app.post('/api/guest-cart/:id/items', async (req, reply) => {
  const { id } = req.params as any;
  const body = req.body as any;
  if (!body?.productId) throw new ApiError(422, 'productId required');
  const qty = Math.max(1, Math.min(99, Math.floor(Number(body.qty ?? 1))));
  const item = await addGuestCartItem(publicTenant(req), id, body.productId, qty);
  return reply.code(201).send({ status: 1, data: item, message: 'Added' });
});

app.delete('/api/guest-cart/:id/item/:itemId', async (req, reply) => {
  const { id, itemId } = req.params as any;
  await removeGuestCartItem(publicTenant(req), id, itemId);
  return reply.send({ status: 1, data: null, message: 'Removed' });
});

app.post('/api/guest-cart/:id/checkout', async (req, reply) => {
  const { id } = req.params as any;
  const body = req.body as any;
  const currency = body?.currency || 'INR';
  const order = await checkoutGuestCart(publicTenant(req), id, currency);
  return reply.code(201).send({ status: 1, data: order, message: 'Order placed' });
});

// ---- Payment (Phase 21): pay an order via the configured gateway, flips status pending -> paid ----
app.post('/api/orders/:id/pay', async (req, reply) => {
  const { id } = req.params as any;
  const tenant = publicTenant(req);
  const order = await prisma.order.findFirst({ where: { id, tenantId: tenant } });
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.status === 'paid') return reply.send({ status: 1, data: order, message: 'Already paid' });
  const res = await authorizePayment(id, order.total, order.currency);
  if (!res.ok) throw new ApiError(402, res.message || 'Payment failed');
  const updated = await prisma.order.update({ where: { id }, data: { status: 'paid', paymentRef: res.ref, paidAt: new Date() } });
  return reply.send({ status: 1, data: updated, message: 'Paid' });
});


// GET /api/meta/:resource -> full admin metadata
app.get('/api/meta/:resource', async (req, reply) => {
  const { resource } = req.params as any;
  const r = registry.get(resource);
  if (!r) return reply.code(404).send({ status: 0, data: null, message: 'Unknown resource' });
  return reply.send({ status: 1, data: adminMeta(r), message: 'ok' });
});

// ---- Resource Builder API (network-admin only) ----
// Lets admins define NEW resources at runtime. Definitions are validated
// by @lakshya/core, persisted to the `lakshya_resource` table, the
// physical Postgres table is created, and the def is registered live.
async function requireBuilderAdmin(req: any): Promise<AuthUser> {
  const user = getUser(req);
  if (user.role !== 'network' && user.role !== 'admin') {
    throw new ApiError(403, 'Forbidden: only network admins may edit resource definitions');
  }
  return user;
}

// LIST builder-managed resource definitions
app.get('/api/_meta/resource', async (req, reply) => {
  await requireBuilderAdmin(req);
  const items = await listBuilderResources();
  return reply.send({ status: 1, data: items, message: 'ok' });
});

// GET one builder definition (full editable JSON)
app.get('/api/_meta/resource/:name', async (req, reply) => {
  await requireBuilderAdmin(req);
  const def = await getBuilderResource((req.params as any).name);
  if (!def) return reply.code(404).send({ status: 0, data: null, message: 'Not found' });
  return reply.send({ status: 1, data: def, message: 'ok' });
});

// CREATE / UPSERT a builder resource (validates + creates table + registers)
app.post('/api/_meta/resource', async (req, reply) => {
  await requireBuilderAdmin(req);
  try {
    const def = await createBuilderResource((req.body as any));
    return reply.code(201).send({ status: 1, data: def, message: 'Resource created' });
  } catch (e: any) {
    const status = e?.status ?? 422;
    return reply.code(status).send({ status: 0, data: null, message: e?.message ?? 'Failed to create resource' });
  }
});

// DELETE a builder definition (keeps physical table unless ?drop=1)
app.delete('/api/_meta/resource/:name', async (req, reply) => {
  await requireBuilderAdmin(req);
  const { name } = req.params as any;
  const def = await getBuilderResource(name);
  if (!def) return reply.code(404).send({ status: 0, data: null, message: 'Not found' });
  if ((req.query as any).drop === '1') await dropBuilderTable(def.table);
  await deleteBuilderResource(name);
  return reply.send({ status: 1, data: null, message: 'Resource definition removed' });
});

// GET /api/:resource/:id
app.get('/api/:resource/:id', async (req, reply) => {
  const { resource, id } = req.params as any;
  if (!registry.get(resource)) return reply.code(404).send({ status: 0, data: null, message: 'Unknown resource' });
  const user = await requireScope(resource, 'get', req);
  const row = await getResource(resource, id, user);
  return reply.send({ status: 1, data: row, message: 'ok' });
});

// POST /api/:resource
app.post('/api/:resource', async (req, reply) => {
  const { resource } = req.params as any;
  if (!registry.get(resource)) return reply.code(404).send({ status: 0, data: null, message: 'Unknown resource' });
  const user = await requireScope(resource, 'create', req);
  const row = await createResource(resource, req.body, user);
  return reply.code(201).send({ status: 1, data: row, message: 'Created' });
});

// PATCH /api/:resource/:id
app.patch('/api/:resource/:id', async (req, reply) => {
  const { resource, id } = req.params as any;
  if (!registry.get(resource)) return reply.code(404).send({ status: 0, data: null, message: 'Unknown resource' });
  const user = await requireScope(resource, 'update', req);
  const row = await updateResource(resource, id, req.body, user);
  return reply.send({ status: 1, data: row, message: 'Updated' });
});

// DELETE /api/:resource/:id
app.delete('/api/:resource/:id', async (req, reply) => {
  const { resource, id } = req.params as any;
  if (!registry.get(resource)) return reply.code(404).send({ status: 0, data: null, message: 'Unknown resource' });
  const user = await requireScope(resource, 'delete', req);
  await deleteResource(resource, id, user);
  return reply.send({ status: 1, data: null, message: 'Deleted' });
});

// ---- Media upload (Phase 7) + imgen variants (Phase 14) ----
// POST /api/media/upload  body: { name, mimeType, base64 }  -> writes file + Media row
// For images, also generates a 200px `thumbnail` webp variant via sharp (imgen).
app.post('/api/media/upload', async (req, reply) => {
  const user = await requireScope('media', 'create', req);
  const body = req.body as any;
  if (!body?.base64) throw new ApiError(422, 'base64 required');
  const buf = Buffer.from(body.base64, 'base64');
  const ext = (body.mimeType?.split('/')[1] || 'bin').split(';')[0];
  const file = `${randomUUID()}.${ext}`;
  await writeFile(path.join(MEDIA_DIR, file), buf);
  const isImage = /^image\//.test(body.mimeType || '');
  const row = await prisma.media.create({
    data: {
      tenantId: user.tenantId,
      name: body.name || file,
      originalName: body.originalName,
      mimeType: body.mimeType,
      size: buf.length,
      path: `/media/${file}`,
      createdBy: user.uid,
    },
  });
  // imgen: derive a default 200px webp thumbnail for images
  if (isImage) {
    try {
      const thumb = await sharp(buf).resize(200, 200, { fit: 'inside' }).webp().toBuffer();
      const tf = `${randomUUID()}.webp`;
      await writeFile(path.join(MEDIA_DIR, tf), thumb);
      const meta = await sharp(thumb).metadata();
      await prisma.mediaVariant.create({
        data: {
          tenantId: user.tenantId,
          mediaId: row.id,
          format: 'thumbnail',
          width: meta.width ?? 200,
          height: meta.height ?? 200,
          path: `/media/variant/${tf}`,
          size: thumb.length,
        },
      });
    } catch {
      // non-fatal: original still stored; variant skipped
    }
  }
  return reply.code(201).send({ status: 1, data: row, message: 'Uploaded' });
});

// GET /media/:file  -> serves uploaded files
app.get('/media/:file', async (req, reply) => {
  const { file } = req.params as any;
  const full = path.join(MEDIA_DIR, path.basename(file));
  if (!existsSync(full)) return reply.code(404).send({ status: 0, data: null, message: 'Not found' });
  const buf = await readFile(full);
  return reply.type((req.query as any).mime || 'application/octet-stream').send(buf);
});

// GET /media/variant/:file  -> serves imgen-generated variants
app.get('/media/variant/:file', async (req, reply) => {
  const { file } = req.params as any;
  const full = path.join(MEDIA_DIR, path.basename(file));
  if (!existsSync(full)) return reply.code(404).send({ status: 0, data: null, message: 'Not found' });
  const buf = await readFile(full);
  return reply.type('image/webp').send(buf);
});

// GET /media/:id/variant?w=&h=&f=  -> on-demand imgen (Phase 16)
// Generates (and caches as a MediaVariant) a resized/transcoded variant of Media `:id`.
app.get('/media/:id/variant', async (req, reply) => {
  const { id } = req.params as any;
  const media = await prisma.media.findFirst({ where: { id } });
  if (!media) return reply.code(404).send({ status: 0, data: null, message: 'Media not found' });
  const q = req.query as any;
  const w = q.w ? Math.min(2000, Math.max(1, parseInt(q.w, 10))) : undefined;
  const h = q.h ? Math.min(2000, Math.max(1, parseInt(q.h, 10))) : undefined;
  const f = (q.f === 'avif' || q.f === 'png' || q.f === 'jpeg') ? q.f : 'webp';
  const sig = `${w ?? '_'}x${h ?? '_'}-${f}`;
  // reuse a cached variant if present
  const existing = await prisma.mediaVariant.findFirst({ where: { mediaId: id, format: sig } });
  if (existing) {
    const cf = path.join(MEDIA_DIR, path.basename(existing.path));
    if (existsSync(cf)) return reply.type(`image/${f}`).send(await readFile(cf));
  }
  const src = path.join(MEDIA_DIR, path.basename(media.path));
  if (!existsSync(src)) return reply.code(404).send({ status: 0, data: null, message: 'Source missing' });
  if (!/^image\//.test(media.mimeType || '')) return reply.code(400).send({ status: 0, data: null, message: 'Not an image' });
  const img = sharp(await readFile(src));
  if (w || h) img.resize(w, h, { fit: 'inside' });
  const out = await img.toFormat(f as any).toBuffer();
  const vf = `${randomUUID()}.${f === 'jpeg' ? 'jpg' : f}`;
  await writeFile(path.join(MEDIA_DIR, vf), out);
  const meta = await sharp(out).metadata();
  await prisma.mediaVariant.create({ data: { tenantId: media.tenantId, mediaId: id, format: sig, width: meta.width ?? null, height: meta.height ?? null, path: `/media/variant/${vf}`, size: out.length } });
  return reply.type(`image/${f}`).send(out);
});

// ---- Health ----
app.get('/health', async () => ({ status: 1, data: { ok: true }, message: 'ok' }));
app.get('/:resource.csv', async (req, reply) => {
  const { resource } = req.params as any;
  if (!registry.get(resource)) return reply.code(404).send({ status: 0, data: null, message: 'Unknown resource' });
  const user = await requireScope(resource, 'list', req);
  const q = req.query as any;
  const result = await listResource(resource, {
    page: q.page,
    limit: q.limit,
    sortby: q.sortby,
    sortorder: q.sortorder,
    q: typeof q.q === 'string' ? q.q.trim() : undefined,
    filters: q.filters ? JSON.parse(q.filters) : undefined,
    ...(Array.isArray(q.filterRules) || (typeof q.filterRules === 'string' && q.filterRules.trim().length > 0)
      ? { filterRules: typeof q.filterRules === 'string' ? JSON.parse(q.filterRules) : q.filterRules }
      : {}),
  }, user);
  const rows: any[] = result.data ?? [];
  const cols = Object.keys(rows[0] ?? {});
  const escCsv = (v: any) => {
    const s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [cols.join(',')];
  for (const r of rows) lines.push(cols.map((c) => escCsv(r[c])).join(','));
  const body = lines.join('\n');
  reply.header('content-type', 'text/csv');
  reply.header('content-disposition', `attachment; filename="${resource}.csv"`);
  return reply.send(body);
});

// ---- Error handler (maps ApiError -> envelope) ----
app.setErrorHandler((err, _req, reply) => {
  if ((err as unknown as ApiError).status) {
    const e = err as unknown as ApiError;
    return reply.code(e.status).send({ status: 0, data: null, message: e.message });
  }
  if (err.validation) {
    return reply.code(422).send({ status: 0, data: null, message: 'Invalid request: ' + err.message });
  }
  console.error(err);
  return reply.code(500).send({ status: 0, data: null, message: 'Internal error' });
});

export async function start() {
  await app.listen({ port: config.port, host: '0.0.0.0' });
  console.log(`API listening on :${config.port}`);
}

// start only when run directly as the API server (not when imported by admin panels)
const _entry = process.argv[1] ?? '';
const _isApiEntry = _entry.endsWith('apps/api/src/server.ts') || _entry.endsWith('api/src/server.ts');
if (_isApiEntry) {
  start();
}

export { app, scopeFor };
