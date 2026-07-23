// packages/core/src/builder.ts
// Helpers for the admin "Resource Builder": maps resource field types to
// Postgres column types and validates an incoming builder payload so a
// malformed definition can never enter the registry or the database.
//
// This module is deliberately free of any DB/Prisma import so @lakshya/core
// stays portable. The API layer does the actual SQL execution.

import type { DefineResourceInput, Field, FieldType, Resource, Scope } from './types.js';

const VALID_TYPES: FieldType[] = [
  'uuid', 'string', 'text', 'richtext',
  'int', 'float', 'bool',
  'enum', 'date', 'datetime',
  'relation', 'media', 'tags', 'json', 'url',
  'computed', 'virtual',
];

const VALID_SCOPES: Array<Scope['access']> = ['network', 'publisher', 'user', 'public'];

// Stable mapping of field type -> Postgres column type.
// `generated:true` uuid ids become the PK; everything else is nullable so
// later edits never have to rewrite existing rows.
export function sqlTypeFor(field: Field): string {
  switch (field.type) {
    case 'uuid':
      // Builder tables use TEXT for uuid ids so runtime-generated string
      // ids (crypto.randomUUID) insert cleanly without ::uuid casts.
      return 'TEXT';
    case 'int':
      return 'INTEGER';
    case 'float':
      return 'DOUBLE PRECISION';
    case 'bool':
      return 'BOOLEAN';
    case 'date':
      return 'DATE';
    case 'datetime':
      return 'TIMESTAMP(3)';
    case 'json':
    case 'tags':
    case 'computed':
    case 'virtual':
      return 'JSONB';
    case 'media':
    case 'relation':
    case 'url':
    case 'enum':
    case 'string':
    case 'text':
    case 'richtext':
    default:
      return 'TEXT';
  }
}

// Convert a builder field into the canonical Field shape, filling safe defaults.
export function normalizeField(raw: any): Field {
  if (!raw || typeof raw !== 'object') throw new Error('Field must be an object');
  const type = String(raw.type || '').trim() as FieldType;
  if (!VALID_TYPES.includes(type)) throw new Error(`Unsupported field type: ${raw.type}`);
  if (!raw.label || typeof raw.label !== 'string') throw new Error('Every field needs a label');

  const field: Field = { type, label: raw.label.trim() };
  if (raw.description) field.description = String(raw.description);
  if (raw.generated === true) field.generated = true;
  if (raw.unique === true) field.unique = true;
  if (Array.isArray(raw.required)) field.required = raw.required.filter((o: any) => typeof o === 'string');
  if (Array.isArray(raw.visible)) field.visible = raw.visible.filter((o: any) => typeof o === 'string');
  if (Array.isArray(raw.editable)) field.editable = raw.editable.filter((o: any) => typeof o === 'string');
  if (raw.default !== undefined) field.default = raw.default;
  if (raw.validate && typeof raw.validate === 'object') {
    const v: any = {};
    for (const k of ['min', 'max', 'regex', 'email', 'positive', 'unique']) {
      if (raw.validate[k] !== undefined) v[k] = raw.validate[k];
    }
    if (Object.keys(v).length) field.validate = v;
  }
  if (type === 'enum') {
    if (!raw.options || typeof raw.options !== 'object' || Object.keys(raw.options).length === 0) {
      throw new Error(`enum field "${raw.label}" needs options`);
    }
    field.options = raw.options;
  }
  if (type === 'relation') {
    if (!raw.options || !raw.options.resource) {
      throw new Error(`relation field "${raw.label}" needs options.resource`);
    }
    field.options = { resource: String(raw.options.resource), labelField: raw.options.labelField ? String(raw.options.labelField) : 'name' };
  }
  if (raw.ui && typeof raw.ui === 'object') {
    const ui: any = {};
    for (const k of ['widget', 'placeholder', 'help', 'columns', 'sortable', 'filterable', 'searchable', 'render', 'currency', 'group', 'input', 'href']) {
      if (raw.ui[k] !== undefined) ui[k] = raw.ui[k];
    }
    if (raw.ui.options && typeof raw.ui.options === 'object') ui.options = raw.ui.options;
    if (Object.keys(ui).length) field.ui = ui;
  }
  return field;
}

// Validate + normalize a full builder payload into a Registerable Resource.
export function normalizeResource(raw: any): DefineResourceInput {
  if (!raw || typeof raw !== 'object') throw new Error('Resource payload must be an object');
  const name = String(raw.name || '').trim();
  if (!/^[a-z][a-z0-9_]*$/.test(name)) {
    throw new Error('name must be lowercase letters/numbers/underscore, e.g. "project_note"');
  }
  if (!raw.label || typeof raw.label !== 'string') throw new Error('Resource needs a label');
  if (!raw.table || typeof raw.table !== 'string') throw new Error('Resource needs a table name');

  const fields: Record<string, Field> = {};
  if (!Array.isArray(raw.fields) || raw.fields.length === 0) {
    throw new Error('Resource needs at least one field');
  }
  // auto id when missing
  let hasId = false;
  for (const f of raw.fields) {
    if (!f.key || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(String(f.key))) {
      throw new Error('Every field needs a valid key (letters/numbers/underscore)');
    }
    fields[String(f.key)] = normalizeField(f);
    if (String(f.key) === 'id') hasId = true;
  }
  if (!hasId) {
    fields.id = { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] } as Field;
  }

  const scopes: any = raw.scopes && typeof raw.scopes === 'object' ? raw.scopes : {};
  const outScopes: any = {};
  for (const role of ['admin', 'publisher', 'user', 'public']) {
    if (scopes[role]) {
      const s = scopes[role];
      const access = s.access ?? role;
      if (Array.isArray(access) ? access.some((a: any) => !VALID_SCOPES.includes(a)) : !VALID_SCOPES.includes(access)) {
        throw new Error(`Invalid scope access for ${role}`);
      }
      outScopes[role] = { access, ...(s.perm || s.modules ? { perm: s.perm, modules: s.modules } : {}) };
    }
  }
  if (!outScopes.admin) outScopes.admin = { access: 'network' };

  const listView: any = { columns: [] };
  if (Array.isArray(raw.columns)) {
    listView.columns = raw.columns.filter((c: any) => fields[String(c)]);
  } else {
    listView.columns = Object.keys(fields).filter((k) => fields[k].ui?.columns || ['title', 'name', 'label', 'email'].includes(k)).slice(0, 8);
  }
  if (raw.defaultSort && fields[String(raw.defaultSort)]) listView.defaultSort = String(raw.defaultSort);
  if (raw.pageSize) listView.pageSize = Number(raw.pageSize) || 50;

  const resource: any = {
    name,
    table: String(raw.table).trim(),
    label: String(raw.label).trim(),
    labelPlural: raw.labelPlural ? String(raw.labelPlural).trim() : String(raw.label).trim() + 's',
    group: raw.group ? String(raw.group).trim() : 'Builder',
    icon: raw.icon ? String(raw.icon) : '◈',
    fields,
    scopes: outScopes,
    listView,
  };
  if (Array.isArray(raw.filters)) resource.filters = raw.filters.filter((f: any) => fields[String(f)]);
  if (raw.webView && typeof raw.webView === 'object') resource.webView = raw.webView;
  return resource as DefineResourceInput;
}

// Build a CREATE TABLE statement from a normalized resource definition.
export function createTableSql(resource: Resource, tenantScoped = true): string {
  const cols: string[] = [];
  if (tenantScoped) cols.push('"tenantId" TEXT NOT NULL');
  cols.push('"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP');
  cols.push('"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP');
  for (const [key, field] of Object.entries(resource.fields)) {
    const col = `"${key}" ${sqlTypeFor(field)}`;
    cols.push(col);
  }
  const pk = resource.fields.id?.generated ? 'id' : null;
  const table = resource.table;
  let sql = `CREATE TABLE IF NOT EXISTS "${table}" (\n  ${cols.join(',\n  ')}`;
  if (pk) sql += `,\n  PRIMARY KEY ("${pk}")`;
  sql += '\n);';
  return sql;
}

// JSON-serializable view of a resource (for persistence in a JSON column).
export function resourceToJson(r: Resource): any {
  return JSON.parse(JSON.stringify(r));
}
