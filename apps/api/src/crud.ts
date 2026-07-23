// apps/api/src/crud.ts
// Generic CRUD service. Driven entirely by the resource definition in @lakshya/core.
// Equivalent of old process_add/process_edit/process_fetch + chouse_* handlers,
// but tenant-scoped (ADR-002) and schema-validated via zod.

import { PrismaClient } from '@prisma/client';
import { registry, inputSchemaFor, type Resource } from '@lakshya/core';
import { resolveModel, isRawModel } from './dynamic.js';
import type { AuthUser } from './auth.js';
import { randomUUID as cryptoRandomUUID } from 'crypto';

const prisma = new PrismaClient();
export { prisma };

export interface ListParams {
  page?: number;
  limit?: number;
  sortby?: string;
  sortorder?: 'asc' | 'desc';
  filters?: Record<string, unknown>;
  filterRules?: Array<{ field: string; op: string; value: unknown }>;
  q?: string;
}

function clientModel(resource: Resource): any {
  // Prisma Client exposes models keyed by lowercased-first model name
  // (schema `model Topic` -> prisma.topic). resource.table holds the
  // PascalCase model name; normalize to the client key.
  const pascal = resource.table;
  const key = pascal.charAt(0).toLowerCase() + pascal.slice(1);
  const delegate = (prisma as any)[key] ?? (prisma as any)[pascal];
  if (!delegate) throw new ApiError(500, `No Prisma model for resource ${resource.name} (tried ${key})`);
  return delegate;
}

// Only the Tenant model has no tenantId column (it IS the tenant). Every other
// model carries tenantId, so tenant scoping applies to all resources except tenant.
function hasTenantFor(resource: Resource): boolean {
  return resource.table !== 'Tenant';
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function createResource(
  resourceName: string,
  body: any,
  user: AuthUser,
): Promise<unknown> {
  const resource = registry.get(resourceName);
  if (!resource) throw new ApiError(404, `Unknown resource ${resourceName}`);

  const schema = inputSchemaFor(resourceName, 'create', (n) => registry.get(n));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(422, 'Validation failed: ' + JSON.stringify(parsed.error.issues));
  }

  const model = resolveModel(resource, prisma);
  const data = hasTenantFor(resource) ? { ...parsed.data, tenantId: user.tenantId } : { ...parsed.data };
  // Raw (builder) resources have no Prisma delegate to auto-generate ids,
  // so we generate one from crypto.randomUUID() for generated `id` fields.
  if (isRawModel(resource, prisma)) {
    const idField = (resource.fields as any)?.id;
    if (idField && (idField as any).generated && !(data as any).id) {
      (data as any).id = cryptoRandomUUID();
    }
  }
  // unique check (mirrors old "already exists" guard for natural keys).
  // Only fields explicitly flagged `unique: true` are treated as natural keys.
  for (const [fname, fdef] of Object.entries(resource.fields)) {
    if ((fdef as any).unique && (data as any)[fname] !== undefined) {
      const where: any = hasTenantFor(resource)
        ? { tenantId: user.tenantId, [fname]: (data as any)[fname] }
        : { [fname]: (data as any)[fname] };
      const existing = await model.findFirst({ where });
      if (existing) throw new ApiError(409, `${resource.label} with this ${fname} already exists`);
    }
  }
  let row: any;
  try {
    row = await model.create({ data });
  } catch (e: any) {
    if (e && e.code === 'P2002') {
      const target = Array.isArray(e.meta?.target) ? e.meta.target.join(', ') : 'unique field';
      throw new ApiError(409, `${resource.label} with this ${target} already exists`);
    }
    throw e;
  }
  return row;
}

export async function updateResource(
  resourceName: string,
  id: string,
  body: any,
  user: AuthUser,
): Promise<unknown> {
  const resource = registry.get(resourceName);
  if (!resource) throw new ApiError(404, `Unknown resource ${resourceName}`);

  const schema = inputSchemaFor(resourceName, 'update', (n) => registry.get(n));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(422, 'Validation failed: ' + JSON.stringify(parsed.error.issues));
  }

  const model = resolveModel(resource, prisma);
  const existing = await model.findFirst({ where: hasTenantFor(resource) ? { id, tenantId: user.tenantId } : { id } });
  if (!existing) throw new ApiError(404, `${resource.label} not found`);

  const row = await model.update({
    where: { id },
    data: parsed.data,
  });
  return row;
}

export async function getResource(
  resourceName: string,
  id: string,
  user: AuthUser,
): Promise<unknown> {
  const resource = registry.get(resourceName);
  if (!resource) throw new ApiError(404, `Unknown resource ${resourceName}`);
  const model = resolveModel(resource, prisma);
  const row = await model.findFirst({ where: hasTenantFor(resource) ? { id, tenantId: user.tenantId } : { id } });
  if (!row) throw new ApiError(404, `${resource.label} not found`);
  return row;
}

export async function listResource(
  resourceName: string,
  params: ListParams & { filterRules?: Array<{ field: string; op: string; value: unknown }> },
  user: AuthUser,
): Promise<{ data: unknown[]; page: number; limit: number; total: number }> {
  const resource = registry.get(resourceName);
  if (!resource) throw new ApiError(404, `Unknown resource ${resourceName}`);
  const model = resolveModel(resource, prisma);

  const page = Math.max(1, Number(params.page ?? 1));
  const limit = Math.min(1000, Math.max(1, Number(params.limit ?? resource.listView?.pageSize ?? 50)));
  const skip = (page - 1) * limit;

  const where: any = {};
  const rowScope = (user as any).rowScope ?? 'tenant';
  if (rowScope === 'global') {
    // no tenant filter
  } else if (rowScope === 'self') {
    if (hasTenantFor(resource)) where.tenantId = user.tenantId;
    if (resource.fields['createdBy']) where.createdBy = user.uid;
  } else {
    if (hasTenantFor(resource)) where.tenantId = user.tenantId;
  }

  if (params.filters) {
    for (const [k, v] of Object.entries(params.filters)) {
      if (v !== undefined && v !== '' && v !== null) where[k] = v;
    }
  }

  const allowedOps = new Set(['eq', 'neq', 'contains', 'gt', 'gte', 'lt', 'lte']);
  const ops: Record<string, string> = {
    eq: 'equals',
    neq: 'not',
    contains: 'contains',
    gt: 'gt',
    gte: 'gte',
    lt: 'lt',
    lte: 'lte',
  };
  if (params.filterRules) {
    for (const rule of params.filterRules) {
      const field = String(rule.field || '').trim();
      const op = String(rule.op || '').trim();
      const value = rule.value;
      if (!field || !op || !allowedOps.has(op) || value === '' || value == null) continue;
      if (!resource.fields[field]) continue;
      if (op === 'eq') {
        where[field] = value;
      } else if (op === 'contains') {
        where[field] = { contains: String(value), mode: 'insensitive' };
      } else {
        where[field] = { [ops[op]]: value };
      }
    }
  }

  // Free-text search across searchable string/text/richtext/url fields (OR).
  // If no field is explicitly flagged searchable, fall back to ALL
  // string-like fields so search "just works" for builder resources.
  const q = typeof params.q === 'string' ? params.q.trim() : '';
  if (q) {
    let searchFields = Object.entries(resource.fields)
      .filter(([, f]) => (f as any).ui?.searchable && ['string', 'text', 'richtext', 'url'].includes((f as any).type))
      .map(([k]) => k);
    if (searchFields.length === 0) {
      searchFields = Object.entries(resource.fields)
        .filter(([, f]) => ['string', 'text', 'richtext', 'url'].includes((f as any).type))
        .map(([k]) => k);
    }
    if (searchFields.length) {
      where.OR = searchFields.map((f) => ({ [f]: { contains: q, mode: 'insensitive' } }));
    }
  }

  const orderBy: any = {};
  const sortby = params.sortby ?? resource.listView?.defaultSort;
  if (sortby && (resource.fields[sortby] || ['createdAt', 'updatedAt'].includes(sortby))) {
    orderBy[sortby] = params.sortorder ?? resource.listView?.defaultOrder ?? 'desc';
  }

  const [rows, total] = await Promise.all([
    model.findMany({ where, skip, take: limit, orderBy }),
    model.count({ where }),
  ]);

  return { data: rows, page, limit, total };
}

export async function deleteResource(
  resourceName: string,
  id: string,
  user: AuthUser,
): Promise<void> {
  const resource = registry.get(resourceName);
  if (!resource) throw new ApiError(404, `Unknown resource ${resourceName}`);
  const model = resolveModel(resource, prisma);
  const existing = await model.findFirst({ where: hasTenantFor(resource) ? { id, tenantId: user.tenantId } : { id } });
  if (!existing) throw new ApiError(404, `${resource.label} not found`);
  await model.delete({ where: { id } });
}

// ---- Public (unauthenticated) read, for the SEO storefront (ADR-004) ----
// Tenant-scoped + webView rules (publicStatus filter, optional slug field for detail).
export async function publicList(
  resourceName: string,
  params: ListParams,
  tenantId: string,
): Promise<{ data: unknown[]; page: number; limit: number; total: number }> {
  const resource = registry.get(resourceName);
  if (!resource) throw new ApiError(404, `Unknown resource ${resourceName}`);
  if (!resource.webView?.landing) throw new ApiError(403, `Resource ${resourceName} is not public`);
  const model = resolveModel(resource, prisma);

  const page = Math.max(1, Number(params.page ?? 1));
  const limit = Math.min(1000, Math.max(1, Number(params.limit ?? resource.listView?.pageSize ?? 50)));
  const skip = (page - 1) * limit;

  const where: any = { tenantId };
  const pubStatus = resource.webView?.publicStatus ?? 'active';
  if (resource.fields['status']) where.status = pubStatus;
  if (params.filters) {
    for (const [k, v] of Object.entries(params.filters)) {
      if (v !== undefined && v !== '' && v !== null) where[k] = v;
    }
  }

  const allowedOps = new Set(['eq', 'neq', 'contains', 'gt', 'gte', 'lt', 'lte']);
  const ops: Record<string, string> = {
    eq: 'equals',
    neq: 'not',
    contains: 'contains',
    gt: 'gt',
    gte: 'gte',
    lt: 'lt',
    lte: 'lte',
  };
  if (params.filterRules) {
    for (const rule of params.filterRules) {
      const field = String(rule.field || '').trim();
      const op = String(rule.op || '').trim();
      const value = rule.value;
      if (!field || !op || !allowedOps.has(op) || value === '' || value == null) continue;
      if (!resource.fields[field]) continue;
      if (op === 'eq') {
        where[field] = value;
      } else if (op === 'contains') {
        where[field] = { contains: String(value), mode: 'insensitive' };
      } else {
        where[field] = { [ops[op]]: value };
      }
    }
  }

  // Free-text search across searchable string/text/richtext/url fields (OR).
  // If no field is explicitly flagged searchable, fall back to ALL
  // string-like fields so search "just works" for builder resources.
  const q = typeof params.q === 'string' ? params.q.trim() : '';
  if (q) {
    let searchFields = Object.entries(resource.fields)
      .filter(([, f]) => (f as any).ui?.searchable && ['string', 'text', 'richtext', 'url'].includes((f as any).type))
      .map(([k]) => k);
    if (searchFields.length === 0) {
      searchFields = Object.entries(resource.fields)
        .filter(([, f]) => ['string', 'text', 'richtext', 'url'].includes((f as any).type))
        .map(([k]) => k);
    }
    if (searchFields.length) {
      where.OR = searchFields.map((f) => ({ [f]: { contains: q, mode: 'insensitive' } }));
    }
  }

  const orderBy: any = {};
  const sortby = params.sortby ?? resource.listView?.defaultSort;
  if (sortby && (resource.fields[sortby] || ['createdAt', 'updatedAt'].includes(sortby))) {
    orderBy[sortby] = params.sortorder ?? resource.listView?.defaultOrder ?? 'desc';
  }
  const [rows, total] = await Promise.all([
    model.findMany({ where, skip, take: limit, orderBy }),
    model.count({ where }),
  ]);
  return { data: rows, page, limit, total };
}

export async function publicGet(
  resourceName: string,
  key: string,
  tenantId: string,
): Promise<unknown> {
  const resource = registry.get(resourceName);
  if (!resource) throw new ApiError(404, `Unknown resource ${resourceName}`);
  if (!resource.webView?.detail) throw new ApiError(403, `Resource ${resourceName} is not public`);
  const model = resolveModel(resource, prisma);
  const slugField = resource.webView?.slugField;
  const where: any = { tenantId };
  if (slugField) where[slugField] = key;
  else where.id = key;
  const pubStatus = resource.webView?.publicStatus ?? 'active';
  if (resource.fields['status']) where.status = pubStatus;
  const row = await model.findFirst({ where });
  if (!row) throw new ApiError(404, `${resource.label} not found`);
  return row;
}
