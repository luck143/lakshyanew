// packages/core/src/metadata.ts
// The "metadata compiler": derives per-operation field sets and the admin
// schema (the equivalent of old all_requirements / table_requirements).

import type { Field, Op, Resource } from './types.js';

export interface FieldMeta extends Omit<Field, 'visible' | 'editable' | 'required'> {
  key: string;
  required: boolean;
  visible: boolean;
  editable: boolean;
}

export type MetaByOp = Record<Op, Record<string, FieldMeta>>;

const ALL_OPS: Op[] = ['list', 'get', 'create', 'update', 'delete', 'bulk'];

function matches(op: Op, list?: Op[]): boolean {
  if (!list) return true;
  return list.includes(op);
}

/**
 * Build the per-operation field metadata for a resource.
 * Same idea as old parse_attributes(type) returning only fields where
 * $dim[field][type]['include'] is true.
 */
export function metaForResource(resource: Resource): MetaByOp {
  const out: MetaByOp = { list: {}, get: {}, create: {}, update: {}, delete: {}, bulk: {} };
  for (const op of ALL_OPS) {
    const fields: Record<string, FieldMeta> = {};
    for (const [key, field] of Object.entries(resource.fields)) {
      const visible = matches(op, field.visible);
      // delete op does not need field bodies
      if (op === 'delete') continue;
      // Generated (server-set) fields are never client-editable; only surface
      // them on read ops (list/get) where they are marked visible.
      if (field.generated && op !== 'list' && op !== 'get') continue;
      const editable = matches(op, field.editable ?? ['create', 'update']);
      const required = matches(op, field.required);
      if (!visible && !editable && op !== 'list' && op !== 'get') continue;
      // For list/get, include visible fields. For create/update, include editable.
      if ((op === 'list' || op === 'get') && !visible) continue;
      if ((op === 'create' || op === 'update') && !editable) continue;
      fields[key] = {
        ...field,
        key,
        required,
        visible,
        editable,
      };
    }
    out[op] = fields;
  }
  return out;
}

/**
 * Admin list-view schema: which columns, sortables, filters.
 * Equivalent to old table_requirements() output.
 */
export function listViewMeta(resource: Resource) {
  const meta = metaForResource(resource);
  const listFields = meta['list'] ?? meta['get'];
  const columns: Record<string, string> = {};
  const sortables: Record<string, string> = {};
  const filters: Record<string, string> = {};
  for (const [key, f] of Object.entries(listFields)) {
    const ui = f.ui ?? {};
    if (ui.columns) columns[key] = f.label;
    if (ui.sortable) sortables[key] = f.label;
    if (ui.filterable) filters[key] = f.label;
  }
  return {
    columns,
    sortables,
    filters,
    defaultSort: resource.listView?.defaultSort,
    defaultOrder: resource.listView?.defaultOrder ?? 'desc',
    pageSize: resource.listView?.pageSize ?? 50,
  };
}

/**
 * Full admin metadata payload for a resource — what the generic admin UI consumes.
 * Equivalent to old GET /resource/all_requirements.
 */
export function adminMeta(resource: Resource) {
  return {
    name: resource.name,
    label: resource.label,
    labelPlural: resource.labelPlural,
    fields: metaForResource(resource),
    listView: listViewMeta(resource),
    filters: resource.filters ?? Object.keys(listViewMeta(resource).filters),
    webView: resource.webView ?? null,
  };
}
