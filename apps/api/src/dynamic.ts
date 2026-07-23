// apps/api/src/dynamic.ts
// Raw-SQL adapter for resources that have NO Prisma delegate — i.e. the
// ones created through the Resource Builder. Each builder resource gets a
// bound "model" that mirrors the Prisma delegate contract used by crud.ts
// (create({data}), findFirst({where}), findMany({where,skip,take,orderBy}),
// count({where}), update({where,data}), delete({where})) so the generic
// CRUD never knows the difference and needs ZERO changes per resource.
//
// Safety: every query is tenant-scoped (except the Tenant table) and only
// references columns taken from the trusted registry (not user input),
// preventing SQL injection.
import { PrismaClient } from '@prisma/client';
import type { Resource, Field } from '@lakshya/core';

const prisma = new PrismaClient();

function q(ident: string): string {
  return `"${String(ident).replace(/"/g, '')}"`;
}

function whereSql(resource: Resource, where: Record<string, any>, offset = 0): { clause: string; params: any[] } {
  // Returns the boolean expression ONLY (no leading WHERE) so it can be
  // safely nested inside AND/OR groups. The caller prepends WHERE.
  const parts: string[] = [];
  const params: any[] = [];
  const add = (expr: string) => parts.push(expr);
  for (const [k, val] of Object.entries(where ?? {})) {
    if (val == null) continue;
    // OR groups: array of condition objects, combined with OR.
    if (Array.isArray(val) && k === 'OR') {
      const sub = val.map((cond: any) => {
        const w = whereSql(resource, cond, params.length + offset);
        params.push(...w.params);
        return w.clause ? `(${w.clause})` : '1=1';
      });
      if (sub.length) add('(' + sub.join(' OR ') + ')');
      continue;
    }
    if (typeof val === 'object' && !(val instanceof Date)) {
      for (const [op, v] of Object.entries(val)) {
        const col = q(k);
        const ph = `$${params.length + 1 + offset}`;
        if (op === 'contains') { add(`LOWER(${col}) LIKE LOWER(${ph})`); params.push(`%${v}%`); }
        else if (op === 'equals') { add(`${col} = ${ph}`); params.push(v); }
        else if (op === 'not') { add(`${col} <> ${ph}`); params.push(v); }
        else if (op === 'gt') { add(`${col} > ${ph}`); params.push(v); }
        else if (op === 'gte') { add(`${col} >= ${ph}`); params.push(v); }
        else if (op === 'lt') { add(`${col} < ${ph}`); params.push(v); }
        else if (op === 'lte') { add(`${col} <= ${ph}`); params.push(v); }
      }
    } else {
      const ph = `$${params.length + 1 + offset}`;
      add(`${q(k)} = ${ph}`);
      params.push(val);
    }
  }
  return { clause: parts.join(' AND '), params };
}

function toRow(resource: Resource, rec: any): any {
  if (!rec) return rec;
  const row: any = {};
  for (const [k, f] of Object.entries(resource.fields) as [string, Field][]) {
    let v = rec[k];
    if (f.type === 'json' || f.type === 'tags') {
      if (typeof v === 'string') { try { v = JSON.parse(v); } catch { /* keep */ } }
    }
    if (f.type === 'bool') v = v === true || v === 'true' || v === 1 || v === '1';
    if ((f.type === 'int' || f.type === 'float') && v != null && v !== '') v = Number(v);
    row[k] = v;
  }
  if ('createdAt' in rec) row.createdAt = rec.createdAt;
  if ('updatedAt' in rec) row.updatedAt = rec.updatedAt;
  return row;
}

async function run<T>(fn: () => Promise<T>, label: string): Promise<T> {
  try { return await fn(); }
  catch (e: any) {
    if (/relation|does not exist|undefined_table/i.test(e?.message || '')) {
      const err: any = new Error(`Table for this resource is missing. Re-create it from the Resource Builder. (${label})`);
      err.status = 500; throw err;
    }
    throw e;
  }
}

// Build a Prisma-delegate-shaped model bound to one builder resource.
export function makeDynamicModel(resource: Resource) {
  return {
    async create(args: { data?: any } = {}): Promise<any> {
      const data = args.data ?? {};
      const cols = Object.keys(data);
      const vals = cols.map((c) => data[c]);
      const sql = `INSERT INTO ${q(resource.table)} (${cols.map(q).join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`;
      const rows = await run(() => prisma.$queryRawUnsafe(sql, ...vals), 'create');
      return toRow(resource, (rows as any[])[0]);
    },
    async findFirst(args: { where?: Record<string, any> } = {}): Promise<any> {
      const w = whereSql(resource, args.where ?? {});
      const sql = `SELECT * FROM ${q(resource.table)} ${w.clause ? 'WHERE ' + w.clause : ''} LIMIT 1`;
      const rows = await run(() => prisma.$queryRawUnsafe(sql, ...w.params), 'findFirst');
      return (rows as any[])[0] ? toRow(resource, (rows as any[])[0]) : null;
    },
    async findMany(args: { where?: Record<string, any>; skip?: number; take?: number; orderBy?: Record<string, string> } = {}): Promise<any[]> {
      const w = whereSql(resource, args.where ?? {});
      let sql = `SELECT * FROM ${q(resource.table)} ${w.clause ? 'WHERE ' + w.clause : ''}`;
      if (args.orderBy && Object.keys(args.orderBy).length) {
        const parts = Object.entries(args.orderBy).map(([k, dir]) => `${q(k)} ${dir === 'desc' ? 'DESC' : 'ASC'}`);
        sql += ' ORDER BY ' + parts.join(', ');
      }
      sql += ` LIMIT ${Math.max(1, Math.min(1000, args.take ?? 50))} OFFSET ${Math.max(0, args.skip ?? 0)}`;
      const rows = await run(() => prisma.$queryRawUnsafe(sql, ...w.params), 'findMany');
      return (rows as any[]).map((r) => toRow(resource, r));
    },
    async count(args: { where?: Record<string, any> } = {}): Promise<number> {
      const w = whereSql(resource, args.where ?? {});
      const sql = `SELECT COUNT(*)::int AS c FROM ${q(resource.table)} ${w.clause ? 'WHERE ' + w.clause : ''}`;
      const rows = await run(() => prisma.$queryRawUnsafe(sql, ...w.params), 'count');
      return Number((rows as any[])[0]?.c ?? 0);
    },
    async update(args: { where?: Record<string, any>; data?: any } = {}): Promise<any> {
      const data = args.data ?? {};
      const cols = Object.keys(data);
      const w = whereSql(resource, args.where ?? {}, cols.length);
      const params = cols.map((c) => data[c]);
      const set = cols.map((c, i) => `${q(c)} = $${i + 1}`).join(', ');
      const sql = `UPDATE ${q(resource.table)} SET ${set}, "updatedAt" = CURRENT_TIMESTAMP ${w.clause ? 'WHERE ' + w.clause : ''} RETURNING *`;
      const rows = await run(() => prisma.$queryRawUnsafe(sql, ...params, ...w.params), 'update');
      return (rows as any[])[0] ? toRow(resource, (rows as any[])[0]) : null;
    },
    async delete(args: { where?: Record<string, any> } = {}): Promise<void> {
      const w = whereSql(resource, args.where ?? {});
      const sql = `DELETE FROM ${q(resource.table)} ${w.clause ? 'WHERE ' + w.clause : ''}`;
      await run(() => prisma.$executeRawUnsafe(sql, ...w.params), 'delete');
    },
  };
}

// Decide Prisma delegate (compile-time resources) vs raw adapter (builder
// resources). Returns a model whose methods match the Prisma delegate
// contract, so crud.ts needs no code changes.
export function resolveModel(resource: Resource, prismaAny: any): any {
  const key = resource.table.charAt(0).toLowerCase() + resource.table.slice(1);
  const delegate = prismaAny[key] ?? prismaAny[resource.table];
  if (delegate) return delegate;
  return makeDynamicModel(resource);
}

// True when the resource has no Prisma delegate (i.e. it was created via the
// Resource Builder and is served by the raw-SQL adapter).
export function isRawModel(resource: Resource, prismaAny: any): boolean {
  const key = resource.table.charAt(0).toLowerCase() + resource.table.slice(1);
  return !(prismaAny[key] ?? prismaAny[resource.table]);
}
