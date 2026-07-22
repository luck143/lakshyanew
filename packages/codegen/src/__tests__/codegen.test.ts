// packages/codegen/src/__tests__/codegen.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { registry, defineResource } from '@lakshya/core';
import { generateAll, genZod, genTypes, genOpenAPI, genClient } from '../index.js';
import type { Resource } from '@lakshya/core';

const topic: Resource = {
  name: 'topic', table: 'Topic', label: 'Topic', labelPlural: 'Topics',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    name: { type: 'string', label: 'Name', required: ['create', 'update'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], validate: { min: 1, max: 200 } },
    status: { type: 'enum', label: 'Status', options: { active: 'Active', hidden: 'Hidden' }, default: 'active', editable: ['create', 'update'], visible: ['list', 'get'] },
  },
  scopes: { admin: { access: 'network' } },
};

describe('codegen', () => {
  beforeEach(() => { (registry as any).resources = new Map(); });
  beforeEach(() => defineResource(topic));

  it('emits a zod create schema with required name', () => {
    const z = genZod(registry.get('topic')!);
    expect(z).toContain('topicCreateSchema');
    expect(z).toContain('name: z.string().min(1).max(200)');
    expect(z).not.toContain('id:'); // generated excluded
  });

  it('emits TS interface with optional generated fields', () => {
    const t = genTypes(registry.get('topic')!);
    expect(t).toContain('export interface Topic');
    expect(t).toContain('id?: string;'); // nullable/generated
    expect(t).toContain('name: string;');
  });

  it('emits OpenAPI paths for list/get/create/update/delete', () => {
    const oa = genOpenAPI([registry.get('topic')!]);
    expect(oa.openapi).toBe('3.0.0');
    expect(oa.paths['/api/topic']).toBeDefined();
    expect(oa.paths['/api/topic/{id}'].delete).toBeDefined();
    expect(oa.components.schemas.Topic).toBeDefined();
  });

  it('emits a typed client with CRUD methods', () => {
    const c = genClient([registry.get('topic')!]);
    expect(c).toContain('listTopics');
    expect(c).toContain('createTopic');
    expect(c).toContain('deleteTopic');
    expect(c).toContain('ApiEnvelope');
  });

  it('generateAll combines all artifacts', () => {
    const all = generateAll();
    expect(all.zod).toContain('topicCreateSchema');
    expect(all.types).toContain('interface Topic');
    expect(all.client).toContain('api =');
    expect(all.openapi.paths['/api/topic']).toBeDefined();
  });
});
