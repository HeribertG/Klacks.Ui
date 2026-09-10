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
// Kept short and stable on purpose: SkillSeedDescriptionQualityTests caps skill descriptions at
// 500 chars, and the full page-key list (700+ chars) belongs in the "page" parameter description
// instead (buildSkillParameterDescription below), not in the skill-level description.
const SKILL_SEEDS_NAVIGATE_DESCRIPTION_DEFAULT =
  'Navigate to any page in Klacks the current user is allowed to see.';
// A hand-written description is only replaced when it starts with this marker, so the generator
// never silently overwrites curated seed-hygiene text on an unrelated scan run.
const SKILL_SEEDS_NAVIGATE_DESCRIPTION_REGENERATE_MARKER = '[[regenerate]]';

const PAGE_LEVEL_CATEGORY = 'page';
const ROUTE_LEVEL_LABEL_KEY_PREFIX = 'nav.';

// The in-page target list used to be hand-maintained inside skill-seeds.json and drifted: 52 of the
// scanned in-page targets were missing from it, so the model could not name them at all. It is
// generated from the manifest now; the wording around the list is kept stable on purpose.
const TARGET_PARAM_DESCRIPTION_HEAD =
  'Optional in-page scroll target — matches a data-klacksy-target attribute on the page; use even ' +
  'when already there. Shared prefixes shown as prefix-{a,b,c}. By page: ';
const TARGET_PARAM_DESCRIPTION_TAIL =
  '. These are internal routing keys, not display names — never state one to the user, not even in ' +
  'parentheses next to a translated label; describe the destination in plain business language instead.';
const TARGET_ID_PREFIX_SEPARATOR = '-';
const TARGET_PREFIX_MIN_GROUP_SIZE = 2;
const PAGE_LABEL_SEPARATOR = '/';
const TARGET_LIST_SEPARATOR = ',';
const PAGE_SEGMENT_SEPARATOR = '; ';

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

function buildSkillParameterDescription(pageKeys: KlacksyPageKeyEntry[]): string {
  const hintParts = pageKeys
    .filter((pk) => pk.llmHint)
    .map((pk) => `${pk.pageKey} for ${pk.llmHint}${pk.hasEntityParam ? ' (needs entityId)' : ''}`);
  return `The page to navigate to. ${hintParts.join('; ')}.`;
}

function compressSharedPrefixes(targetIds: string[]): string {
  const grouped = new Map<string, string[]>();
  const standalone: string[] = [];
  for (const id of targetIds) {
    const separatorIndex = id.indexOf(TARGET_ID_PREFIX_SEPARATOR);
    if (separatorIndex <= 0) {
      standalone.push(id);
      continue;
    }
    const prefix = id.slice(0, separatorIndex);
    const remainder = id.slice(separatorIndex + TARGET_ID_PREFIX_SEPARATOR.length);
    const siblings = grouped.get(prefix) ?? [];
    siblings.push(remainder);
    grouped.set(prefix, siblings);
  }

  const parts = [...standalone];
  for (const [prefix, remainders] of grouped) {
    if (remainders.length < TARGET_PREFIX_MIN_GROUP_SIZE) {
      parts.push(`${prefix}${TARGET_ID_PREFIX_SEPARATOR}${remainders[0]}`);
      continue;
    }
    parts.push(`${prefix}${TARGET_ID_PREFIX_SEPARATOR}{${remainders.sort().join(TARGET_LIST_SEPARATOR)}}`);
  }
  return parts.sort().join(TARGET_LIST_SEPARATOR);
}

function buildTargetParameterDescription(
  pageKeys: KlacksyPageKeyEntry[],
  targets: TargetEntry[],
): string {
  const pageKeysByRoute = new Map<string, string[]>();
  for (const pk of pageKeys) {
    const keys = pageKeysByRoute.get(pk.route) ?? [];
    keys.push(pk.pageKey);
    pageKeysByRoute.set(pk.route, keys);
  }

  const inPageByRoute = new Map<string, string[]>();
  for (const target of targets) {
    if (target.obsolete) continue;
    if (target.category === PAGE_LEVEL_CATEGORY) continue;
    if (!target.route) continue;
    const ids = inPageByRoute.get(target.route) ?? [];
    ids.push(target.targetId);
    inPageByRoute.set(target.route, ids);
  }

  const segments: string[] = [];
  const routes = Array.from(inPageByRoute.keys()).sort((a, b) => a.localeCompare(b));
  for (const route of routes) {
    const label = (pageKeysByRoute.get(route) ?? [route]).join(PAGE_LABEL_SEPARATOR);
    const ids = (inPageByRoute.get(route) ?? []).slice().sort((a, b) => a.localeCompare(b));
    segments.push(`${label}: ${compressSharedPrefixes(ids)}`);
  }

  return TARGET_PARAM_DESCRIPTION_HEAD + segments.join(PAGE_SEGMENT_SEPARATOR) + TARGET_PARAM_DESCRIPTION_TAIL;
}

function syncSkillSeed(pageKeys: KlacksyPageKeyEntry[], targets: TargetEntry[]): void {
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

  const snapshot = () =>
    JSON.stringify({ description: navigateTo.description, parameters: navigateTo.parameters });
  const before = snapshot();

  const currentDescription: string = navigateTo.description ?? '';
  if (
    currentDescription.length === 0 ||
    currentDescription.startsWith(SKILL_SEEDS_NAVIGATE_DESCRIPTION_REGENERATE_MARKER)
  ) {
    navigateTo.description = SKILL_SEEDS_NAVIGATE_DESCRIPTION_DEFAULT;
  }

  const newEnumValues = pageKeys.map((pk) => pk.pageKey);
  const newParamDescription = buildSkillParameterDescription(pageKeys);
  const pageParam = navigateTo.parameters?.find((p: any) => p?.name === 'page');
  if (pageParam) {
    pageParam.enumValues = newEnumValues;
    pageParam.description = newParamDescription;
  }

  // Deliberately NOT an enumValues list: target is only valid relative to the resolved route, so a
  // flat global enum would authorise cross-page values. NavigateToSkill validates it server-side.
  const targetParam = navigateTo.parameters?.find((p: any) => p?.name === 'target');
  if (targetParam) {
    targetParam.description = buildTargetParameterDescription(pageKeys, targets);
  }

  // Byte-compare instead of tracking a `changed` flag field-by-field, so a second, no-op run of
  // this script is always diff-free and never bumps the version.
  if (snapshot() === before) {
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

function registerMarker(
  newEntries: Map<string, TargetEntry>,
  targetId: string,
  full: string,
  now: string,
  opts: { route: string; labelKey?: string; category?: string; requiredPermission?: string },
): void {
  const previous = newEntries.get(targetId);
  newEntries.set(targetId, {
    targetId,
    route: previous?.route ?? opts.route,
    labelKey: previous?.labelKey ?? (opts.labelKey ?? ''),
    category: previous?.category ?? opts.category,
    requiredPermission: previous?.requiredPermission ?? opts.requiredPermission,
    sourceFile: relative(UI_ROOT, full).replace(/\\/g, '/'),
    lastScannedAt: now,
    synonyms: previous?.synonyms ?? {},
    synonymStatus: previous?.synonymStatus ?? 'pending',
    obsolete: false,
  });
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
      registerMarker(newEntries, targetId, full, now, {
        route: parentRoute,
        labelKey: n.getAttribute('data-klacksy-label-key') ?? undefined,
        category: n.getAttribute('data-klacksy-category') ?? undefined,
        requiredPermission: n.getAttribute('data-klacksy-required-permission') ?? undefined,
      });
    }

    // Some reusable components (e.g. SearchInputComponent) take a `klacksyTarget` @Input and
    // render [attr.data-klacksy-target] themselves, so the literal marker string never appears
    // in any single template — it is only known statically at the call site, as a plain
    // (unbound) `klacksyTarget="..."` attribute on the component tag. Recognize that literal
    // form here too. A bound form like `[klacksyTarget]="expr"` is intentionally NOT matched
    // (negative lookbehind on `[`): its value is dynamic and not knowable from source text.
    const inputPropertyTargetRegex = /(?<!\[)\bklacksyTarget\s*=\s*(?:"([^"]+)"|'([^']+)')/g;
    for (const m of html.matchAll(inputPropertyTargetRegex)) {
      const targetId = m[1] ?? m[2];
      if (!targetId) continue;
      registerMarker(newEntries, targetId, full, now, { route: routeFromTemplatePath(file, pageKeys) });
    }
  }

  // Step 3: merge with existing file so manually maintained synonyms survive.
  const existingRaw = existsSync(TARGETS_OUTPUT) ? readFileSync(TARGETS_OUTPUT, 'utf8') : null;
  const existing: TargetEntry[] = existingRaw ? JSON.parse(existingRaw) : [];

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

    const candidate: TargetEntry = {
      ...fresh,
      labelKey: fresh.labelKey || prev?.labelKey || '',
      category: fresh.category ?? prev?.category,
      requiredPermission: fresh.requiredPermission ?? prev?.requiredPermission,
      synonyms,
      synonymStatus,
      obsolete: false,
    };
    // Keep the previous timestamp for content-identical entries so a repeated
    // scan is diff-free (the CI gate diffs navigation-targets.json).
    if (prev && sameContentIgnoringScanTimestamp(candidate, prev)) {
      candidate.lastScannedAt = prev.lastScannedAt;
    }
    merged.set(id, candidate);
  }
  for (const [id, prev] of merged) {
    if (!newEntries.has(id)) merged.set(id, { ...prev, obsolete: true });
  }

  const targetsOutput = Array.from(merged.values()).sort((a, b) => a.targetId.localeCompare(b.targetId));
  const targetsSerialized = JSON.stringify(targetsOutput, null, 2) + '\n';
  if (existingRaw === null || normalizeLineEndings(existingRaw) !== targetsSerialized) {
    writeFileSync(TARGETS_OUTPUT, targetsSerialized, 'utf8');
  }

  // Step 4: emit the backend-side generated JSON consumed by NavigateToSkill.
  // Rewritten only when the payload changed so a repeated scan stays diff-free.
  ensureDir(API_DEFINITIONS_DIR);
  const pageKeysOutput = {
    generatedAt: now,
    source: 'Klacks.Ui/src/app/domain/constants/klacksy-page-keys.ts',
    entries: pageKeys,
  };
  if (pageKeysPayloadChanged(pageKeysOutput)) {
    writeFileSync(PAGE_KEYS_OUTPUT, JSON.stringify(pageKeysOutput, null, 2) + '\n', 'utf8');
  }

  // Step 5: sync the navigate_to skill seed so description and enum stay in lock-step.
  syncSkillSeed(pageKeys, targetsOutput);

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

function sameContentIgnoringScanTimestamp(a: TargetEntry, b: TargetEntry): boolean {
  return (
    a.targetId === b.targetId &&
    a.route === b.route &&
    a.labelKey === b.labelKey &&
    a.category === b.category &&
    a.requiredPermission === b.requiredPermission &&
    a.sourceFile === b.sourceFile &&
    a.synonymStatus === b.synonymStatus &&
    a.obsolete === b.obsolete &&
    JSON.stringify(a.synonyms) === JSON.stringify(b.synonyms)
  );
}

function pageKeysPayloadChanged(next: { source: string; entries: KlacksyPageKeyEntry[] }): boolean {
  if (!existsSync(PAGE_KEYS_OUTPUT)) return true;
  try {
    const previous = JSON.parse(readFileSync(PAGE_KEYS_OUTPUT, 'utf8'));
    return previous.source !== next.source || JSON.stringify(previous.entries) !== JSON.stringify(next.entries);
  } catch {
    return true;
  }
}

function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, '\n');
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function routeFromTemplatePath(templateFile: string, pageKeys: KlacksyPageKeyEntry[]): string {
  // Map presentation/workplace/<segment>/... templates to the canonical route by
  // matching the deepest folder name against a page-key entry's last route segment.
  // glob returns backslash-separated paths on Windows, so split on both separators.
  const parts = templateFile.split(/[\\/]/);
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
