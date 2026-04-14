// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Scans Angular templates for data-klacksy-target attributes and produces
 * navigation-targets.json in the Api project.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { glob } from 'glob';
import { parse as parseHtml } from 'node-html-parser';

interface TargetEntry {
  targetId: string;
  route: string;
  labelKey: string;
  category?: string;
  requiredPermission?: string;
  sourceFile: string;
  lastScannedAt: string;
  synonyms: Record<string, string[]>;
  synonymStatus: 'pending' | 'generated' | 'reviewed' | 'needs-review';
  obsolete: boolean;
}

const UI_ROOT = resolve(__dirname, '..');
const TEMPLATE_GLOB = 'src/app/presentation/**/*.html';
const ROUTES_FILE_CANDIDATES = [
  resolve(UI_ROOT, 'src/app/app.routes.ts'),
  resolve(UI_ROOT, 'src/app/app-routing.module.ts'),
];
const OUTPUT = resolve(UI_ROOT, '../Klacks.Api/Application/Skills/Definitions/navigation-targets.json');

async function scan(): Promise<void> {
  const files = await glob(TEMPLATE_GLOB, { cwd: UI_ROOT });
  const routesFilePath = ROUTES_FILE_CANDIDATES.find(existsSync);
  const routesSource = routesFilePath ? readFileSync(routesFilePath, 'utf8') : '';

  const newEntries = new Map<string, TargetEntry>();
  for (const file of files) {
    const full = join(UI_ROOT, file);
    const html = readFileSync(full, 'utf8');
    const root = parseHtml(html);
    const nodes = root.querySelectorAll('[data-klacksy-target]');
    for (const n of nodes) {
      const targetId = n.getAttribute('data-klacksy-target')!;
      const labelKey = n.getAttribute('data-klacksy-label-key') ?? '';
      const category = n.getAttribute('data-klacksy-category') ?? undefined;
      const requiredPermission = n.getAttribute('data-klacksy-required-permission') ?? undefined;
      const routeOverride = n.getAttribute('data-klacksy-route') ?? undefined;
      const route = routeOverride ?? resolveRoute(file, routesSource);
      newEntries.set(targetId, {
        targetId, route, labelKey, category, requiredPermission,
        sourceFile: relative(UI_ROOT, full).replace(/\\/g, '/'),
        lastScannedAt: new Date().toISOString(),
        synonyms: {}, synonymStatus: 'pending', obsolete: false
      });
    }
  }

  const existing: TargetEntry[] = existsSync(OUTPUT)
    ? JSON.parse(readFileSync(OUTPUT, 'utf8'))
    : [];

  const merged = new Map<string, TargetEntry>();
  for (const e of existing) merged.set(e.targetId, e);
  for (const [id, fresh] of newEntries) {
    const prev = merged.get(id);
    merged.set(id, {
      ...fresh,
      synonyms: prev?.synonyms ?? fresh.synonyms,
      synonymStatus: prev?.synonymStatus ?? fresh.synonymStatus,
      obsolete: false
    });
  }
  for (const [id, prev] of merged) {
    if (!newEntries.has(id)) merged.set(id, { ...prev, obsolete: true });
  }

  const output = Array.from(merged.values()).sort((a, b) => a.targetId.localeCompare(b.targetId));
  writeFileSync(OUTPUT, JSON.stringify(output, null, 2) + '\n', 'utf8');
  console.log(`Scanned ${newEntries.size} targets across ${files.length} templates. Output: ${OUTPUT}`);
}

function resolveRoute(templateFile: string, routesSource: string): string {
  const componentName = templateFile.match(/([a-z0-9-]+)\.component\.html$/i)?.[1];
  if (!componentName) return '/';
  const pascal = componentName.split('-').map(s => s[0].toUpperCase() + s.slice(1)).join('') + 'Component';
  const regex = new RegExp(`path:\\s*['\"]([^'\"]+)['\"],[^}]*component:\\s*${pascal}`, 's');
  const match = regex.exec(routesSource);
  return match ? '/' + match[1] : '/';
}

scan().catch(err => { console.error(err); process.exit(1); });
