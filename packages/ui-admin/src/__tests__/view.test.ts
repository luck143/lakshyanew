// packages/ui-admin/src/__tests__/view.test.ts
import { describe, it, expect } from 'vitest';
import { buildView, type AdminMetaPayload } from '../view.js';

// A realistic admin-meta payload as returned by GET /api/meta/topic
const topicMeta: AdminMetaPayload = {
  name: 'topic',
  label: 'Topic',
  labelPlural: 'Topics',
  fields: {
    list: {
      id: { key: 'id', label: 'ID', type: 'uuid', visible: true, editable: false, required: false },
      name: { key: 'name', label: 'Name', type: 'string', visible: true, editable: false, required: false },
      status: { key: 'status', label: 'Status', type: 'enum', visible: true, editable: false, required: false, options: { active: 'Active', hidden: 'Hidden' } },
    },
    create: {
      name: { key: 'name', label: 'Name', type: 'string', visible: true, editable: true, required: true, validate: { min: 1, max: 200 } },
      status: { key: 'status', label: 'Status', type: 'enum', visible: true, editable: true, required: false, options: { active: 'Active', hidden: 'Hidden' } },
      content: { key: 'content', label: 'Content', type: 'richtext', visible: false, editable: true, required: false },
    },
    update: {
      name: { key: 'name', label: 'Name', type: 'string', visible: true, editable: true, required: true },
      status: { key: 'status', label: 'Status', type: 'enum', visible: true, editable: true, required: false, options: { active: 'Active', hidden: 'Hidden' } },
    },
  },
  listView: {
    columns: { name: 'Name', status: 'Status' },
    sortables: { name: 'Name' },
    filters: { status: 'Status', parentId: 'Parent' },
    pageSize: 50,
    defaultSort: 'name',
  },
  filters: ['status', 'parentId'],
  webView: { landing: true, slugField: 'name', detail: true },
};

describe('admin buildView (dynamic generation)', () => {
  it('derives table columns from listView.columns', () => {
    const v = buildView(topicMeta);
    expect(v.columns).toEqual([
      { key: 'name', label: 'Name' },
      { key: 'status', label: 'Status' },
    ]);
  });

  it('derives form fields from create+update (union), with widgets', () => {
    const v = buildView(topicMeta);
    const keys = v.formFields.map((f) => f.key);
    expect(keys).toEqual(expect.arrayContaining(['name', 'status', 'content']));
    const content = v.formFields.find((f) => f.key === 'content')!;
    expect(content.type).toBe('richtext');
    const name = v.formFields.find((f) => f.key === 'name')!;
    expect(name.required).toBe(true);
    expect(name.type).toBe('text');
    const status = v.formFields.find((f) => f.key === 'status')!;
    expect(status.type).toBe('select');
    expect(status.options).toEqual({ active: 'Active', hidden: 'Hidden' });
  });

  it('derives filter fields from declared filters', () => {
    const v = buildView(topicMeta);
    expect(v.filterFields.map((f) => f.key)).toEqual(['status', 'parentId']);
  });

  it('produces a complete ResourceView object', () => {
    const v = buildView(topicMeta);
    expect(v.resource).toBe('topic');
    expect(v.label).toBe('Topic');
    expect(v.columns.length).toBe(2);
  });
});
