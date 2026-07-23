// packages/codegen/src/run.ts — one-off: emit artifacts to disk (proves codegen).
import { writeFileSync } from 'node:fs';
import { generateAll } from './index.js';
import { registry, loadResourceFiles } from '@lakshya/core';

// Load resource definitions from JSON files (single source of truth).
loadResourceFiles();

const out = generateAll();
writeFileSync(new URL('./generated/openapi.json', import.meta.url), JSON.stringify(out.openapi, null, 2));
writeFileSync(new URL('./generated/types.ts', import.meta.url), out.types);
writeFileSync(new URL('./generated/schemas.ts', import.meta.url), `import { z } from 'zod';\n` + out.zod);
writeFileSync(new URL('./generated/client.ts', import.meta.url), out.client);
console.log('Generated artifacts for', registry.names().length, 'resources:');
console.log(' - openapi.json', 'types.ts', 'schemas.ts', 'client.ts');
