// packages/core/src/__tests__/core.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { registry, defineResource, metaForResource, listViewMeta, adminMeta, inputSchemaFor } from '../index.js';
import type { Resource } from '../types.js';

const topicResource: Resource = {
  name: 'topic',
  table: 'topics',
  label: 'Topic',
  labelPlural: 'Topics',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    name: {
      type: 'string', label: 'Name',
      required: ['create', 'update'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'],
      validate: { min: 1, max: 200 },
      ui: { columns: true, sortable: true, filterable: true },
    },
    parentId: {
      type: 'relation', label: 'Parent',
      options: { resource: 'topic', labelField: 'name' },
      editable: ['create', 'update'], visible: ['list', 'get'],
      ui: { filterable: true },
    },
    status: {
      type: 'enum', label: 'Status',
      options: { active: 'Active', hidden: 'Hidden', pending: 'Pending' },
      default: 'active',
      editable: ['create', 'update'], visible: ['list', 'get'],
      ui: { columns: true, filterable: true },
    },
    content: {
      type: 'richtext', label: 'Content',
      editable: ['create', 'update'], visible: ['get'],
    },
  },
  scopes: { admin: { access: 'network' }, publisher: { access: 'publisher' } },
  listView: { columns: ['name', 'status'], defaultSort: 'name', pageSize: 50 },
  filters: ['status', 'parentId'],
};

describe('metadata engine', () => {
  beforeEach(() => registry.all().length && (registry as any).resources?.clear?.());
  beforeEach(() => {
    // reset registry between tests
    (registry as any).resources = new Map();
  });

  it('registers a resource once', () => {
    defineResource(topicResource);
    expect(registry.get('topic')).toBeDefined();
    expect(() => defineResource(topicResource)).toThrow();
  });

  it('derives per-op field sets (list/get vs create/update)', () => {
    defineResource(topicResource);
    const meta = metaForResource(registry.get('topic')!);
    // list shows columns only
    expect(Object.keys(meta.list)).toEqual(expect.arrayContaining(['id', 'name', 'parentId', 'status']));
    // create requires name, excludes generated id
    expect(meta.create['name'].required).toBe(true);
    expect(meta.create['id']).toBeUndefined();
    expect(meta.create['content']).toBeDefined();
  });

  it('builds list-view metadata (columns/sortables/filters)', () => {
    defineResource(topicResource);
    const lv = listViewMeta(registry.get('topic')!);
    expect(lv.columns).toEqual({ name: 'Name', status: 'Status' });
    expect(lv.sortables).toEqual({ name: 'Name' });
    expect(lv.filters).toEqual({ name: 'Name', status: 'Status', parentId: 'Parent' });
    expect(lv.pageSize).toBe(50);
  });

  it('produces admin meta payload', () => {
    defineResource(topicResource);
    const am = adminMeta(registry.get('topic')!);
    expect(am.name).toBe('topic');
    expect(am.fields.create['name'].required).toBe(true);
  });

  it('builds a zod input schema that rejects unknown + missing required', () => {
    defineResource(topicResource);
    const schema = inputSchemaFor('topic', 'create', (n) => registry.get(n));
    const bad = schema.safeParse({ foo: 'bar' });
    expect(bad.success).toBe(false); // unknown field rejected (strict)
    const missing = schema.safeParse({});
    expect(missing.success).toBe(false); // name required
    const good = schema.safeParse({ name: 'Algebra', status: 'active' });
    expect(good.success).toBe(true);
    const badStatus = schema.safeParse({ name: 'Algebra', status: 'nope' });
    expect(badStatus.success).toBe(false); // enum enforced
  });
});
