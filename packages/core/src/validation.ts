// packages/core/src/validation.ts
// Build zod schemas from field definitions — the equivalent of old
// validate_inputs() + map_inserts_from_requirements(), but type-safe.

import { z, ZodTypeAny } from 'zod';
import type { Field, FieldType } from './types.js';

function baseZodForType(type: FieldType): ZodTypeAny {
  switch (type) {
    case 'uuid':
    case 'string':
    case 'text':
    case 'richtext':
      return z.string();
    case 'enum':
      return z.string(); // options enforced separately
    case 'int':
      return z.preprocess((v) => (typeof v === 'string' && v.trim() !== '' ? Number(v) : v), z.number().int());
    case 'float':
      return z.preprocess((v) => (typeof v === 'string' && v.trim() !== '' ? Number(v) : v), z.number());
    case 'bool':
      // Tolerate string booleans from HTML forms ("true"/"false", "1"/"0", "Yes"/"No").
      return z.preprocess((v) => {
        if (typeof v === 'string') {
          const s = v.trim().toLowerCase();
          if (['true', '1', 'yes', 'y', 'on'].includes(s)) return true;
          if (['false', '0', 'no', 'n', 'off', ''].includes(s)) return false;
          return v; // let z.boolean() reject invalid
        }
        return v;
      }, z.boolean());
    case 'date':
      return z.string(); // ISO date
    case 'datetime':
      return z.string(); // ISO datetime
    case 'relation':
      return z.string(); // id reference
    case 'media':
      return z.string(); // url/path
    case 'tags':
      return z.array(z.string());
    case 'json':
      return z.any();
    case 'computed':
    case 'virtual':
      return z.any();
    default:
      return z.any();
  }
}

export function zodForField(field: Field): ZodTypeAny {
  let zod = baseZodForType(field.type);
  const v = field.validate ?? {};

  if (field.type === 'string' || field.type === 'text' || field.type === 'richtext' || field.type === 'uuid') {
    if (typeof v.min === 'number') zod = (zod as z.ZodString).min(v.min);
    if (typeof v.max === 'number') zod = (zod as z.ZodString).max(v.max);
    if (v.email) zod = (zod as z.ZodString).email();
    if (v.regex) zod = (zod as z.ZodString).regex(new RegExp(v.regex));
  }
  if (field.type === 'int' || field.type === 'float') {
    if (typeof v.min === 'number') zod = (zod as z.ZodNumber).min(v.min);
    if (typeof v.max === 'number') zod = (zod as z.ZodNumber).max(v.max);
    if (v.positive) zod = (zod as z.ZodNumber).positive();
  }
  if (field.type === 'enum' && field.options && !Array.isArray(field.options)) {
    const keys = Object.keys(field.options);
    zod = z.enum(keys as [string, ...string[]]);
  }
  return zod;
}

/**
 * Build an input schema for a write operation (create/update).
 * Only editable, non-generated fields are accepted. Respects `required`.
 */
export function inputSchemaFor(resourceName: string, op: 'create' | 'update', getResource: (n: string) => any) {
  const resource = getResource(resourceName);
  if (!resource) throw new Error(`Unknown resource ${resourceName}`);
  const shape: Record<string, ZodTypeAny> = {};
  for (const [key, field] of Object.entries(resource.fields) as [string, Field][]) {
    if (field.generated) continue;
    const editable = field.editable ? field.editable.includes(op) : (op === 'create' || op === 'update');
    if (!editable) continue;
    const required = field.required ? field.required.includes(op) : false;
    let zod = zodForField(field);
    if (!required) {
      zod = zod.optional();
    }
    shape[key] = required ? zod : z.optional(zod);
  }
  // CREATE requires all declared-required fields; UPDATE is partial
  // (PATCH semantics: only provided fields validated), matching the old
  // process_edit behaviour where only submitted inputs are checked.
  const schema = z.object(shape);
  return op === 'update' ? schema.partial() : schema.strict();
}
