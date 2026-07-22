// packages/codegen/src/run.ts — one-off: emit artifacts to disk (proves codegen).
import { writeFileSync } from 'node:fs';
import { generateAll } from './index.js';
import { registry, defineResource } from '@lakshya/core';

// Ensure resources are registered (importing the api resources registers them).
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const apiResources = await import(pathToFileURL(join(process.cwd(), '../../apps/api/src/resources.ts')).href);
void apiResources;

const out = generateAll();
writeFileSync(new URL('./generated/openapi.json', import.meta.url), JSON.stringify(out.openapi, null, 2));
writeFileSync(new URL('./generated/types.ts', import.meta.url), out.types);
writeFileSync(new URL('./generated/schemas.ts', import.meta.url), `import { z } from 'zod';\n` + out.zod);
writeFileSync(new URL('./generated/client.ts', import.meta.url), out.client);
console.log('Generated artifacts for', registry.names().length, 'resources:');
console.log(' - openapi.json', 'types.ts', 'schemas.ts', 'client.ts');
