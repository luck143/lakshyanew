// scripts/migrate/validate-specs.ts
// Static validation: every new-field referenced by a spec MUST exist on the
// target Prisma model (as a scalar or relation field). Under Strategy A we map
// only to real schema fields; everything else folds into `extra`. This catches
// the "guessed a column that has no home" bug class BEFORE any production run.
import { readFileSync } from 'fs';
import { SPECS } from './specs.js';

function modelFields(): Record<string, Set<string>> {
  const path = '/home/neo/projects/lakshyanew/apps/api/prisma/schema.prisma';
  const src = readFileSync(path, 'utf8');
  const models: Record<string, Set<string>> = {};
  const re = /model (\w+) \{([\s\S]*?)\n\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const name = m[1];
    const body = m[2];
    const fields = new Set<string>();
    for (const line of body.split('\n')) {
      const fm = line.trim().match(/^(\w+)\s+/);
      if (fm && !line.includes('@@')) fields.add(fm[1]);
    }
    models[name] = fields;
  }
  return models;
}

async function main() {
  const models = modelFields();
  let problems = 0;
  for (const spec of SPECS) {
    const fields = models[spec.model];
    if (!fields) { console.log(`[${spec.resource}] MODEL MISSING: ${spec.model}`); problems++; continue; }
    for (const nf of Object.keys(spec.fields)) {
      if (!fields.has(nf)) { console.log(`[${spec.resource}] FIELD NOT ON ${spec.model}: ${nf}`); problems++; }
    }
    for (const fk of spec.fks ?? []) {
      if (!fields.has(fk.newField)) { console.log(`[${spec.resource}] FK FIELD NOT ON ${spec.model}: ${fk.newField}`); problems++; }
    }
    if (spec.selfRelation && !fields.has(spec.selfRelation.newField)) {
      console.log(`[${spec.resource}] SELF-REL FIELD NOT ON ${spec.model}: ${spec.selfRelation.newField}`); problems++;
    }
  }
  if (problems === 0) console.log('VALIDATION OK: all spec fields exist on their models.');
  else { console.log(`\n${problems} problem(s) found.`); process.exitCode = 1; }
}
main().catch((e) => { console.error(e); process.exit(1); });
