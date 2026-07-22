// packages/core/src/__tests__/nav.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { registry, defineResource, buildNav, accessibleResources } from '../index.js';
import type { Resource } from '../index.js';

const topic: Resource = {
  name: 'topic', table: 'Topic', label: 'Topic', labelPlural: 'Topics', group: 'Content', icon: 'tag',
  fields: { id: { type: 'uuid', label: 'ID', generated: true, visible: ['list'] }, name: { type: 'string', label: 'Name' } },
  scopes: { admin: { access: 'network' }, publisher: { access: 'publisher' } },
};
const secret: Resource = {
  name: 'secret', table: 'Secret', label: 'Secret', labelPlural: 'Secrets', group: 'System',
  fields: { id: { type: 'uuid', label: 'ID', generated: true } },
  scopes: { admin: { access: 'network', perm: ['role_superadmin'] } }, // needs superadmin perm
};

describe('registry-driven navigation + role filtering', () => {
  beforeEach(() => { (registry as any).resources = new Map(); });
  beforeEach(() => { defineResource(topic); defineResource(secret); });

  it('network admin sees all resources', () => {
    const names = accessibleResources({ role: 'network', perms: ['role_superadmin'] });
    expect(names).toEqual(expect.arrayContaining(['topic', 'secret']));
  });

  it('network admin WITHOUT superadmin perm cannot see secret', () => {
    const names = accessibleResources({ role: 'network', perms: [] });
    expect(names).toContain('topic');
    expect(names).not.toContain('secret');
  });

  it('publisher sees topic (publisher scope) but not secret', () => {
    const names = accessibleResources({ role: 'publisher', perms: [] });
    expect(names).toContain('topic');
    expect(names).not.toContain('secret');
  });

  it('buildNav groups resources into sections with hrefs', () => {
    const nav = buildNav({ role: 'network', perms: ['role_superadmin'], basePath: '/panel/network' });
    const content = nav.find((s) => s.group === 'Content');
    expect(content).toBeDefined();
    expect(content!.items.map((i) => i.name)).toContain('topic');
    expect(content!.items[0].href).toBe('/topic');
    expect(content!.items[0].icon).toBe('tag');
  });

  it('buildNav hides perm-gated resources for insufficient role', () => {
    const nav = buildNav({ role: 'network', perms: [], basePath: '/panel/network' });
    const all = nav.flatMap((s) => s.items.map((i) => i.name));
    expect(all).toContain('topic');
    expect(all).not.toContain('secret');
  });
});
