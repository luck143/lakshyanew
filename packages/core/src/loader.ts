// packages/core/src/loader.ts
// Loads resource definitions from JSON files (the single source of truth)
// and registers them into the live registry. Replaces the old hand-written
// `apps/api/src/resources.ts`. Every resource is a `*.json` file under
// `../resources/` (relative to this file), so the framework is fully
// metadata-driven with zero per-resource code.
import { readdirSync, readFileSync } from 'node:fs';
import { registry } from './registry.js';

const DIR = new URL('../resources/', import.meta.url);

/**
 * Read every `*.json` resource definition from `dir` (default: the package's
 * `resources/` folder) and upsert it into the registry. `upsert` (not
 * `register`) so a reload / override always wins over any stale in-memory copy.
 * Returns the number of files loaded.
 */
export function loadResourceFiles(dir: URL = DIR): number {
  let n = 0;
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    const def = JSON.parse(readFileSync(new URL(file, dir), 'utf8'));
    registry.upsert(def);
    n++;
  }
  return n;
}
