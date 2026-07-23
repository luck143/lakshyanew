// packages/core/src/registry.ts
// ResourceRegistry: the single place where resource definitions live.
// Mirrors the old `dimensions()` + `parse_attributes()` but typed and explicit.

import type { DefineResourceInput, Field, Op, Resource, Scope } from './types.js';

class ResourceRegistry {
  private resources = new Map<string, Resource>();

  register(input: DefineResourceInput): Resource {
    if (this.resources.has(input.name)) {
      throw new Error(`Resource "${input.name}" is already registered`);
    }
    const resource: Resource = {
      labelPlural: input.label + 's',
      versioned: false,
      ...input,
    };
    this.validate(resource);
    this.resources.set(resource.name, resource);
    return resource;
  }

  get(name: string): Resource | undefined {
    return this.resources.get(name);
  }

  // Upsert: register if absent, otherwise replace the existing definition.
  // Used by the Resource Builder so edits / delete+recreate propagate to the
  // live registry (the plain `register` throws on duplicate names).
  upsert(input: DefineResourceInput): Resource {
    const resource: Resource = {
      labelPlural: input.label + 's',
      versioned: false,
      ...input,
    };
    this.validate(resource);
    this.resources.set(resource.name, resource);
    return resource;
  }

  // Remove a definition from the live registry (e.g. when a builder resource
  // is deleted). Compile-time resources are never removed here.
  unregister(name: string): void {
    this.resources.delete(name);
  }

  all(): Resource[] {
    return [...this.resources.values()];
  }

  names(): string[] {
    return [...this.resources.keys()];
  }

  private validate(r: Resource): void {
    if (!r.table) throw new Error(`Resource ${r.name}: missing table`);
    if (!r.fields || Object.keys(r.fields).length === 0) {
      throw new Error(`Resource ${r.name}: must declare at least one field`);
    }
    // At least one id/generated field expected; warn otherwise (non-fatal in dev).
    const hasId = Object.values(r.fields).some(f => f.generated && f.type === 'uuid');
    if (!hasId && !r.fields['id']) {
      // not fatal: some resources may use natural keys; log only
      console.warn(`[core] resource "${r.name}" has no uuid id field`);
    }
  }
}

export const registry = new ResourceRegistry();

/**
 * defineResource — the single declaration that powers everything.
 * Equivalent to the old `dimensions()` + `boot()` contract, but explicit.
 */
export function defineResource(input: DefineResourceInput): Resource {
  return registry.register(input);
}

// Re-export Op for convenience
export type { Op, Field, Resource, Scope };
