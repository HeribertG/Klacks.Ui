// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Generates synonyms for pending navigation targets via LLM.
 * Primary meaning source is the on-screen card text captured in
 * docs/knowledge/klacksy-navigation-anchors.json (see buildMeaningAnchor), resolved into the
 * TARGET locale via that locale's own translations.json/i18n file (see getTranslations) — the
 * model sees genuine native-script screen text, not a translation task. Only when a key has no
 * translation in that locale, or a piece of the anchor has no key at all (headline/sectionHeadline
 * text scraped straight from a template), does that one piece fall back to German, and that is
 * reported back to the caller instead of happening silently. Generic UI chrome (Cancel, Save,
 * Name, ...) that recurs across many targets is filtered out of the anchor entirely, or pushed to
 * the back of the truncation queue, via getGenericWordIndex — computed per locale from the
 * resolved text, not the German text, since a German-only word list would not match the
 * localized anchor of a non-German prompt.
 * A small, unambiguously mappable subset of targets also gets hand-written German vocabulary from
 * the KlacksyKnowledge explain-page seed docs (see loadKnowledgeVocab); that vocabulary stays
 * German (it has no per-locale translation) and is always presented to the model as such.
 * The targetId slug and labelKey are only a technical fallback shown to the model for orientation.
 * Modes: default run generates pending core-locale targets (+ plugin overlays); --dry-run prints
 * the finished prompts for a few example targets (or the SYNONYM_ONLY_TARGETS/SYNONYM_ONLY_LOCALES
 * selection) to the console without calling any API or writing any file; --plugins-only fills missing plugin overlays only; --core-only skips plugin
 * locales; --force regenerates even already-generated pairs; --regenerate re-creates the core
 * synonyms of the (non-reviewed) targets listed in SYNONYM_ONLY_TARGETS. SYNONYM_ONLY_LOCALES
 * restricts both core and plugin locales. A failed or empty model answer never overwrites
 * existing synonyms.
 * Resume: tools/generate-synonyms-progress.json records every (targetId, locale) pair that has
 * already been written to disk, so a restarted run skips completed pairs instead of repeating
 * LLM calls (see loadProgress/markDone/isDone). All writes to the manifest, plugin overlays and
 * the progress file go through writeJsonAtomic (tmp file + rename + re-read verification).
 * Env (optional): SYNONYM_LLM_BASE_URL, SYNONYM_LLM_API_KEY, SYNONYM_LLM_MODEL, SYNONYM_LLM_PROVIDER_ID,
 * SYNONYM_CONCURRENCY (model calls in flight, default 1; see runPool), SYNONYM_PROGRESS_PATH (separate
 * progress file, required when two runs overlap — each holds the file in memory and rewrites it whole).
 * Falls back to the enabled provider in llm_providers (default: deepseek) when env vars are absent.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, renameSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { SENTENCE_THRESHOLDS } from './synonym-gate';

interface TargetEntry {
  targetId: string; route: string; labelKey: string; category?: string;
  synonyms: Record<string, string[]>; synonymStatus: string; obsolete?: boolean;
}

interface LlmConfig { url: string; key: string; model: string; }

interface VisibleText { key: string; text: string; kind: string; }
interface AnchorEntry {
  targetId: string;
  labelResolved: string | null;
  headline: string | null;
  sectionHeadline: string | null;
  visibleTexts: VisibleText[];
  obsolete: boolean;
}
interface AnchorsFile { generatedAt: string; targetCount: number; targets: AnchorEntry[]; }

interface MeaningAnchor {
  text: string;
  usedLegacyFallback: boolean;
  usedGermanTextFallback: boolean;
  hasOnScreenText: boolean;
}

interface ProgressState { completed: Record<string, true>; }

interface RawCandidate { text: string; fellBack: boolean; basePriority: number; }
interface ResolvedAnchorItem { text: string; priority: number; fellBack: boolean; }
interface GenericWordIndex { hardDrop: Set<string>; deprioritize: Set<string>; }

const UI_ROOT = resolve(__dirname, '..');
const MANIFEST = resolve(UI_ROOT, '../Klacks.Api/Application/Skills/Definitions/navigation-targets.json');
const PLUGINS_ROOT = resolve(UI_ROOT, '../Klacks.Api/Plugins/Languages');
const FEATURES_ROOT = resolve(UI_ROOT, '../Klacks.Api/Plugins/Features');
const FEATURE_I18N_DIRECTORY = 'i18n';
const CORE_I18N_ROOT = resolve(UI_ROOT, 'src/assets/i18n');
const ANCHORS_PATH = resolve(UI_ROOT, '../docs/knowledge/klacksy-navigation-anchors.json');
const KNOWLEDGE_ROOT = resolve(UI_ROOT, '../Klacks.Api/Infrastructure/Persistence/Seed/KlacksyKnowledge');
const PROGRESS_PATH = process.env.SYNONYM_PROGRESS_PATH ?? resolve(UI_ROOT, 'tools/generate-synonyms-progress.json');
const CORE_LOCALES = ['de', 'en', 'fr', 'it'];
const PLUGIN_LOCALES = ['ar','cs','da','el','es','fi','he','id','ja','ko','ms','nb','nl','pl','pt','ro','sv','th','vi','zh-CN','zh-TW'];
const PSQL_PATH = process.env.PSQL_PATH ?? 'C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe';
const DB_HOST = process.env.KLACKS_DB_HOST ?? 'localhost';
const DB_PORT = process.env.KLACKS_DB_PORT ?? '5434';
const DB_USER = process.env.KLACKS_DB_USER ?? 'postgres';
const DB_PASSWORD = process.env.KLACKS_DB_PASSWORD ?? 'admin';
const DB_NAME = process.env.KLACKS_DB_NAME ?? 'klacks';

const PHRASES_PER_TARGET = 6;
const MAX_ANCHOR_VISIBLE_TEXTS = 12;
const KNOWLEDGE_NAME_PREFIX = 'explain_page_';
const KNOWLEDGE_VOCAB_MAX_TOKENS = SENTENCE_THRESHOLDS['de'].max;
const PROMPT_ALLOWED_ACRONYMS = ['erp', 'xml', 'pdf', 'api', 'csv'];
const DRY_RUN_TARGET_IDS = ['erp-drop-points', 'overtime', 'dashboard'];
const DRY_RUN_LOCALES = ['de', 'ja', 'th'];

/**
 * Frequency thresholds for cross-target UI chrome ("Cancel", "Save", "Name", ...): text that
 * recurs across many unrelated targets describes the app's dialog furniture, not the target
 * itself, and drowns out real vocabulary once truncated to MAX_ANCHOR_VISIBLE_TEXTS. Text seen on
 * >= HARD_DROP_MIN_TARGETS targets is dropped outright; text seen on DEPRIORITIZE_MIN_TARGETS..
 * HARD_DROP_MIN_TARGETS-1 targets is kept but ranked below every real anchor item, so it only
 * survives truncation when nothing better is available. The two-tier split (rather than one cutoff)
 * exists because domain terms shared by a small related group of targets (e.g. "Nachtzuschlag",
 * "Feiertagszuschlag" across the surcharge-mode targets) can legitimately reach 4-7 targets; a
 * single low cutoff would discard those along with the real chrome.
 */
const HARD_DROP_MIN_TARGETS = 8;
const DEPRIORITIZE_MIN_TARGETS = 4;
const DEPRIORITIZED_TIER_OFFSET = 100;
const HARD_DROP_RESCUE_TIER_OFFSET = 1000;

const LOCALE_DISPLAY_NAMES: Record<string, string> = {
  de: 'German', en: 'English', fr: 'French', it: 'Italian', ar: 'Arabic', cs: 'Czech', da: 'Danish',
  el: 'Greek', es: 'Spanish', fi: 'Finnish', he: 'Hebrew', id: 'Indonesian', ja: 'Japanese',
  ko: 'Korean', ms: 'Malay', nb: 'Norwegian Bokmål', nl: 'Dutch', pl: 'Polish', pt: 'Portuguese',
  ro: 'Romanian', sv: 'Swedish', th: 'Thai', vi: 'Vietnamese', 'zh-CN': 'Simplified Chinese', 'zh-TW': 'Traditional Chinese',
};

function localeDisplayName(locale: string): string {
  return LOCALE_DISPLAY_NAMES[locale] ?? locale;
}

let cachedConfig: LlmConfig | null = null;

function fetchProviderFromDb(providerId: string): { apiKey: string; baseUrl: string } | null {
  try {
    const sql = `SELECT api_key || '|' || COALESCE(base_url, '') FROM llm_providers WHERE provider_id='${providerId}' AND is_enabled=true AND api_key IS NOT NULL AND LENGTH(api_key) > 0 LIMIT 1`;
    const out = execFileSync(PSQL_PATH, ['-h', DB_HOST, '-p', DB_PORT, '-U', DB_USER, '-d', DB_NAME, '-t', '-A', '-c', sql], {
      encoding: 'utf8',
      env: { ...process.env, PGPASSWORD: DB_PASSWORD }
    }).trim();
    if (!out) return null;
    const sep = out.indexOf('|');
    const apiKey = sep === -1 ? out : out.slice(0, sep);
    const baseUrl = sep === -1 ? '' : out.slice(sep + 1);
    return { apiKey, baseUrl };
  } catch {
    return null;
  }
}

function resolveConfig(): LlmConfig {
  if (cachedConfig) return cachedConfig;

  const providerId = process.env.SYNONYM_LLM_PROVIDER_ID ?? 'deepseek';
  const model = process.env.SYNONYM_LLM_MODEL ?? `${providerId}-chat`;

  let key = process.env.SYNONYM_LLM_API_KEY ?? '';
  let url = process.env.SYNONYM_LLM_BASE_URL ?? '';

  if (!key || !url) {
    const dbProvider = fetchProviderFromDb(providerId);
    if (!key && dbProvider?.apiKey) {
      key = dbProvider.apiKey;
      console.log(`[generate-synonyms] Using ApiKey from llm_providers (${providerId})`);
    }
    if (!url && dbProvider?.baseUrl) {
      const trimmed = dbProvider.baseUrl.replace(/\/$/, '');
      url = `${trimmed}/chat/completions`;
    }
  }

  if (!url) url = 'https://api.deepseek.com/v1/chat/completions';
  if (!key) throw new Error('SYNONYM_LLM_API_KEY not set and no enabled provider with ApiKey found in llm_providers.');

  cachedConfig = { url, key, model };
  return cachedConfig;
}

function humanizeId(id: string): string {
  return id.replace(/[-.]/g, ' ').replace(/\s+/g, ' ').trim();
}

function loadAnchors(): Map<string, AnchorEntry> {
  const map = new Map<string, AnchorEntry>();
  if (!existsSync(ANCHORS_PATH)) return map;
  const data = JSON.parse(readFileSync(ANCHORS_PATH, 'utf8')) as AnchorsFile;
  for (const entry of data.targets) map.set(entry.targetId, entry);
  return map;
}

const translationsCache = new Map<string, Record<string, string>>();

/**
 * Loads the flat key -> translated-string map for one locale: Klacks.Ui/src/assets/i18n/{locale}.json
 * for the four core locales, Klacks.Api/Plugins/Languages/{locale}/translations.json for every
 * plugin locale. This is the same file pair synonym-gate.ts reads (loadTranslations there) — not
 * imported from it because the task scope only sanctions exporting the sentence-threshold table
 * from that file, so this is a deliberate, small duplication rather than widening that export.
 */
function getTranslations(locale: string): Record<string, string> {
  const cached = translationsCache.get(locale);
  if (cached) return cached;
  const path = CORE_LOCALES.includes(locale) ? join(CORE_I18N_ROOT, `${locale}.json`) : join(PLUGINS_ROOT, locale, 'translations.json');
  const data: Record<string, string> = { ...readJsonOrEmpty(path) };
  for (const [key, value] of Object.entries(readFeaturePluginTranslations(locale))) {
    if (!(key in data)) data[key] = value;
  }
  translationsCache.set(locale, data);
  return data;
}

function readJsonOrEmpty(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Feature plugins (messaging, ...) ship their own UI texts in Plugins/Features/{plugin}/i18n/{locale}.json,
 * which the app merges at runtime. Anchor keys of plugin-owned targets (e.g. profile-messengers) only
 * resolve there; without this merge every non-core locale fell back to German text for them.
 */
function readFeaturePluginTranslations(locale: string): Record<string, string> {
  if (!existsSync(FEATURES_ROOT)) return {};
  const merged: Record<string, string> = {};
  for (const plugin of readdirSync(FEATURES_ROOT)) {
    Object.assign(merged, readJsonOrEmpty(join(FEATURES_ROOT, plugin, FEATURE_I18N_DIRECTORY, `${locale}.json`)));
  }
  return merged;
}

let germanReverseIndexCache: Map<string, string> | null = null;

/**
 * headline/sectionHeadline/labelResolved carry no i18n key of their own in the anchors file (they
 * were scraped straight from the template). Most of them, however, turn out to be the exact
 * German value of SOME OTHER key elsewhere in de.json (typically a section/category label used by
 * several targets) — spot-checked at 61/61 sectionHeadline and 17/18 headline occurrences across
 * the manifest. This index (first key wins on a value collision — acceptable here since it is only
 * a best-effort secondary resolution path, not a source of truth) lets rawFromUnkeyedField/
 * rawFromLabel recover a real translation instead of falling back to German for what would
 * otherwise be roughly half of all (target, locale) pairs.
 */
function getGermanReverseIndex(): Map<string, string> {
  if (germanReverseIndexCache) return germanReverseIndexCache;
  const de = getTranslations('de');
  const map = new Map<string, string>();
  for (const key of Object.keys(de)) {
    if (!map.has(de[key])) map.set(de[key], key);
  }
  germanReverseIndexCache = map;
  return map;
}

const genericWordIndexCache = new Map<string, GenericWordIndex>();

/**
 * Builds the per-locale generic-UI-chrome index (see HARD_DROP_MIN_TARGETS docs above) by counting,
 * for every visibleTexts key across every active target, on how many DISTINCT targets its text
 * resolved into THIS locale appears. Counting on the resolved text (not the key, not the German
 * text) matters: a denylist built from German strings ("Abbrechen") would silently fail to match
 * the same chrome once it is legitimately shown in Japanese ("キャンセル"), so it must be
 * recomputed per locale from what the model will actually see.
 * Label, headline and section headline are counted too: a section headline shared by nine targets
 * ("Compliance & Zuschlagsregeln") otherwise entered every one of their anchors at the top priority,
 * and the model turned it into phrases ("zuschläge") that point at the wrong target.
 */
function getGenericWordIndex(locale: string, manifest: TargetEntry[], anchorsById: Map<string, AnchorEntry>): GenericWordIndex {
  const cached = genericWordIndexCache.get(locale);
  if (cached) return cached;

  const translations = getTranslations(locale);
  const germanReverseIndex = getGermanReverseIndex();
  const targetCountByText = new Map<string, number>();
  for (const t of manifest) {
    if (t.obsolete) continue;
    const entry = anchorsById.get(t.targetId);
    if (!entry) continue;
    const seenInTarget = new Set<string>();
    const unkeyedTexts = [
      rawFromLabel(t, { ...entry, visibleTexts: [] }, translations, germanReverseIndex)?.text,
      rawFromUnkeyedField(entry.headline, [], translations, germanReverseIndex)?.text,
      rawFromUnkeyedField(entry.sectionHeadline, [], translations, germanReverseIndex)?.text,
    ];
    const texts = [...unkeyedTexts, ...entry.visibleTexts.map(v => translations[v.key] ?? v.text)];
    for (const text of texts) {
      const resolved = (text ?? '').trim().toLowerCase();
      if (!resolved || seenInTarget.has(resolved)) continue;
      seenInTarget.add(resolved);
      targetCountByText.set(resolved, (targetCountByText.get(resolved) ?? 0) + 1);
    }
  }

  const hardDrop = new Set<string>();
  const deprioritize = new Set<string>();
  for (const [text, count] of targetCountByText) {
    if (count >= HARD_DROP_MIN_TARGETS) hardDrop.add(text);
    else if (count >= DEPRIORITIZE_MIN_TARGETS) deprioritize.add(text);
  }

  const index: GenericWordIndex = { hardDrop, deprioritize };
  genericWordIndexCache.set(locale, index);
  return index;
}

function tokenCount(phrase: string): number {
  return phrase.split(/\s+/).filter(Boolean).length;
}

interface KnowledgeFrontmatter { name: string; triggerKeywords: string[]; synonymsDe: string[]; }

function parseKnowledgeFrontmatter(content: string): KnowledgeFrontmatter | null {
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) return null;
  const fm = fmMatch[1];
  const nameMatch = fm.match(/^name:\s*(\S+)\s*$/m);
  if (!nameMatch) return null;
  const triggerBlockMatch = fm.match(/^triggerKeywords:\s*\n((?:\s*-\s*.+\n?)+)/m);
  const triggerKeywords = triggerBlockMatch
    ? triggerBlockMatch[1].split('\n').map(l => l.replace(/^\s*-\s*/, '').trim()).filter(Boolean)
    : [];
  const deMatch = fm.match(/^\s{2}de:\s*\[([^\]]*)\]/m);
  const synonymsDe = deMatch
    ? deMatch[1].split(',').map(s => s.trim()).filter(Boolean)
    : [];
  return { name: nameMatch[1].trim(), triggerKeywords, synonymsDe };
}

/**
 * Maps a KlacksyKnowledge explain-page doc to its navigation targetId, e.g.
 * "explain_page_settings_erp_drop_points" -> "erp-drop-points". The doc name always starts with
 * "explain_page_"; the remainder becomes the candidate id after underscore-to-hyphen conversion.
 * Some explain-page docs live under a "settings_" sub-prefix that the navigation targetId does
 * not carry (the doc is about the settings section, the target is the card itself), so a second
 * attempt strips a leading "settings-" before giving up. Returns null rather than guessing when
 * neither form matches a known targetId (per spec: no fuzzy mapping).
 */
function resolveKnowledgeTargetId(explainName: string, knownTargetIds: Set<string>): string | null {
  if (!explainName.startsWith(KNOWLEDGE_NAME_PREFIX)) return null;
  const slug = explainName.slice(KNOWLEDGE_NAME_PREFIX.length).replace(/_/g, '-');
  if (knownTargetIds.has(slug)) return slug;
  const settingsPrefix = 'settings-';
  if (slug.startsWith(settingsPrefix)) {
    const stripped = slug.slice(settingsPrefix.length);
    if (knownTargetIds.has(stripped)) return stripped;
  }
  return null;
}

/**
 * Loads hand-written user vocabulary (triggerKeywords + German synonyms) from the KlacksyKnowledge
 * explain-page seed docs, for the small subset of targets where the doc-to-target mapping is
 * unambiguous (see resolveKnowledgeTargetId). Entries longer than the German sentence threshold
 * are dropped: these docs answer "explain this page" questions, so most of their synonyms.de
 * entries are full questions ("was sehe ich hier", "erkläre diese seite") that are not navigation
 * vocabulary; the short leftover entries ("bestellungsimport", "erp drop point") are. This
 * vocabulary has no per-locale translation in the source docs, so it stays German for every
 * target locale and is always labelled as such in the prompt.
 */
function loadKnowledgeVocab(knownTargetIds: Set<string>): Map<string, string[]> {
  const result = new Map<string, string[]>();
  if (!existsSync(KNOWLEDGE_ROOT)) return result;
  const files = readdirSync(KNOWLEDGE_ROOT).filter(f => f.endsWith('.md'));
  for (const file of files) {
    const content = readFileSync(join(KNOWLEDGE_ROOT, file), 'utf8');
    const parsed = parseKnowledgeFrontmatter(content);
    if (!parsed) continue;
    const targetId = resolveKnowledgeTargetId(parsed.name, knownTargetIds);
    if (!targetId) continue;
    if (result.has(targetId)) {
      console.warn(`[generate-synonyms] Ambiguous knowledge mapping for "${targetId}" (file "${file}" also resolves to it); keeping the first match.`);
      continue;
    }
    const merged = [...new Set([...parsed.triggerKeywords, ...parsed.synonymsDe])]
      .filter(phrase => tokenCount(phrase) <= KNOWLEDGE_VOCAB_MAX_TOKENS);
    result.set(targetId, merged);
  }
  return result;
}

/**
 * Priority order for visible-text kinds when the anchor has to be truncated (see
 * MAX_ANCHOR_VISIBLE_TEXTS): headlines and interactive labels name the concept, while info/other
 * text is often long help copy or error strings that waste the truncation budget without adding
 * meaning. Generic UI chrome (see getGenericWordIndex) is pushed below all of these tiers via
 * DEPRIORITIZED_TIER_OFFSET. Array.prototype.sort is stable, so items of equal priority keep
 * their on-screen order.
 */
const VISIBLE_TEXT_KIND_PRIORITY: Record<string, number> = {
  headline: 0, button: 1, label: 2, placeholder: 3, tooltip: 4, info: 5, other: 6,
};

function rawFromVisibleText(v: VisibleText, translations: Record<string, string>): RawCandidate {
  const resolved = translations[v.key];
  return { text: resolved ?? v.text, fellBack: !resolved, basePriority: VISIBLE_TEXT_KIND_PRIORITY[v.kind] ?? 6 };
}

/**
 * headline/sectionHeadline carry no i18n key of their own (they were scraped straight from the
 * template, see sourceOfAnchor in the anchors file), so they cannot be resolved into another
 * locale directly. Resolution is tried in order: (1) this target's own keyed visibleTexts — if one
 * has the identical German text, that keyed entry already covers it, so this returns null rather
 * than adding a redundant duplicate; (2) the global German reverse index (getGermanReverseIndex),
 * which recovers a real key for the common case of a shared section/category label; (3) German
 * text, as a last resort.
 */
function rawFromUnkeyedField(germanText: string | null, visibleTexts: VisibleText[], translations: Record<string, string>, germanReverseIndex: Map<string, string>): RawCandidate | null {
  if (!germanText || !germanText.trim()) return null;
  if (visibleTexts.some(v => v.text === germanText)) return null;
  const key = germanReverseIndex.get(germanText);
  if (key) {
    const resolved = translations[key];
    if (resolved) return { text: resolved, fellBack: false, basePriority: VISIBLE_TEXT_KIND_PRIORITY['headline'] };
  }
  return { text: germanText, fellBack: true, basePriority: VISIBLE_TEXT_KIND_PRIORITY['headline'] };
}

/**
 * labelResolved also carries no key of its own, but the target's OWN labelKey (already present on
 * the manifest entry, e.g. "settings.erpDropPoints") resolves correctly in every locale, so it is
 * tried before the German reverse index and before falling back to the German labelResolved text.
 */
function rawFromLabel(target: TargetEntry, anchorEntry: AnchorEntry | undefined, translations: Record<string, string>, germanReverseIndex: Map<string, string>): RawCandidate | null {
  const germanText = anchorEntry?.labelResolved ?? null;
  if (!germanText || !germanText.trim()) return null;
  if (anchorEntry && anchorEntry.visibleTexts.some(v => v.text === germanText)) return null;
  const viaLabelKey = translations[target.labelKey];
  if (viaLabelKey) return { text: viaLabelKey, fellBack: false, basePriority: VISIBLE_TEXT_KIND_PRIORITY['headline'] };
  const key = germanReverseIndex.get(germanText);
  if (key) {
    const resolved = translations[key];
    if (resolved) return { text: resolved, fellBack: false, basePriority: VISIBLE_TEXT_KIND_PRIORITY['headline'] };
  }
  return { text: germanText, fellBack: true, basePriority: VISIBLE_TEXT_KIND_PRIORITY['headline'] };
}

/**
 * Classifies one raw candidate against the generic-word index. With rescueHardDropped=false
 * (the normal pass), text seen on >= HARD_DROP_MIN_TARGETS targets is dropped outright. That is
 * only safe as long as SOME candidate survives per target — an anchor emptied entirely by hard-drop
 * would otherwise fall through to the legacy de/en-synonym branch in buildMeaningAnchor, i.e. the
 * exact wrong-language vocabulary this rewrite exists to stop using. buildMeaningAnchor detects
 * that case and re-classifies with rescueHardDropped=true, which admits hard-dropped text back in
 * at the lowest possible tier (HARD_DROP_RESCUE_TIER_OFFSET) — generic screen text in the correct
 * language still beats no on-screen text at all.
 */
function classify(raw: RawCandidate | null, genericIndex: GenericWordIndex, rescueHardDropped: boolean): ResolvedAnchorItem | null {
  if (!raw) return null;
  const trimmed = raw.text.trim();
  if (!trimmed) return null;
  const norm = trimmed.toLowerCase();
  const isHardDropped = genericIndex.hardDrop.has(norm);
  if (isHardDropped && !rescueHardDropped) return null;
  const priority = isHardDropped
    ? HARD_DROP_RESCUE_TIER_OFFSET + raw.basePriority
    : genericIndex.deprioritize.has(norm) ? DEPRIORITIZED_TIER_OFFSET + raw.basePriority : raw.basePriority;
  return { text: trimmed, priority, fellBack: raw.fellBack };
}

/**
 * Builds the primary meaning source handed to the LLM, resolved into the target locale: on-screen
 * card text (headline, section headline, resolved label, visible texts — see rawFrom* / classify)
 * plus, when available, hand-written German knowledge vocabulary. Generic UI chrome is dropped or
 * deprioritized (see getGenericWordIndex) before the MAX_ANCHOR_VISIBLE_TEXTS truncation, so real
 * vocabulary is not crowded out by "Cancel"/"Save"/"Name" — unless dropping it would empty the
 * anchor entirely, in which case it is rescued back in (see classify's rescueHardDropped pass):
 * generic text in the correct language still beats the legacy fallback below.
 * Only when a target has no anchor data AND no knowledge vocabulary at all does this fall back to
 * the legacy behaviour (previously generated de/en synonyms) — reported via usedLegacyFallback.
 * Individual anchor items that had no translation for this locale (rare: 24/3575 target x locale
 * pairs across the full dataset) fall back to German text — reported via usedGermanTextFallback —
 * instead of happening silently. hasOnScreenText tells the caller whether the "on-screen text"
 * line is actually present in anchor.text, so a prompt cannot reference it when it is not there
 * (e.g. a target with knowledge vocabulary but no anchor entry at all).
 */
function buildMeaningAnchor(
  target: TargetEntry,
  anchorEntry: AnchorEntry | undefined,
  knowledgeVocab: string[],
  locale: string,
  translations: Record<string, string>,
  genericIndex: GenericWordIndex,
): MeaningAnchor {
  const visibleTexts = anchorEntry?.visibleTexts ?? [];
  const germanReverseIndex = getGermanReverseIndex();
  const rawCandidates: (RawCandidate | null)[] = [
    rawFromLabel(target, anchorEntry, translations, germanReverseIndex),
    rawFromUnkeyedField(anchorEntry?.headline ?? null, visibleTexts, translations, germanReverseIndex),
    rawFromUnkeyedField(anchorEntry?.sectionHeadline ?? null, visibleTexts, translations, germanReverseIndex),
    ...visibleTexts.map(v => rawFromVisibleText(v, translations)),
  ];

  let candidates = rawCandidates
    .map(raw => classify(raw, genericIndex, false))
    .filter((item): item is ResolvedAnchorItem => item !== null);
  const hadRawContent = rawCandidates.some(raw => raw !== null);
  if (!candidates.length && hadRawContent) {
    candidates = rawCandidates
      .map(raw => classify(raw, genericIndex, true))
      .filter((item): item is ResolvedAnchorItem => item !== null);
  }
  candidates.sort((a, b) => a.priority - b.priority);

  const seen = new Set<string>();
  const kept: ResolvedAnchorItem[] = [];
  for (const c of candidates) {
    const norm = c.text.toLowerCase();
    if (seen.has(norm)) continue;
    seen.add(norm);
    kept.push(c);
    if (kept.length >= MAX_ANCHOR_VISIBLE_TEXTS) break;
  }

  const dedupedPrimary = kept.map(k => k.text);
  const germanTextFallbackUsed = locale !== 'de' && kept.some(k => k.fellBack);
  const dedupedKnowledge = [...new Set(knowledgeVocab)];

  if (!dedupedPrimary.length && !dedupedKnowledge.length) {
    const en = (target.synonyms?.['en'] ?? []).slice(0, 6);
    const de = (target.synonyms?.['de'] ?? []).slice(0, 6);
    const parts: string[] = [];
    if (en.length) parts.push(`English: ${en.join(', ')}`);
    if (de.length) parts.push(`German: ${de.join(', ')}`);
    if (!parts.length) return { text: '', usedLegacyFallback: false, usedGermanTextFallback: false, hasOnScreenText: false };
    return {
      text: `No on-screen text is recorded for this target; these previously generated synonyms define its meaning (use them ONLY to grasp the meaning, never translate literally): ${parts.join(' || ')}.`,
      usedLegacyFallback: true,
      usedGermanTextFallback: false,
      hasOnScreenText: false,
    };
  }

  const onScreenLabel = germanTextFallbackUsed
    ? `${localeDisplayName(locale)}, with a few entries falling back to German where no translation exists`
    : localeDisplayName(locale);
  const bits: string[] = [];
  if (dedupedPrimary.length) bits.push(`on-screen text (${onScreenLabel}): ${dedupedPrimary.join(', ')}`);
  if (dedupedKnowledge.length) bits.push(`known user vocabulary (German): ${dedupedKnowledge.join(', ')}`);
  return {
    text: `This is what the user actually sees on screen — the PRIMARY source of meaning: ${bits.join(' || ')}.`,
    usedLegacyFallback: false,
    usedGermanTextFallback: germanTextFallbackUsed,
    hasOnScreenText: dedupedPrimary.length > 0,
  };
}

function buildBrevityInstruction(locale: string): string {
  const threshold = SENTENCE_THRESHOLDS[locale];
  if (threshold.unit === 'chars') {
    return `${locale} is written without spaces between words, so length is measured in characters here: each phrase must be at most ${threshold.max} characters, and at least two of the ${PHRASES_PER_TARGET} phrases must be a single short concept, not a description.`;
  }
  return `Each phrase must be at most ${threshold.max} word${threshold.max === 1 ? '' : 's'} — a short noun phrase, never a full sentence — and at least two of the ${PHRASES_PER_TARGET} phrases must be a single word.`;
}

/**
 * Explains, for the target locale, which parts of the anchor above are genuine native vocabulary
 * the model may draw on directly, and which parts are German and must not be copied verbatim.
 * Before the on-screen text was resolved per locale (see buildMeaningAnchor), this instruction
 * blanket-banned copying the whole reference; now that the "on-screen text" line is usually
 * already in the target language, a blanket ban would tell the model to avoid the exact
 * vocabulary it should be using, so the two sources are addressed separately.
 */
function buildAntiBleedInstruction(locale: string, anchor: MeaningAnchor): string {
  const localeName = localeDisplayName(locale);
  if (anchor.usedLegacyFallback) {
    return locale === 'de'
      ? ' The reference above is a legacy fallback shown in English/German because this target has no recorded on-screen text or knowledge vocabulary; use it only to grasp the meaning, do not translate it.'
      : ` No on-screen text is recorded for this target, so the reference above falls back to previously generated English/German synonyms shown only so you understand the concept — do not copy them verbatim or translate them word-for-word. Write natural, idiomatic ${localeName} vocabulary; technical acronyms (${PROMPT_ALLOWED_ACRONYMS.join(', ')}) and established loanwords may be kept as-is.`;
  }
  if (locale === 'de') return '';
  if (!anchor.hasOnScreenText) {
    return ` The "known user vocabulary" reference above is German — do not copy those words verbatim into your ${localeName} phrases; write natural, idiomatic ${localeName} vocabulary instead. Technical acronyms (${PROMPT_ALLOWED_ACRONYMS.join(', ')}) and established international loanwords may be kept as-is.`;
  }
  const fallbackNote = anchor.usedGermanTextFallback
    ? ' A few "on-screen text" entries above are explicitly marked as a German fallback because no translation exists for them — do not copy those verbatim.'
    : '';
  return ` The "on-screen text (${localeName})" reference above is genuine ${localeName} vocabulary from the app itself — you may draw on it directly.${fallbackNote} The separate "known user vocabulary" reference is German — do not copy those words verbatim into your ${localeName} phrases; write natural, idiomatic ${localeName} vocabulary for anything not already covered by the on-screen text. Technical acronyms (${PROMPT_ALLOWED_ACRONYMS.join(', ')}) and established international loanwords may be kept as-is.`;
}

/**
 * Without on-screen text the model sees the reference vocabulary next to the technical id and label
 * key, and it followed the slug instead of the reference: "client-list" got customer phrases in five
 * languages although its reference synonyms say employees — in Klacks a client is a person record.
 * This makes the reference vocabulary the authority whenever no on-screen text anchors the meaning.
 * @param anchor - Meaning anchor of the target; the instruction applies only without on-screen text
 */
function buildAnchorlessMeaningInstruction(anchor: MeaningAnchor): string {
  if (anchor.hasOnScreenText || !anchor.text) return '';
  return 'Because this target has no on-screen text, the reference vocabulary below DEFINES what it means. The id and label key are internal technical names and can be misleading — in this app "client" means an employee (a person record), not a customer. Wherever the id or label key suggests a different meaning than the reference vocabulary, follow the reference vocabulary.';
}

function buildPrompt(target: TargetEntry, locale: string, label: string, anchor: MeaningAnchor): string {
  const idConcept = humanizeId(target.targetId);
  const labelHint = label && label.toLowerCase() !== idConcept.toLowerCase() ? `, technical label key suffix: "${label}"` : '';
  const brevity = buildBrevityInstruction(locale);
  const antiBleed = buildAntiBleedInstruction(locale, anchor);

  return [
    'You generate in-app navigation synonyms for Klacks, a workforce scheduling application (shifts, employees, absences, contracts, settings).',
    `Navigation target: "${idConcept}" (internal id: "${target.targetId}"${labelHint}, section: "${target.category ?? 'n/a'}", route: "${target.route}"). The id, label key and section are only a technical fallback for orientation — they are NOT what the user sees on screen.`,
    buildAnchorlessMeaningInstruction(anchor),
    anchor.text,
    `Task: write ${PHRASES_PER_TARGET} short noun phrases (bare keywords, not sentences) a native ${locale} speaker would naturally type or say to jump to this target.`,
    brevity,
    'Rules: no imperative verbs ("open", "navigate to", "show me" or their translations), no politeness prefixes ("please", "bitte"), no leading articles — the app strips these before matching anyway. Lowercase where the script has case. No duplicates, no markdown, EXCLUDE the bot name "klacksy" and any of its variants.',
    'Every phrase must name THIS target itself. The on-screen text also lists the fields inside the card; a field that names a separate feature (a mode, a rule set, a neighbouring card) is context, not a name for this target — a user typing that word wants the other feature. Never use the wording of a single field, column or option as a phrase unless it is the main subject of the card.',
    antiBleed,
    `Write every phrase in the natural native script and orthography of ${locale} (e.g. Japanese uses the normal Kanji/Hiragana/Katakana mix, Chinese uses Hanzi, Korean uses Hangul) — never romanized or transliterated text.`,
    'Output a strict JSON array of strings, nothing else.',
  ].filter(Boolean).join(' ');
}

/**
 * JSON mode forces the model to answer with an object, and it picks the property name itself
 * ("synonyms", "phrases", "keywords", ...). Takes the known names first, then the first array
 * of strings found at the top level, so an unexpected name yields phrases instead of an empty list.
 * @param parsed - The parsed message content of the model's answer
 */
function extractPhraseArray(parsed: unknown): string[] {
  if (Array.isArray(parsed)) return parsed;
  if (!parsed || typeof parsed !== 'object') return [];
  const record = parsed as Record<string, unknown>;
  const known = record['synonyms'] ?? record['phrases'];
  if (Array.isArray(known)) return known;
  const firstArray = Object.values(record).find(v => Array.isArray(v) && v.every(item => typeof item === 'string'));
  return (firstArray as string[] | undefined) ?? [];
}

async function callLlm(target: TargetEntry, locale: string, label: string, anchor: MeaningAnchor): Promise<string[]> {
  const { url, key, model } = resolveConfig();
  const prompt = buildPrompt(target, locale, label, anchor);

  const body = JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' } });
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body
      });
      if (!res.ok) throw new Error(`LLM ${res.status}`);
      const data = await res.json() as { choices: { message: { content: string } }[] };
      const content = data.choices[0].message.content;
      const arr = extractPhraseArray(JSON.parse(content));
      const unique = [...new Set(arr.map(s => String(s).toLowerCase().trim()).filter(Boolean))];
      return unique.slice(0, PHRASES_PER_TARGET);
    } catch (e) {
      if (attempt === maxAttempts) throw e;
      console.warn(`  retry ${attempt}/${maxAttempts} (${target.targetId}/${locale}): ${e}`);
      await sleep(1000 * attempt);
    }
  }
  return [];
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

const SKIP_PLUGINS = process.env.SYNONYM_SKIP_PLUGINS === '1' || process.argv.includes('--core-only');
const PLUGINS_ONLY = process.env.SYNONYM_PLUGINS_ONLY === '1' || process.argv.includes('--plugins-only');
const ONLY_LOCALES = (process.env.SYNONYM_ONLY_LOCALES ?? '').split(',').map(s => s.trim()).filter(Boolean);
const ONLY_TARGETS = (process.env.SYNONYM_ONLY_TARGETS ?? '').split(',').map(s => s.trim()).filter(Boolean);
const ACTIVE_PLUGIN_LOCALES = ONLY_LOCALES.length ? PLUGIN_LOCALES.filter(l => ONLY_LOCALES.includes(l)) : PLUGIN_LOCALES;
const ACTIVE_CORE_LOCALES = ONLY_LOCALES.length ? CORE_LOCALES.filter(l => ONLY_LOCALES.includes(l)) : CORE_LOCALES;
const FORCE = process.env.SYNONYM_FORCE === '1' || process.argv.includes('--force');
const REGENERATE = process.argv.includes('--regenerate');
const DEFAULT_CONCURRENCY = 1;
const CONCURRENCY = Math.max(1, Number(process.env.SYNONYM_CONCURRENCY ?? DEFAULT_CONCURRENCY) || DEFAULT_CONCURRENCY);
const REVIEWED_STATUS = 'reviewed';
const PENDING_STATUS = 'pending';

/**
 * Core-mode target selection. Pending targets always qualify. --regenerate additionally re-creates
 * the targets named in SYNONYM_ONLY_TARGETS even when already generated — but never a reviewed
 * target, whose synonyms are hand-checked and must not be overwritten by a model.
 * @param t - Manifest entry to check
 */
function isCoreCandidate(t: TargetEntry): boolean {
  if (t.synonymStatus === PENDING_STATUS) return true;
  return REGENERATE && ONLY_TARGETS.includes(t.targetId) && t.synonymStatus !== REVIEWED_STATUS;
}
const DRY_RUN = process.argv.includes('--dry-run');

/**
 * Writes JSON atomically: a .tmp file is written and verified first (parses as JSON, does not
 * start with a NUL byte), only then renamed onto the target path, which is re-verified the same
 * way. A failed verification throws and leaves the target file untouched — the .tmp is kept for
 * inspection rather than risking a half-written or NUL-padded target file (five overlay files were
 * corrupted this way before this function existed).
 */
function writeJsonAtomic(path: string, data: unknown): void {
  const tmp = `${path}.tmp`;
  const text = JSON.stringify(data, null, 2) + '\n';
  writeFileSync(tmp, text, 'utf8');
  const tmpBuf = readFileSync(tmp);
  if (tmpBuf.length === 0 || tmpBuf[0] === 0x00) {
    throw new Error(`Refusing to publish ${path}: temp file failed integrity check (empty or NUL-prefixed). Kept ${tmp} for inspection.`);
  }
  JSON.parse(tmpBuf.toString('utf8'));
  renameSync(tmp, path);
  const finalBuf = readFileSync(path);
  if (finalBuf.length === 0 || finalBuf[0] === 0x00) {
    throw new Error(`Post-rename verification failed (NUL/empty) for ${path}.`);
  }
  JSON.parse(finalBuf.toString('utf8'));
}

function loadProgress(): ProgressState {
  if (!existsSync(PROGRESS_PATH)) return { completed: {} };
  try {
    return JSON.parse(readFileSync(PROGRESS_PATH, 'utf8')) as ProgressState;
  } catch {
    console.warn(`[generate-synonyms] Could not parse progress file, starting fresh: ${PROGRESS_PATH}`);
    return { completed: {} };
  }
}

function progressKey(targetId: string, locale: string): string {
  return `${targetId}|${locale}`;
}

function isDone(progress: ProgressState, targetId: string, locale: string): boolean {
  return progress.completed[progressKey(targetId, locale)] === true;
}

function markDone(progress: ProgressState, targetId: string, locale: string): void {
  progress.completed[progressKey(targetId, locale)] = true;
  writeJsonAtomic(PROGRESS_PATH, progress);
}

function pluginOverlayHasTarget(loc: string, targetId: string): boolean {
  const file = join(PLUGINS_ROOT, loc, 'navigation-targets.json');
  if (!existsSync(file)) return false;
  try {
    const overlay = JSON.parse(readFileSync(file, 'utf8'));
    return targetId in overlay;
  } catch {
    return false;
  }
}

interface GenerationJob { target: TargetEntry; locale: string; }

/**
 * Runs jobs with at most SYNONYM_CONCURRENCY model calls in flight. Safe for the shared manifest,
 * overlay and progress files because every write happens synchronously right after a job's await
 * resolves — Node never interleaves two synchronous blocks, so a read-modify-write of one file
 * cannot be split by another job.
 * @param jobs - (target, locale) pairs to generate
 * @param worker - Generates and persists one pair
 */
async function runPool(jobs: GenerationJob[], worker: (job: GenerationJob) => Promise<void>): Promise<void> {
  let next = 0;
  const laneCount = Math.min(CONCURRENCY, jobs.length);
  const lanes = Array.from({ length: laneCount }, async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      await worker(job);
    }
  });
  await Promise.all(lanes);
}

/**
 * Plugin (overlay) jobs for one target. A pair already recorded in the progress file is always
 * skipped, so a killed run resumes where it stopped; without force a pair whose overlay already
 * holds the target is skipped too. A fresh forced run therefore needs the progress file removed.
 */
function collectPluginJobs(t: TargetEntry, force: boolean, progress: ProgressState): GenerationJob[] {
  return ACTIVE_PLUGIN_LOCALES
    .filter(loc => !isDone(progress, t.targetId, loc) && (force || !pluginOverlayHasTarget(loc, t.targetId)))
    .map(loc => ({ target: t, locale: loc }));
}

async function generatePluginJob(
  job: GenerationJob,
  manifest: TargetEntry[],
  anchorsById: Map<string, AnchorEntry>,
  knowledgeById: Map<string, string[]>,
  progress: ProgressState,
): Promise<void> {
  const { target: t, locale: loc } = job;
  const anchor = buildMeaningAnchor(t, anchorsById.get(t.targetId), knowledgeById.get(t.targetId) ?? [], loc, getTranslations(loc), getGenericWordIndex(loc, manifest, anchorsById));
  if (anchor.usedLegacyFallback) console.warn(`[generate-synonyms] ${t.targetId}/${loc}: no visible-text anchor recorded, using legacy synonym fallback`);
  console.log(`→ ${t.targetId} / ${loc} (plugin)`);
  let synonyms: string[];
  try {
    synonyms = await callLlm(t, loc, labelOf(t), anchor);
  } catch (e) {
    console.error(`  ✗ skipped ${t.targetId}/${loc}: ${e}`);
    return;
  }
  if (!synonyms.length) {
    console.error(`  ✗ empty result ${t.targetId}/${loc}, skipped`);
    return;
  }
  const file = join(PLUGINS_ROOT, loc, 'navigation-targets.json');
  mkdirSync(dirname(file), { recursive: true });
  const overlay = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  overlay[t.targetId] = { synonyms, status: 'generated' };
  writeJsonAtomic(file, overlay);
  markDone(progress, t.targetId, loc);
}

async function generateCoreJob(
  job: GenerationJob,
  manifest: TargetEntry[],
  anchorsById: Map<string, AnchorEntry>,
  knowledgeById: Map<string, string[]>,
  progress: ProgressState,
): Promise<void> {
  const { target: t, locale: loc } = job;
  const anchor = buildMeaningAnchor(t, anchorsById.get(t.targetId), knowledgeById.get(t.targetId) ?? [], loc, getTranslations(loc), getGenericWordIndex(loc, manifest, anchorsById));
  if (anchor.usedLegacyFallback) console.warn(`[generate-synonyms] ${t.targetId}/${loc}: no visible-text anchor recorded, using legacy synonym fallback`);
  console.log(`→ ${t.targetId} / ${loc}`);
  let generated: string[];
  try {
    generated = await callLlm(t, loc, labelOf(t), anchor);
  } catch (e) {
    console.error(`  ✗ skipped ${t.targetId}/${loc}, existing synonyms kept: ${e}`);
    return;
  }
  if (!generated.length) {
    console.error(`  ✗ empty result ${t.targetId}/${loc}, existing synonyms kept`);
    return;
  }
  t.synonyms[loc] = generated;
  writeJsonAtomic(MANIFEST, manifest);
  markDone(progress, t.targetId, loc);
}

/**
 * Removes overlay entries whose target id the core manifest no longer knows. The generator only ever
 * adds (overlay[targetId] = ...), so a target that was renamed or deleted keeps its synonyms in every
 * plugin overlay forever; LanguagePluginContentInstaller then writes them into
 * navigation_target_synonym on install, where NavigationTargetCacheService can no longer resolve them.
 * Targets flagged obsolete are deliberately kept: that flag is reversible, and regenerating their
 * translations would cost one LLM call per locale.
 * @param manifest - Core navigation targets, the single source of truth for valid target ids
 * @returns Number of overlay entries removed across all active plugin locales
 */
function prunePluginOverlays(manifest: TargetEntry[]): number {
  const known = new Set(manifest.map(t => t.targetId));
  let removed = 0;
  for (const loc of ACTIVE_PLUGIN_LOCALES) {
    const file = join(PLUGINS_ROOT, loc, 'navigation-targets.json');
    if (!existsSync(file)) continue;
    let overlay: Record<string, unknown>;
    try {
      overlay = JSON.parse(readFileSync(file, 'utf8'));
    } catch (e) {
      console.error(`  ✗ could not read overlay ${loc}: ${e}`);
      continue;
    }
    const stale = Object.keys(overlay).filter(id => !known.has(id));
    if (!stale.length) continue;
    for (const id of stale) delete overlay[id];
    writeJsonAtomic(file, overlay);
    console.log(`  pruned ${stale.length} stale target(s) from ${loc}: ${stale.join(', ')}`);
    removed += stale.length;
  }
  return removed;
}

function labelOf(t: TargetEntry): string {
  return t.labelKey.split('.').pop() ?? t.targetId;
}

/**
 * Scans every active target across every locale this script targets (core + plugin) and counts,
 * without calling any API, how many (target, locale) pairs need the German fallback described in
 * buildMeaningAnchor (usedLegacyFallback: no anchor/knowledge data at all; usedGermanTextFallback:
 * some anchor text had no translation for that locale). Purely diagnostic — printed by --dry-run
 * to make the actual size of both fallback paths visible instead of asserting it.
 */
function reportFallbackStats(manifest: TargetEntry[], anchorsById: Map<string, AnchorEntry>, knowledgeById: Map<string, string[]>): void {
  const allLocales = [...CORE_LOCALES, ...PLUGIN_LOCALES];
  let legacyFallbackPairs = 0;
  let germanTextFallbackPairs = 0;
  let totalPairs = 0;
  for (const t of manifest) {
    if (t.obsolete) continue;
    const anchorEntry = anchorsById.get(t.targetId);
    const knowledgeVocab = knowledgeById.get(t.targetId) ?? [];
    for (const locale of allLocales) {
      totalPairs++;
      const anchor = buildMeaningAnchor(t, anchorEntry, knowledgeVocab, locale, getTranslations(locale), getGenericWordIndex(locale, manifest, anchorsById));
      if (anchor.usedLegacyFallback) legacyFallbackPairs++;
      if (anchor.usedGermanTextFallback) germanTextFallbackPairs++;
    }
  }
  console.log(`\n[dry-run] Fallback stats across all active targets x locales (${totalPairs} pairs):`);
  console.log(`  legacy fallback (no anchor/knowledge data at all): ${legacyFallbackPairs}`);
  console.log(`  German-text fallback (anchor text without a translation for that locale): ${germanTextFallbackPairs}`);
}

async function dryRun(manifest: TargetEntry[]): Promise<void> {
  const anchorsById = loadAnchors();
  const knownTargetIds = new Set(manifest.map(t => t.targetId));
  const knowledgeById = loadKnowledgeVocab(knownTargetIds);

  let printedPairs = 0;
  let printedGermanTextFallbackPairs = 0;

  const dryRunTargetIds = ONLY_TARGETS.length ? ONLY_TARGETS : DRY_RUN_TARGET_IDS;
  const dryRunLocales = ONLY_LOCALES.length ? ONLY_LOCALES : DRY_RUN_LOCALES;
  for (const targetId of dryRunTargetIds) {
    const t = manifest.find(m => m.targetId === targetId);
    if (!t) {
      console.error(`[dry-run] target not found in manifest: ${targetId}`);
      continue;
    }
    const anchorEntry = anchorsById.get(t.targetId);
    const knowledgeVocab = knowledgeById.get(t.targetId) ?? [];
    const label = labelOf(t);
    for (const locale of dryRunLocales) {
      const anchor = buildMeaningAnchor(t, anchorEntry, knowledgeVocab, locale, getTranslations(locale), getGenericWordIndex(locale, manifest, anchorsById));
      if (anchor.usedLegacyFallback) console.log(`[dry-run] ${t.targetId}/${locale}: no visible-text anchor recorded, using legacy synonym fallback`);
      if (locale !== 'de') {
        printedPairs++;
        if (anchor.usedGermanTextFallback) printedGermanTextFallbackPairs++;
      }
      console.log(`\n===== PROMPT: ${t.targetId} / ${locale} =====`);
      console.log(buildPrompt(t, locale, label, anchor));
    }
  }

  console.log(`\n[dry-run] Of the ${printedPairs} printed non-German (target, locale) pairs, ${printedGermanTextFallbackPairs} needed the German-text fallback.`);
  reportFallbackStats(manifest, anchorsById, knowledgeById);
  console.log('\n[dry-run] Done. No API was called, no file was written.');
}

async function run(): Promise<void> {
  const manifest: TargetEntry[] = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  const anchorsById = loadAnchors();
  const knownTargetIds = new Set(manifest.map(t => t.targetId));
  const knowledgeById = loadKnowledgeVocab(knownTargetIds);
  const progress = loadProgress();

  if (SKIP_PLUGINS) console.log('[generate-synonyms] Core-only mode (plugin locales skipped)');
  if (PLUGINS_ONLY) console.log('[generate-synonyms] Plugins-only mode (only missing plugin overlays)');

  if (!SKIP_PLUGINS) {
    const pruned = prunePluginOverlays(manifest);
    console.log(`[generate-synonyms] Pruned ${pruned} stale overlay target(s).`);
  }

  const selected = manifest.filter(t => !t.obsolete && (!ONLY_TARGETS.length || ONLY_TARGETS.includes(t.targetId)));
  let processed = 0;

  if (PLUGINS_ONLY) {
    const jobs = selected.flatMap(t => collectPluginJobs(t, FORCE, progress));
    await runPool(jobs, job => generatePluginJob(job, manifest, anchorsById, knowledgeById, progress));
    processed = new Set(jobs.map(j => j.target.targetId)).size;
  } else {
    const coreTargets = selected.filter(isCoreCandidate);
    const coreJobs = coreTargets.flatMap(t => ACTIVE_CORE_LOCALES
      .filter(loc => {
        const resumable = isDone(progress, t.targetId, loc) && (t.synonyms[loc]?.length ?? 0) > 0;
        if (!FORCE && resumable) console.log(`= ${t.targetId} / ${loc} (skip, already generated this run)`);
        return FORCE || !resumable;
      })
      .map(loc => ({ target: t, locale: loc })));
    await runPool(coreJobs, job => generateCoreJob(job, manifest, anchorsById, knowledgeById, progress));

    for (const t of coreTargets) {
      if (CORE_LOCALES.every(loc => (t.synonyms[loc]?.length ?? 0) > 0)) t.synonymStatus = 'generated';
    }
    writeJsonAtomic(MANIFEST, manifest);

    if (!SKIP_PLUGINS) {
      const pluginJobs = coreTargets.flatMap(t => collectPluginJobs(t, true, progress));
      await runPool(pluginJobs, job => generatePluginJob(job, manifest, anchorsById, knowledgeById, progress));
    }
    processed = coreTargets.length;
  }
  if (REGENERATE) {
    const regeneratedIds = new Set(manifest.filter(t => !t.obsolete && ONLY_TARGETS.includes(t.targetId) && t.synonymStatus !== REVIEWED_STATUS).map(t => t.targetId));
    for (const loc of ACTIVE_CORE_LOCALES) {
      const removed = resolveRegeneratedCollisions(manifest, loc, regeneratedIds);
      console.log(`[generate-synonyms] ${loc}: removed ${removed} colliding phrase(s) from regenerated targets.`);
    }
    writeJsonAtomic(MANIFEST, manifest);
  }
  console.log(`Done. Processed ${processed} targets.`);
}

/**
 * Exact-phrase collisions after a --regenerate run. A phrase that a target outside the regenerated
 * set already owns (reviewed or hand-curated) stays there and is removed from the regenerated
 * target only — the synonym gate would drop BOTH sides, including the correct reviewed owner.
 * A phrase shared by two or more regenerated targets is genuinely ambiguous and is removed from all
 * of them. Never adds anything; a target may end up with fewer phrases, which is safe (a missing
 * phrase falls into the LLM path, a wrong one jumps with score 1.0).
 * @param manifest - Core manifest, modified in place
 * @param locale - Core locale to reconcile
 * @param regeneratedIds - Target ids re-created in this run
 * @returns Number of phrases removed
 */
function resolveRegeneratedCollisions(manifest: TargetEntry[], locale: string, regeneratedIds: Set<string>): number {
  const ownersByPhrase = new Map<string, Set<string>>();
  for (const t of manifest) {
    if (t.obsolete) continue;
    for (const phrase of t.synonyms[locale] ?? []) {
      const key = phrase.trim().toLowerCase();
      if (!ownersByPhrase.has(key)) ownersByPhrase.set(key, new Set());
      ownersByPhrase.get(key)!.add(t.targetId);
    }
  }

  let removed = 0;
  for (const t of manifest) {
    if (t.obsolete || !regeneratedIds.has(t.targetId)) continue;
    const before = t.synonyms[locale] ?? [];
    const kept = before.filter(phrase => (ownersByPhrase.get(phrase.trim().toLowerCase())?.size ?? 0) <= 1);
    const dropped = before.filter(phrase => !kept.includes(phrase));
    if (dropped.length) {
      console.log(`  collision ${t.targetId}/${locale}: removed ${dropped.join(', ')}`);
      t.synonyms[locale] = kept;
      removed += dropped.length;
    }
  }
  return removed;
}

if (DRY_RUN) {
  const manifest: TargetEntry[] = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  dryRun(manifest).catch(e => { console.error(e); process.exit(1); });
} else {
  run().catch(e => { console.error(e); process.exit(1); });
}
