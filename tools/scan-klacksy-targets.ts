// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Scans Angular templates for data-klacksy-target attributes and reads the
 * canonical page-key constant. Emits three artifacts that all downstream
 * consumers depend on so there is one single source of truth:
 *
 *   1. navigation-targets.json (Tier-1 matcher manifest)
 *        - page-level entries derived from klacksy-page-keys.ts
 *        - target-level entries derived from data-klacksy-target HTML markers
 *   2. klacksy-page-keys.generated.json (read at runtime by NavigateToSkill)
 *   3. (nothing for the UI; UI imports klacksy-page-keys.ts directly)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, join, relative, dirname } from 'node:path';
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

interface KlacksyPageKeyEntry {
  pageKey: string;
  route: string;
  requiredPermission: string | null;
  hasEntityParam: boolean;
  llmHint?: string;
}

const UI_ROOT = resolve(__dirname, '..');
const TEMPLATE_GLOB = 'src/app/presentation/**/*.html';
const PAGE_KEYS_FILE = resolve(UI_ROOT, 'src/app/domain/constants/klacksy-page-keys.ts');
const API_DEFINITIONS_DIR = resolve(UI_ROOT, '../Klacks.Api/Application/Skills/Definitions');
const TARGETS_OUTPUT = join(API_DEFINITIONS_DIR, 'navigation-targets.json');
const PAGE_KEYS_OUTPUT = join(API_DEFINITIONS_DIR, 'klacksy-page-keys.generated.json');
const SKILL_SEEDS_PATH = join(API_DEFINITIONS_DIR, 'skill-seeds.json');
const SKILL_SEEDS_NAVIGATE_DESCRIPTION_INTRO =
  'Navigate to any page in Klacks the current user is allowed to see.';
const SKILL_SEEDS_NAVIGATE_DESCRIPTION_OUTRO =
  'Additional pages may be added by feature plugins. For finding a person by name use search_and_navigate instead.';

const PAGE_LEVEL_CATEGORY = 'page';
const ROUTE_LEVEL_LABEL_KEY_PREFIX = 'nav.';

function readPageKeys(): KlacksyPageKeyEntry[] {
  if (!existsSync(PAGE_KEYS_FILE)) {
    throw new Error(`Page-keys source not found: ${PAGE_KEYS_FILE}`);
  }
  const source = readFileSync(PAGE_KEYS_FILE, 'utf8');
  const arrayMatch = source.match(/KLACKSY_PAGE_KEYS\s*:\s*(?:ReadonlyArray<[^>]+>|readonly\s+\w+\[\])\s*=\s*\[([\s\S]*?)\];/);
  if (!arrayMatch) {
    throw new Error('Could not locate KLACKSY_PAGE_KEYS array literal in klacksy-page-keys.ts');
  }
  const body = arrayMatch[1];
  const entryRegex = /\{\s*([^}]+?)\s*\},?/g;
  const entries: KlacksyPageKeyEntry[] = [];
  let match: RegExpExecArray | null;
  while ((match = entryRegex.exec(body)) !== null) {
    const fields = match[1];
    const get = (field: string): string | null => {
      const re = new RegExp(`${field}:\\s*(null|'([^']*)'|true|false)`);
      const m = re.exec(fields);
      if (!m) return null;
      if (m[1] === 'null') return null;
      if (m[1] === 'true' || m[1] === 'false') return m[1];
      return m[2] ?? '';
    };
    const pageKey = get('pageKey');
    const route = get('route');
    if (!pageKey || !route) continue;
    const hasEntityParamRaw = get('hasEntityParam');
    entries.push({
      pageKey,
      route,
      requiredPermission: get('requiredPermission'),
      hasEntityParam: hasEntityParamRaw === 'true',
      llmHint: get('llmHint') ?? undefined,
    });
  }
  if (entries.length === 0) {
    throw new Error('Parsed 0 page-key entries from klacksy-page-keys.ts');
  }
  return entries;
}

function buildSkillDescription(pageKeys: KlacksyPageKeyEntry[]): string {
  const parts = pageKeys.map((pk) => {
    const annotations: string[] = [];
    if (pk.llmHint) annotations.push(pk.llmHint);
    if (pk.hasEntityParam) annotations.push('needs entityId');
    return annotations.length > 0 ? `${pk.pageKey} (${annotations.join(', ')})` : pk.pageKey;
  });
  return `${SKILL_SEEDS_NAVIGATE_DESCRIPTION_INTRO} Pages: ${parts.join(', ')}. ${SKILL_SEEDS_NAVIGATE_DESCRIPTION_OUTRO}`;
}

function buildSkillParameterDescription(pageKeys: KlacksyPageKeyEntry[]): string {
  const hintParts = pageKeys
    .filter((pk) => pk.llmHint)
    .map((pk) => `${pk.pageKey} for ${pk.llmHint}${pk.hasEntityParam ? ' (needs entityId)' : ''}`);
  return `The page to navigate to. ${hintParts.join('; ')}.`;
}

function syncSkillSeed(pageKeys: KlacksyPageKeyEntry[]): void {
  if (!existsSync(SKILL_SEEDS_PATH)) {
    console.log(`  skill-seeds.json not found, skipping skill seed sync.`);
    return;
  }

  const raw = readFileSync(SKILL_SEEDS_PATH, 'utf8');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seedFile: any = JSON.parse(raw);
  const skills: any[] = seedFile?.skills ?? [];
  const navigateTo = skills.find((s) => s?.name === 'navigate_to');
  if (!navigateTo) {
    console.log(`  navigate_to skill not found in skill-seeds.json, skipping.`);
    return;
  }

  const newDescription = buildSkillDescription(pageKeys);
  const newEnumValues = pageKeys.map((pk) => pk.pageKey);
  const newParamDescription = buildSkillParameterDescription(pageKeys);

  let changed = false;
  if (navigateTo.description !== newDescription) {
    navigateTo.description = newDescription;
    changed = true;
  }
  const pageParam = navigateTo.parameters?.find((p: any) => p?.name === 'page');
  if (pageParam) {
    const currentEnum: string[] = pageParam.enumValues ?? [];
    if (currentEnum.length !== newEnumValues.length || currentEnum.some((v, i) => v !== newEnumValues[i])) {
      pageParam.enumValues = newEnumValues;
      changed = true;
    }
    if (pageParam.description !== newParamDescription) {
      pageParam.description = newParamDescription;
      changed = true;
    }
  }

  if (!changed) {
    console.log(`  skill-seeds.json/navigate_to already in sync; no changes.`);
    return;
  }

  navigateTo.version = (navigateTo.version ?? 0) + 1;
  writeFileSync(SKILL_SEEDS_PATH, JSON.stringify(seedFile, null, 2) + '\n', 'utf8');
  console.log(`  skill-seeds.json synced: navigate_to bumped to version ${navigateTo.version}.`);
}

function pageLevelEntry(pk: KlacksyPageKeyEntry, now: string): TargetEntry {
  return {
    targetId: pk.pageKey,
    route: pk.route,
    labelKey: ROUTE_LEVEL_LABEL_KEY_PREFIX + pk.pageKey,
    category: PAGE_LEVEL_CATEGORY,
    requiredPermission: pk.requiredPermission ?? undefined,
    sourceFile: 'src/app/domain/constants/klacksy-page-keys.ts',
    lastScannedAt: now,
    synonyms: {},
    synonymStatus: 'pending',
    obsolete: false,
  };
}

async function scan(): Promise<void> {
  const pageKeys = readPageKeys();
  const now = new Date().toISOString();

  const files = await glob(TEMPLATE_GLOB, { cwd: UI_ROOT });

  const newEntries = new Map<string, TargetEntry>();

  // Step 1: page-level entries from the canonical page-keys file.
  for (const pk of pageKeys) {
    newEntries.set(pk.pageKey, pageLevelEntry(pk, now));
  }

  // Step 2: scan HTML templates for data-klacksy-target markers (in-page anchors).
  for (const file of files) {
    const full = join(UI_ROOT, file);
    const html = readFileSync(full, 'utf8');
    const root = parseHtml(html);
    const nodes = root.querySelectorAll('[data-klacksy-target]');
    for (const n of nodes) {
      const targetId = n.getAttribute('data-klacksy-target');
      if (!targetId) continue;

      // A target that re-uses a page-key id is allowed (the marker enriches the
      // page-level entry with a real source file). Otherwise create a new in-page
      // marker entry mapped to the parent route.
      const parentRoute = n.getAttribute('data-klacksy-route') ?? routeFromTemplatePath(file, pageKeys);
      const labelKey = n.getAttribute('data-klacksy-label-key') ?? '';
      const category = n.getAttribute('data-klacksy-category') ?? undefined;
      const requiredPermission = n.getAttribute('data-klacksy-required-permission') ?? undefined;

      const previous = newEntries.get(targetId);
      newEntries.set(targetId, {
        targetId,
        route: previous?.route ?? parentRoute,
        labelKey: previous?.labelKey ?? labelKey,
        category: previous?.category ?? category,
        requiredPermission: previous?.requiredPermission ?? requiredPermission,
        sourceFile: relative(UI_ROOT, full).replace(/\\/g, '/'),
        lastScannedAt: now,
        synonyms: previous?.synonyms ?? {},
        synonymStatus: previous?.synonymStatus ?? 'pending',
        obsolete: false,
      });
    }
  }

  // Step 3: merge with existing file so manually maintained synonyms survive.
  const existing: TargetEntry[] = existsSync(TARGETS_OUTPUT)
    ? JSON.parse(readFileSync(TARGETS_OUTPUT, 'utf8'))
    : [];

  const merged = new Map<string, TargetEntry>();
  for (const e of existing) merged.set(e.targetId, e);

  // Build a route → entries lookup so a renamed page-key (e.g. "absence" → "absences")
  // can inherit synonyms from the soon-to-be-obsolete entry instead of starting empty.
  const existingByRoute = new Map<string, TargetEntry[]>();
  for (const e of existing) {
    if (!e.synonyms || Object.keys(e.synonyms).length === 0) continue;
    if (newEntries.has(e.targetId)) continue;
    const list = existingByRoute.get(e.route) ?? [];
    list.push(e);
    existingByRoute.set(e.route, list);
  }

  for (const [id, fresh] of newEntries) {
    const prev = merged.get(id);
    let synonyms = prev?.synonyms ?? fresh.synonyms;
    let synonymStatus = prev?.synonymStatus ?? fresh.synonymStatus;

    const hasOwnSynonyms = prev?.synonyms && Object.keys(prev.synonyms).length > 0;
    const isPageLevel = fresh.category === PAGE_LEVEL_CATEGORY;
    if (!hasOwnSynonyms && isPageLevel) {
      const donors = existingByRoute.get(fresh.route);
      // Only inherit from another page-level donor — never from a deep marker.
      const donor = donors?.find(
        (d) => d.category === PAGE_LEVEL_CATEGORY && Object.keys(d.synonyms ?? {}).length > 0,
      );
      if (donor) {
        synonyms = donor.synonyms;
        synonymStatus = donor.synonymStatus;
        console.log(`  inherited synonyms: ${donor.targetId} → ${id} (route ${fresh.route})`);
      }
    }

    merged.set(id, {
      ...fresh,
      labelKey: fresh.labelKey || prev?.labelKey || '',
      category: fresh.category ?? prev?.category,
      requiredPermission: fresh.requiredPermission ?? prev?.requiredPermission,
      synonyms,
      synonymStatus,
      obsolete: false,
    });
  }
  for (const [id, prev] of merged) {
    if (!newEntries.has(id)) merged.set(id, { ...prev, obsolete: true });
  }

  const targetsOutput = Array.from(merged.values()).sort((a, b) => a.targetId.localeCompare(b.targetId));
  writeFileSync(TARGETS_OUTPUT, JSON.stringify(targetsOutput, null, 2) + '\n', 'utf8');

  // Step 4: emit the backend-side generated JSON consumed by NavigateToSkill.
  ensureDir(API_DEFINITIONS_DIR);
  const pageKeysOutput = {
    generatedAt: now,
    source: 'Klacks.Ui/src/app/domain/constants/klacksy-page-keys.ts',
    entries: pageKeys,
  };
  writeFileSync(PAGE_KEYS_OUTPUT, JSON.stringify(pageKeysOutput, null, 2) + '\n', 'utf8');

  // Step 5: sync the navigate_to skill seed so description and enum stay in lock-step.
  syncSkillSeed(pageKeys);

  const orphanCount = targetsOutput.filter((t) => !t.sourceFile.startsWith('src/app/domain/constants/') && !files.includes(t.sourceFile)).length;
  console.log(
    `Klacksy SSOT scan complete:\n` +
      `  page-level entries: ${pageKeys.length}\n` +
      `  in-page markers   : ${newEntries.size - pageKeys.length}\n` +
      `  obsolete entries  : ${orphanCount}\n` +
      `  → ${relative(UI_ROOT, TARGETS_OUTPUT)}\n` +
      `  → ${relative(UI_ROOT, PAGE_KEYS_OUTPUT)}`,
  );
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function routeFromTemplatePath(templateFile: string, pageKeys: KlacksyPageKeyEntry[]): string {
  // Map presentation/workplace/<segment>/... templates to the canonical route by
  // matching the deepest folder name against a page-key entry's last route segment.
  const parts = templateFile.split('/');
  for (let i = parts.length - 1; i >= 0; i--) {
    const segment = parts[i];
    const hit = pageKeys.find((pk) => pk.route.endsWith('/' + segment));
    if (hit) return hit.route;
  }
  return '/';
}

scan().catch((err) => {
  console.error(err);
  process.exit(1);
});
