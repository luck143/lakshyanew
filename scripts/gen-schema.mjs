#!/usr/bin/env node
// scripts/gen-schema.mjs
// Derives apps/api/prisma/schema.prisma from the resource JSON definitions
// (packages/core/resources/*.json) — the single source of truth.
//
// Strategy (safe, non-destructive):
//  - For resources whose `table` already exists as a model in the CURRENT
//    schema.prisma, the model is preserved VERBATIM. This guarantees `prisma
//    db push` is a no-op for those 42 tables (zero data loss).
//  - For resources whose `table` is NOT yet a model (the 6 builder resources:
//    Lead, ProjectNote, QaCheck, ReviewItem, TaskItem, TicketLog), a model is
//    GENERATED from the JSON field types. These tables get created by db push.
//  - `lakshya_resource` (runtime builder store, being retired) is preserved
//    verbatim so db push never drops it.
//
// Run: node scripts/gen-schema.mjs   (after `pnpm --filter @lakshya/core build`)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const RES_DIR = resolve(root, 'packages/core/resources');
const SCHEMA = resolve(root, 'apps/api/prisma/schema.prisma');

// --- Type mapping: resource field type -> Prisma scalar ---
const SCALAR = {
  uuid: 'String', string: 'String', text: 'String', richtext: 'String',
  url: 'String', enum: 'String', relation: 'String', media: 'String',
  int: 'Int', float: 'Float', bool: 'Boolean',
  date: 'DateTime', datetime: 'DateTime', json: 'Json', tags: 'String[]',
  computed: 'Json', virtual: 'Json',
};

function prismaType(field) {
  if (field.type === 'tags') return 'String[]';
  return SCALAR[field.type] || 'String';
}

// --- Load current schema, split into header + per-model blocks ---
const src = readFileSync(SCHEMA, 'utf8');
const lines = src.split('\n');
let headerEnd = 0;
while (headerEnd < lines.length && !lines[headerEnd].startsWith('model ')) headerEnd++;
const header = lines.slice(0, headerEnd).join('\n');

const models = new Map(); // table -> block text
let i = headerEnd;
while (i < lines.length) {
  const line = lines[i];
  const m = line.match(/^model\s+(\w+)\s*\{/);
  if (m) {
    const name = m[1];
    const start = i;
    i++;
    while (i < lines.length && !lines[i].trim().startsWith('}')) i++;
    const end = i; // inclusive of closing brace
    models.set(name, lines.slice(start, end + 1).join('\n'));
  }
  i++;
}

// --- Collect JSON-defined resources by table name ---
const jsonTables = new Set();
const jsonByTable = new Map();
for (const f of readdirSync(RES_DIR)) {
  if (!f.endsWith('.json')) continue;
  const def = JSON.parse(readFileSync(resolve(RES_DIR, f), 'utf8'));
  jsonTables.add(def.table);
  jsonByTable.set(def.table, def);
}

// --- Generate models for JSON resources not present in current schema ---
const generated = [];
for (const [table, def] of jsonByTable) {
  if (models.has(table)) continue; // preserve existing model verbatim
  const isId = (k) => k === 'id';
  const cols = [];
  cols.push('  tenantId  String');
  for (const [key, field] of Object.entries(def.fields)) {
    const pt = prismaType(field);
    if (isId(key)) {
      cols.push(`  id        ${pt} @id @default(uuid())`);
    } else {
      const nullable = field.generated ? '' : '?';
      cols.push(`  ${key.padEnd(10)} ${pt}${nullable}`);
    }
  }
  cols.push('  createdAt DateTime @default(now())');
  cols.push('  updatedAt DateTime @updatedAt');
  generated.push(`model ${table} {\n${cols.join('\n')}\n}`);
}

// --- Preserve runtime tables not represented by JSON resources ---
// `lakshya_resource` is the builder's legacy store (being retired, data already
// migrated to JSON). Keep it verbatim so `prisma db push` NEVER drops it.
const EXTRA_PRESERVE = {
  lakshya_resource: `model lakshya_resource {
  name       String   @id
  label      String
  table      String
  definition Json
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}`,
};

// --- Write: header + existing models (verbatim) + extra-preserved + generated ---
const preserved = [...models.values()];
for (const [name, block] of Object.entries(EXTRA_PRESERVE)) {
  if (!models.has(name)) preserved.push(block);
}
const out = [header.trimEnd(), '', ...preserved, ...generated].join('\n\n') + '\n';
writeFileSync(SCHEMA, out);

console.log(`gen-schema: preserved ${models.size} existing models, generated ${generated.length} new models.`);
console.log('New tables to be created by `prisma db push`:', generated.map((g) => g.match(/^model (\w+)/)[1]).join(', ') || '(none)');
