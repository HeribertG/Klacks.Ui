// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Fails the build if any synonym in navigation-targets.json matches a wake-word variant.
 * Prevents accidental bot-name-in-synonyms hallucinations.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(__dirname, '..');
const MANIFEST = resolve(ROOT, '../Klacks.Api/Application/Skills/Definitions/navigation-targets.json');
const VARIANTS = resolve(ROOT, '../Klacks.Api/Application/Klacksy/wake-word-variants.json');
const PLUGINS = resolve(ROOT, '../Klacks.Api/Plugins/Languages');

const cfg = JSON.parse(readFileSync(VARIANTS, 'utf8'));
const bad = new Set<string>([cfg.canonical, ...cfg.variants].map((s: string) => s.toLowerCase()));

function check(source: string, synonyms: string[]): string[] {
  return synonyms.filter(s => bad.has(s.toLowerCase()));
}

let errors = 0;
const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
for (const t of manifest) {
  for (const [loc, syns] of Object.entries<string[]>(t.synonyms ?? {})) {
    const offenders = check(`${t.targetId}/${loc}`, syns);
    if (offenders.length) { console.error(`WAKE-WORD: ${t.targetId}/${loc}: ${offenders.join(', ')}`); errors++; }
  }
}
if (existsSync(PLUGINS)) {
  for (const loc of readdirSync(PLUGINS)) {
    const file = join(PLUGINS, loc, 'navigation-targets.json');
    if (!existsSync(file)) continue;
    const overlay = JSON.parse(readFileSync(file, 'utf8'));
    for (const [tid, entry] of Object.entries<{ synonyms: string[] }>(overlay)) {
      const offenders = check(`${tid}/${loc}`, entry.synonyms);
      if (offenders.length) { console.error(`WAKE-WORD: ${tid}/${loc}: ${offenders.join(', ')}`); errors++; }
    }
  }
}
if (errors) { console.error(`\n${errors} wake-word violations found.`); process.exit(1); }
console.log('wake-word-lint OK');
