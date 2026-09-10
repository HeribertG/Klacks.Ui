// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * DeepL back-translation checker for Klacksy navigation synonyms — the missing verification stage
 * after synonym-gate.ts. The gate is a deterministic rule filter; DeepL is an independent second
 * translation engine used only as a critic: every surviving phrase is translated back to German
 * and mechanically compared (token overlap + character-trigram similarity, no LLM) against the
 * target's German reference text, to catch cases where the LLM-generated synonym simply means the
 * wrong thing in a language nobody on the team can read natively (ko, th, he, ar, vi, ms).
 *
 * Input chain: tools/synonym-gate-result.json only lists rejections/warnings/emptyPairs, not the
 * survivor phrases themselves — this script reconstructs survivors by re-deriving the deduplicated
 * phrase set per (targetId, locale) pair from the core manifest and locale overlays, then removing
 * every phrase whose normalized key appears in the gate's rejection list for that pair. A strict
 * assertion aborts the run if the reconstruction's rejection-match count does not equal the gate's
 * rejection count for the phrases considered — a normalization drift there would otherwise silently
 * let already-rejected phrases through and burn DeepL budget on material nobody wants checked.
 * Passing --no-gate explicitly skips this filtering (treats all raw deduplicated phrases as
 * survivors) for situations where the gate has not been run yet; this is NOT the safe default —
 * the script exits non-zero and refuses to run if the gate result file is missing and --no-gate was
 * not passed.
 *
 * Budget discipline: DeepL Free bills source characters per call, real remaining quota is queried
 * from GET /v2/usage before every run, and the planned character count for the selected phrases is
 * computed and printed before any translate call is made. Two independent caps apply: the DeepL
 * account's real remaining quota (queried live, always enforced — a default/unbounded run that
 * would exceed it aborts loudly with the shortfall, it is never silently truncated) and an optional
 * --budget flag (an additional, explicit cap that truncates the deterministically ordered selection
 * to fit, rather than aborting — this is how a small, intentional trial run stays cheap). Already
 * cached phrases (see below) do not count against either cap since they cost nothing to reuse.
 *
 * Locale selection strategy (overridable): the six languages nobody on the team can read natively
 * (ko, th, he, ar, vi, ms) get a full check of every survivor. Every other translatable locale (all
 * locales except de, since the reference text already IS German) gets a deterministic 5% sample,
 * drawn with a seeded PRNG over a canonically sorted phrase list so a repeated run draws the exact
 * same sample instead of spending new budget. --lang restricts which locales are considered at all
 * in this run; the full-vs-sample tier rule still applies within that restricted set.
 *
 * Classification thresholds (match / weak / mismatch) are derived empirically per run from the
 * actual combinedScore distribution obtained (the two largest gaps in the sorted score list split
 * it into three natural clusters) rather than hardcoded a priori — see deriveThresholds(). With
 * fewer than 6 scored phrases the run falls back to fixed provisional cut points (0.60 / 0.35) and
 * says so explicitly in the report, since three meaningful clusters cannot be inferred from a
 * handful of points; a single-language, single-budget trial run's thresholds are calibration on
 * that language/budget slice only and should not be assumed to generalize to other languages.
 *
 * Two offline, zero-network modes let scoring/threshold work happen without ever touching the
 * DeepL API:
 *   --plan     Reconstructs survivors, applies gate filtering and locale/sample selection exactly
 *              like a real run, then prints a per-locale table (candidates before the gate,
 *              gate-filtered count, survivors, selected count after sampling, already-cached
 *              count, uncached count, planned characters) and exits. No DEEPL_API_KEY is read, no
 *              fetch() call of any kind is made — not even the free GET /v2/usage. This is the
 *              safe way to check what a real run (or a gate/threshold change) would do.
 *   --rescore  Recomputes classifications and the report purely from the entries already present
 *              in backtranslate-cache.json, against the current scoring code and the current
 *              German reference text — so a scoring-formula or threshold change can be evaluated
 *              for free, as many times as needed, without spending a single additional DeepL
 *              character. It reconstructs the full (un-gated) candidate phrase set from the
 *              manifest/overlays purely to recover which targetId a cached (locale, phrase) pair
 *              belongs to (the cache itself only keys on locale + normalized phrase); gate state
 *              is irrelevant here since a cached phrase already WAS translated once, regardless
 *              of what the gate thinks of it today. Cache entries that no longer match any
 *              manifest phrase (e.g. the manifest changed since translation) are reported as
 *              orphaned and skipped rather than scored. This mode NEVER reads DEEPL_API_KEY and
 *              NEVER calls fetch() — asserted defensively in code, not just by omission.
 *
 * This script never mutates navigation-targets.json or any overlay file — it only reads them and
 * writes its own report/result/cache files. There is deliberately no --apply: a weak or mismatched
 * back-translation can also mean DeepL does not know a domain term, or the German reference text is
 * thin, both of which need a human, not an automatic deletion.
 *
 * All output files (report, result, cache) are written via tmp-file + rename, then re-read to
 * confirm they do not start with a NUL byte and still parse — this machine has produced zero-byte
 * files under load before. The cache is written incrementally after every DeepL batch, not once at
 * the end, so an aborted run (quota exhausted, network failure) never has to pay twice for phrases
 * it already translated.
 *
 * CLI flags (both "--flag value" and "--flag=value" accepted):
 *   --budget <n>          Additional character cap on top of the live DeepL quota; truncates the
 *                          deterministic selection to fit instead of aborting.
 *   --lang <a,b,c>         Restrict to these locales (comma-separated); default: all translatable
 *                          locales (every OVERLAY/CORE locale except de).
 *   --sample-rate <0..1>   Sampling ratio for non-risk locales (default 0.05).
 *   --seed <n>             PRNG seed for the deterministic sample (default 1337).
 *   --gate-result <path>   Override the gate result JSON path.
 *   --no-gate              Explicitly bypass gate filtering (see warning above).
 *   --cache <path>         Override the cache file path.
 *   --report <path>        Override the Markdown report path.
 *   --result <path>        Override the machine-readable result JSON path.
 *   --anchors <path>       Override the navigation-anchors JSON path.
 *   --core-manifest <path> Override the core navigation-targets.json path.
 *   --plugins-root <path>  Override the Klacks.Api/Plugins/Languages root.
 *   --plan-only            Print the planned selection and budget check, then exit before any
 *                           DeepL translate call (still performs the live usage GET).
 *   --plan                 Fully offline planning mode (see header comment above): per-locale
 *                           breakdown, zero network calls, no DEEPL_API_KEY required.
 *   --rescore              Fully offline rescoring mode (see header comment above): recompute
 *                           scores/report from backtranslate-cache.json only, zero network calls,
 *                           no DEEPL_API_KEY required.
 *
 * Env: DEEPL_API_KEY (required) — read exclusively from process.env, never from any file. The key
 * is never logged, never written to any file, and never included in the report or console output.
 */
import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

interface CoreTarget {
  targetId: string;
  route: string;
  labelKey: string;
  category?: string;
  obsolete?: boolean;
  synonyms: Record<string, string[]>;
}
type OverlayFile = Record<string, { synonyms: string[] }>;

interface GateRejection { targetId: string; locale: string; phrase: string; checks: string[]; }
interface GateWarning { targetId: string; locale: string; message: string; }
interface GateEmptyPair { targetId: string; locale: string; }
interface GateResult {
  generatedAt: string;
  totals: Record<string, number>;
  checkCounts: Record<string, number>;
  rejections: GateRejection[];
  warnings: GateWarning[];
  emptyPairs: GateEmptyPair[];
}

interface AnchorVisibleText { key: string; text: string; kind: string; }
interface AnchorEntry {
  targetId: string;
  labelResolved: string | null;
  headline: string | null;
  sectionHeadline: string | null;
  visibleTexts: AnchorVisibleText[];
  obsolete: boolean;
}
interface AnchorsFile { generatedAt: string; targetCount: number; targets: AnchorEntry[]; }

interface SelectedItem { targetId: string; locale: string; phrase: string; sourceChars: number; }
interface CacheEntry { backTranslation: string; translatedAt: string; }
type CacheFile = Record<string, CacheEntry>;

type Classification = 'match' | 'weak' | 'mismatch' | 'no-reference';
interface ScoredResult {
  targetId: string;
  locale: string;
  phrase: string;
  backTranslation: string;
  referenceText: string;
  tokenOverlap: number;
  trigramScore: number;
  combinedScore: number;
  classification: Classification;
  fromCache: boolean;
}
interface Thresholds { matchMin: number; weakMin: number; source: 'empirical' | 'fallback-insufficient-n'; n: number; }

const UI_ROOT = resolve(__dirname, '..');
const DEFAULT_GATE_RESULT_PATH = resolve(UI_ROOT, 'tools/synonym-gate-result.json');
const DEFAULT_CORE_MANIFEST_PATH = resolve(UI_ROOT, '../Klacks.Api/Application/Skills/Definitions/navigation-targets.json');
const DEFAULT_PLUGINS_ROOT = resolve(UI_ROOT, '../Klacks.Api/Plugins/Languages');
const DEFAULT_ANCHORS_PATH = resolve(UI_ROOT, '../docs/knowledge/klacksy-navigation-anchors.json');
const DEFAULT_CACHE_PATH = resolve(UI_ROOT, 'tools/backtranslate-cache.json');
const DEFAULT_REPORT_MD_PATH = resolve(UI_ROOT, 'tools/backtranslation-report.md');
const DEFAULT_REPORT_JSON_PATH = resolve(UI_ROOT, 'tools/backtranslation-result.json');

const CORE_LOCALES = ['de', 'en', 'fr', 'it'];
const OVERLAY_LOCALES = ['ar', 'cs', 'da', 'el', 'es', 'fi', 'he', 'id', 'ja', 'ko', 'ms', 'nb', 'nl', 'pl', 'pt', 'ro', 'sv', 'th', 'vi', 'zh-CN', 'zh-TW'];
const ALL_LOCALES = [...CORE_LOCALES, ...OVERLAY_LOCALES];
const RISK_LOCALES = ['ko', 'th', 'he', 'ar', 'vi', 'ms'];
const TRANSLATABLE_LOCALES = ALL_LOCALES.filter(l => l !== 'de');

const DEEPL_SOURCE_LANG: Record<string, string> = {
  ar: 'AR', cs: 'CS', da: 'DA', el: 'EL', en: 'EN', es: 'ES', fi: 'FI', fr: 'FR', he: 'HE', id: 'ID',
  it: 'IT', ja: 'JA', ko: 'KO', ms: 'MS', nb: 'NB', nl: 'NL', pl: 'PL', pt: 'PT', ro: 'RO', sv: 'SV',
  th: 'TH', vi: 'VI', 'zh-CN': 'ZH', 'zh-TW': 'ZH',
};
const DEEPL_TARGET_LANG = 'DE';
const DEEPL_USAGE_URL = 'https://api-free.deepl.com/v2/usage';
const DEEPL_TRANSLATE_URL = 'https://api-free.deepl.com/v2/translate';
const DEEPL_BATCH_SIZE = 50;
const DEEPL_MAX_RETRIES = 5;
const DEEPL_BASE_BACKOFF_MS = 1000;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_QUOTA_EXCEEDED = 456;

const DEFAULT_SAMPLE_RATE = 0.05;
const DEFAULT_SEED = 1337;
const FALLBACK_MATCH_MIN = 0.6;
const FALLBACK_WEAK_MIN = 0.35;
const MIN_SCORES_FOR_EMPIRICAL_THRESHOLDS = 6;
const MIN_STEM_LENGTH = 2;

/**
 * Compact heuristic German stopword list covering articles, common prepositions and auxiliary
 * verbs — enough to keep token-overlap scoring from being dominated by grammatical glue words. Not
 * a linguistic-completeness claim, just enough to make the signal useful for short UI phrases.
 */
const DE_STOPWORDS = new Set([
  'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einer', 'eines', 'einem', 'einen',
  'und', 'oder', 'ist', 'sind', 'war', 'waren', 'fuer', 'für', 'von', 'vom', 'zu', 'zum', 'zur',
  'im', 'in', 'an', 'am', 'auf', 'aus', 'mit', 'bei', 'nach', 'ueber', 'über', 'unter', 'vor',
  'zwischen', 'als', 'wie', 'auch', 'nicht', 'kein', 'keine', 'sich', 'sein', 'ihr', 'ihre',
  'diese', 'dieser', 'dieses', 'man', 'wird', 'werden', 'wurde', 'du', 'sie', 'wir', 'es', 'so',
  'nur', 'noch', 'mehr', 'alle', 'alles', 'jede', 'jeder', 'jedes', 'per', 'um',
]);

class QuotaExhaustedError extends Error {}

function nfcOf(s: string): string {
  return s.normalize('NFC');
}
function normKey(s: string): string {
  return nfcOf(s).trim().replace(/\s+/g, ' ').toLowerCase();
}
function codepointLength(s: string): number {
  return Array.from(s).length;
}
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface CliArgs {
  budget: number | null;
  langs: string[] | null;
  sampleRate: number;
  seed: number;
  gateResultPath: string;
  noGate: boolean;
  cachePath: string;
  reportMdPath: string;
  reportJsonPath: string;
  anchorsPath: string;
  coreManifestPath: string;
  pluginsRoot: string;
  planOnly: boolean;
  plan: boolean;
  rescore: boolean;
}

function getFlagValue(argv: string[], name: string): string | undefined {
  const eq = argv.find(a => a.startsWith(`--${name}=`));
  if (eq) return eq.slice(`--${name}=`.length);
  const idx = argv.indexOf(`--${name}`);
  if (idx !== -1 && idx + 1 < argv.length && !argv[idx + 1].startsWith('--')) return argv[idx + 1];
  return undefined;
}
function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(`--${name}`) || argv.some(a => a.startsWith(`--${name}=`));
}

function parseArgs(argv: string[]): CliArgs {
  const budgetRaw = getFlagValue(argv, 'budget');
  const langsRaw = getFlagValue(argv, 'lang') ?? getFlagValue(argv, 'langs');
  const sampleRateRaw = getFlagValue(argv, 'sample-rate');
  const seedRaw = getFlagValue(argv, 'seed');
  return {
    budget: budgetRaw !== undefined ? Number(budgetRaw) : null,
    langs: langsRaw ? langsRaw.split(',').map(s => s.trim()).filter(Boolean) : null,
    sampleRate: sampleRateRaw !== undefined ? Number(sampleRateRaw) : DEFAULT_SAMPLE_RATE,
    seed: seedRaw !== undefined ? Number(seedRaw) : DEFAULT_SEED,
    gateResultPath: getFlagValue(argv, 'gate-result') ?? DEFAULT_GATE_RESULT_PATH,
    noGate: hasFlag(argv, 'no-gate'),
    cachePath: getFlagValue(argv, 'cache') ?? DEFAULT_CACHE_PATH,
    reportMdPath: getFlagValue(argv, 'report') ?? DEFAULT_REPORT_MD_PATH,
    reportJsonPath: getFlagValue(argv, 'result') ?? DEFAULT_REPORT_JSON_PATH,
    anchorsPath: getFlagValue(argv, 'anchors') ?? DEFAULT_ANCHORS_PATH,
    coreManifestPath: getFlagValue(argv, 'core-manifest') ?? DEFAULT_CORE_MANIFEST_PATH,
    pluginsRoot: getFlagValue(argv, 'plugins-root') ?? DEFAULT_PLUGINS_ROOT,
    planOnly: hasFlag(argv, 'plan-only'),
    plan: hasFlag(argv, 'plan'),
    rescore: hasFlag(argv, 'rescore'),
  };
}

function readJsonFile<T>(path: string): T {
  if (!existsSync(path)) throw new Error(`File not found: ${path}`);
  const text = readFileSync(path, 'utf8');
  try {
    return JSON.parse(text) as T;
  } catch (err) {
    throw new Error(`Failed to parse JSON file ${path}: ${(err as Error).message}`);
  }
}

function writeFileAtomic(path: string, content: string): void {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, content, 'utf8');
  renameSync(tmp, path);
  const buf = readFileSync(path);
  if (buf.length === 0 || buf[0] === 0x00) {
    throw new Error(`Post-write verification failed (empty or NUL-prefixed) for ${path}`);
  }
  if (path.endsWith('.json')) JSON.parse(buf.toString('utf8'));
}

function loadCache(path: string): CacheFile {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as CacheFile;
  } catch {
    console.warn(`WARNING: cache file ${path} could not be parsed, starting with an empty cache.`);
    return {};
  }
}
function cacheKey(locale: string, phrase: string): string {
  return `${locale}|${normKey(phrase)}`;
}
function saveCache(path: string, cache: CacheFile): void {
  writeFileAtomic(path, JSON.stringify(cache, null, 2) + '\n');
}

function pairKeyStr(targetId: string, locale: string): string {
  return `${targetId}|${locale}`;
}

/**
 * Reconstructs the surviving synonym phrases per (targetId, locale) pair, since the gate result
 * only lists rejections/warnings/emptyPairs, never the survivor list itself. Only pairs whose
 * locale is in `scopeLocales` are built and asserted against — a locale outside the current run's
 * scope has no reconstructed pair at all, so its gate rejections are excluded from the assertion
 * rather than causing a false drift failure.
 */
interface LocaleStats { candidates: number; gateFiltered: number; }
interface ReconstructResult {
  survivorsByPair: Map<string, string[]>;
  statsByLocale: Map<string, LocaleStats>;
}

function reconstructSurvivors(
  targets: CoreTarget[],
  overlays: Map<string, OverlayFile>,
  gate: GateResult | null,
  scopeLocales: Set<string>,
): ReconstructResult {
  const survivorsByPair = new Map<string, string[]>();
  const rejectedByPair = new Map<string, Set<string>>();
  const statsByLocale = new Map<string, LocaleStats>();
  function bumpStats(locale: string, candidates: number, gateFiltered: number): void {
    const prev = statsByLocale.get(locale) ?? { candidates: 0, gateFiltered: 0 };
    statsByLocale.set(locale, { candidates: prev.candidates + candidates, gateFiltered: prev.gateFiltered + gateFiltered });
  }
  if (gate) {
    for (const r of gate.rejections) {
      if (!scopeLocales.has(r.locale)) continue;
      const key = pairKeyStr(r.targetId, r.locale);
      const set = rejectedByPair.get(key) ?? new Set<string>();
      set.add(normKey(r.phrase));
      rejectedByPair.set(key, set);
    }
  }

  let matchedRejections = 0;
  let totalRejectionsConsidered = 0;

  function addPair(targetId: string, locale: string, raw: string[]): void {
    if (!scopeLocales.has(locale)) return;
    const seen = new Map<string, string>();
    for (const p of raw) {
      const k = normKey(p);
      if (!seen.has(k)) seen.set(k, p);
    }
    const key = pairKeyStr(targetId, locale);
    const rejected = rejectedByPair.get(key);
    let survivors: string[];
    if (rejected) {
      totalRejectionsConsidered += rejected.size;
      let matched = 0;
      survivors = [];
      for (const [k, phrase] of seen) {
        if (rejected.has(k)) {
          matched++;
          continue;
        }
        survivors.push(phrase);
      }
      matchedRejections += matched;
      bumpStats(locale, seen.size, matched);
    } else {
      survivors = [...seen.values()];
      bumpStats(locale, seen.size, 0);
    }
    survivorsByPair.set(key, survivors);
  }

  for (const t of targets) {
    for (const locale of CORE_LOCALES) {
      const raw = t.synonyms?.[locale];
      if (raw && raw.length) addPair(t.targetId, locale, raw);
    }
    for (const [locale, overlay] of overlays) {
      const entry = overlay[t.targetId];
      if (entry?.synonyms?.length) addPair(t.targetId, locale, entry.synonyms);
    }
  }

  if (gate && totalRejectionsConsidered !== matchedRejections) {
    const missing = totalRejectionsConsidered - matchedRejections;
    throw new Error(
      `Normalization drift detected: ${missing} of ${totalRejectionsConsidered} in-scope gate rejections did not match any ` +
      `deduplicated survivor-candidate phrase. Aborting rather than risk spending DeepL budget on phrases the gate already rejected.`,
    );
  }

  if (gate) {
    let emptyPairMismatches = 0;
    for (const ep of gate.emptyPairs) {
      if (!scopeLocales.has(ep.locale)) continue;
      const survivors = survivorsByPair.get(pairKeyStr(ep.targetId, ep.locale));
      if (survivors === undefined || survivors.length !== 0) emptyPairMismatches++;
    }
    if (emptyPairMismatches > 0) {
      console.warn(
        `WARNING: ${emptyPairMismatches} gate.emptyPairs entries (in scope) do not match a derived-empty pair — ` +
        `source data may have changed since the gate ran.`,
      );
    }
  }

  return { survivorsByPair, statsByLocale };
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashLocale(locale: string): number {
  let h = 0;
  for (const ch of locale) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return h;
}
function seededSample<T>(arr: T[], seed: number, count: number): T[] {
  const rnd = mulberry32(seed);
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.slice(0, Math.max(0, count));
}
function byTargetThenPhrase(a: SelectedItem, b: SelectedItem): number {
  return a.targetId === b.targetId ? a.phrase.localeCompare(b.phrase) : a.targetId.localeCompare(b.targetId);
}

/**
 * Selects the phrases to back-translate: a full check for RISK_LOCALES, a deterministic
 * `sampleRate` sample (seeded PRNG over a canonically sorted list, so a re-run draws the same
 * sample) for every other locale in `scopeLocales`. German (de) is never selected — the reference
 * text is already German, a round-trip check there is meaningless.
 */
function selectItems(survivorsByPair: Map<string, string[]>, scopeLocales: Set<string>, sampleRate: number, seed: number): SelectedItem[] {
  const byLocale = new Map<string, SelectedItem[]>();
  for (const [key, phrases] of survivorsByPair) {
    const [targetId, locale] = key.split('|');
    if (locale === 'de' || !scopeLocales.has(locale)) continue;
    const arr = byLocale.get(locale) ?? [];
    for (const phrase of phrases) arr.push({ targetId, locale, phrase, sourceChars: codepointLength(phrase) });
    byLocale.set(locale, arr);
  }
  const items: SelectedItem[] = [];
  for (const [locale, arr] of byLocale) {
    arr.sort(byTargetThenPhrase);
    if (RISK_LOCALES.includes(locale)) {
      items.push(...arr);
    } else {
      const n = Math.round(arr.length * sampleRate);
      const picked = seededSample(arr, seed ^ hashLocale(locale), n);
      picked.sort(byTargetThenPhrase);
      items.push(...picked);
    }
  }
  items.sort((a, b) => (a.locale === b.locale ? byTargetThenPhrase(a, b) : a.locale.localeCompare(b.locale)));
  return items;
}

function truncateToBudget(items: SelectedItem[], budget: number): SelectedItem[] {
  const out: SelectedItem[] = [];
  let sum = 0;
  for (const it of items) {
    if (sum + it.sourceChars > budget) continue;
    out.push(it);
    sum += it.sourceChars;
  }
  return out;
}

interface DeeplUsage { character_count: number; character_limit: number; }

async function fetchUsage(apiKey: string): Promise<DeeplUsage> {
  const res = await fetch(DEEPL_USAGE_URL, { headers: { Authorization: `DeepL-Auth-Key ${apiKey}` } });
  if (!res.ok) throw new Error(`DeepL usage check failed: HTTP ${res.status}`);
  return (await res.json()) as DeeplUsage;
}

async function translateBatch(apiKey: string, sourceLang: string, texts: string[]): Promise<string[]> {
  const params = new URLSearchParams();
  params.set('target_lang', DEEPL_TARGET_LANG);
  params.set('source_lang', sourceLang);
  for (const t of texts) params.append('text', t);

  for (let attempt = 0; ; attempt++) {
    const res = await fetch(DEEPL_TRANSLATE_URL, {
      method: 'POST',
      headers: { Authorization: `DeepL-Auth-Key ${apiKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    if (res.status === HTTP_TOO_MANY_REQUESTS) {
      if (attempt >= DEEPL_MAX_RETRIES) throw new Error(`DeepL rate limit: retries exhausted (${DEEPL_MAX_RETRIES})`);
      const backoff = DEEPL_BASE_BACKOFF_MS * 2 ** attempt;
      console.warn(`HTTP 429 from DeepL, retrying in ${backoff}ms (attempt ${attempt + 1}/${DEEPL_MAX_RETRIES})`);
      await sleep(backoff);
      continue;
    }
    if (res.status === HTTP_QUOTA_EXCEEDED) {
      throw new QuotaExhaustedError('DeepL quota exhausted (HTTP 456)');
    }
    if (!res.ok) {
      throw new Error(`DeepL translate failed: HTTP ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as { translations: { text: string }[] };
    return data.translations.map(t => t.text);
  }
}

async function runTranslation(
  apiKey: string,
  pending: SelectedItem[],
  cache: CacheFile,
  cachePath: string,
): Promise<{ results: Map<string, string>; succeededChars: number; quotaExhausted: boolean }> {
  const results = new Map<string, string>();
  const byLocale = new Map<string, SelectedItem[]>();
  for (const it of pending) {
    const arr = byLocale.get(it.locale) ?? [];
    arr.push(it);
    byLocale.set(it.locale, arr);
  }

  let succeededChars = 0;
  let quotaExhausted = false;

  outer: for (const [locale, items] of byLocale) {
    const sourceLang = DEEPL_SOURCE_LANG[locale];
    if (!sourceLang) {
      console.warn(`WARNING: no DeepL source-lang mapping for locale "${locale}", skipping ${items.length} phrase(s).`);
      continue;
    }
    for (let i = 0; i < items.length; i += DEEPL_BATCH_SIZE) {
      const batch = items.slice(i, i + DEEPL_BATCH_SIZE);
      try {
        const translations = await translateBatch(apiKey, sourceLang, batch.map(b => b.phrase));
        for (let j = 0; j < batch.length; j++) {
          const it = batch[j];
          const key = cacheKey(it.locale, it.phrase);
          cache[key] = { backTranslation: translations[j], translatedAt: new Date().toISOString() };
          results.set(key, translations[j]);
          succeededChars += it.sourceChars;
        }
        saveCache(cachePath, cache);
      } catch (err) {
        if (err instanceof QuotaExhaustedError) {
          console.error(`ABORT: ${err.message}. ${results.size} translation(s) obtained so far are already saved to the cache.`);
          quotaExhausted = true;
          break outer;
        }
        throw err;
      }
    }
  }
  return { results, succeededChars, quotaExhausted };
}

function tokenize(s: string): string[] {
  return s.toLowerCase().normalize('NFC').split(/[^a-zäöüß0-9]+/i).filter(Boolean);
}
function stem(word: string): string {
  let w = word;
  if (w.length > 6 && /(ungen|heiten|keiten)$/.test(w)) w = w.replace(/(ungen|heiten|keiten)$/, '');
  else if (w.length > 5 && /(ung|heit|keit|lich|isch|bar)$/.test(w)) w = w.replace(/(ung|heit|keit|lich|isch|bar)$/, '');
  if (w.length > 4 && /(ern|en|em|er|es|e|n|s)$/.test(w)) w = w.replace(/(ern|en|em|er|es|e|n|s)$/, '');
  return w;
}
function stemmedTokenSet(s: string): Set<string> {
  return new Set(tokenize(s).filter(t => !DE_STOPWORDS.has(t)).map(stem).filter(t => t.length >= MIN_STEM_LENGTH));
}
/**
 * Asymmetric containment (back-translation tokens found in the reference / all back-translation
 * tokens), not a symmetric Dice/Jaccard coefficient. referenceText is a concatenation of every
 * anchor field plus every German core synonym for the target — deliberately large, often 20-40+
 * stems — so a symmetric coefficient divides by that combined size and crushes the score of a
 * correct short back-translation for no reason other than the reference being verbose. Empirically
 * found in the ko trial run of 2026-09-09: "Mitarbeiter anzeigen" against a reference containing
 * "mitarbeiter mitarbeiterliste mitarbeiterübersicht personal personalliste ..." scored 0.09 under
 * Dice despite "mitarbeiter" being a direct hit, because the reference side alone had ~40 stems.
 * Containment against the back-translation's own (small) size reports what we actually want to
 * know: is the back-translation's content present in the reference pool.
 */
function tokenOverlapScore(backTranslation: string, referenceText: string): number {
  const back = stemmedTokenSet(backTranslation);
  const ref = stemmedTokenSet(referenceText);
  if (back.size === 0 || ref.size === 0) return 0;
  let inter = 0;
  for (const t of back) if (ref.has(t)) inter++;
  return inter / back.size;
}
function charTrigrams(s: string): Map<string, number> {
  const norm = ` ${s.toLowerCase().normalize('NFC').replace(/\s+/g, ' ').trim()} `;
  const map = new Map<string, number>();
  for (let i = 0; i < norm.length - 2; i++) {
    const tri = norm.slice(i, i + 3);
    map.set(tri, (map.get(tri) ?? 0) + 1);
  }
  return map;
}
/** Same asymmetric-containment reasoning as tokenOverlapScore, applied to character trigrams. */
function trigramContainmentScore(backTranslation: string, referenceText: string): number {
  const back = charTrigrams(backTranslation);
  const ref = charTrigrams(referenceText);
  if (back.size === 0 || ref.size === 0) return 0;
  let inter = 0;
  for (const [k, va] of back) {
    const vb = ref.get(k);
    if (vb) inter += Math.min(va, vb);
  }
  const totalBack = [...back.values()].reduce((s, v) => s + v, 0);
  return totalBack === 0 ? 0 : inter / totalBack;
}

/**
 * Splits the sorted combinedScore distribution into three clusters using the two largest gaps
 * between consecutive sorted scores. This is an empirical, per-run derivation, not fixed a priori
 * constants: it reads the actual shape of the scores this run produced. Falls back to fixed
 * provisional cut points when there are too few scored phrases to infer three meaningful clusters.
 */
function deriveThresholds(scores: number[]): Thresholds {
  const fallback: Thresholds = { matchMin: FALLBACK_MATCH_MIN, weakMin: FALLBACK_WEAK_MIN, source: 'fallback-insufficient-n', n: scores.length };
  if (scores.length < MIN_SCORES_FOR_EMPIRICAL_THRESHOLDS) return fallback;
  const sorted = [...scores].sort((a, b) => a - b);
  const gaps: { idx: number; size: number }[] = [];
  for (let i = 0; i < sorted.length - 1; i++) gaps.push({ idx: i, size: sorted[i + 1] - sorted[i] });
  gaps.sort((a, b) => b.size - a.size);
  const top = gaps.slice(0, 2).sort((a, b) => a.idx - b.idx);
  if (top.length < 2 || top[0].size <= 0 || top[1].size <= 0) return fallback;
  const cut1 = (sorted[top[0].idx] + sorted[top[0].idx + 1]) / 2;
  const cut2 = (sorted[top[1].idx] + sorted[top[1].idx + 1]) / 2;
  return { matchMin: Math.max(cut1, cut2), weakMin: Math.min(cut1, cut2), source: 'empirical', n: scores.length };
}
function classify(score: number, th: Thresholds, hasReference: boolean): Classification {
  if (!hasReference) return 'no-reference';
  if (score >= th.matchMin) return 'match';
  if (score >= th.weakMin) return 'weak';
  return 'mismatch';
}

function buildReferenceText(anchor: AnchorEntry | undefined, coreDeSynonyms: string[]): string {
  const parts: string[] = [];
  if (anchor) {
    if (anchor.labelResolved) parts.push(anchor.labelResolved);
    if (anchor.headline) parts.push(anchor.headline);
    if (anchor.sectionHeadline) parts.push(anchor.sectionHeadline);
    for (const vt of anchor.visibleTexts) if (vt.text) parts.push(vt.text);
  }
  parts.push(...coreDeSynonyms);
  return parts.join(' ').trim();
}

interface BudgetInfo {
  plannedChars: number;
  finalPlannedChars: number;
  predictedSucceededChars: number;
  actualUsageDeltaChars: number | null;
  usageBefore: DeeplUsage;
  usageAfter: DeeplUsage | null;
  cachedCount: number;
  explicitBudget: number | null;
  quotaExhausted: boolean;
}
interface RescoreStats {
  cachedEntriesScored: number;
  orphanedCacheEntries: number;
  localesInCache: string[];
}

function writeReports(
  reportMdPath: string,
  reportJsonPath: string,
  scored: ScoredResult[],
  thresholds: Thresholds,
  budgetInfo: BudgetInfo | null,
  gateUsed: boolean,
  rescoreStats: RescoreStats | null,
): void {
  const byLocale = new Map<string, ScoredResult[]>();
  for (const r of scored) {
    const arr = byLocale.get(r.locale) ?? [];
    arr.push(r);
    byLocale.set(r.locale, arr);
  }

  const lines: string[] = [];
  lines.push('# DeepL Back-Translation Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  if (rescoreStats) {
    lines.push('Mode: --rescore (recomputed from backtranslate-cache.json only; zero DeepL calls, not even GET /v2/usage)');
  } else {
    lines.push(`Gate filtering applied: ${gateUsed ? 'yes' : 'NO — run with --no-gate, only raw deduplicated phrases were filtered, gate rejections were NOT excluded'}`);
  }
  lines.push('');
  lines.push('## Budget');
  lines.push('');
  if (rescoreStats) {
    lines.push('Rescore mode: no DeepL call of any kind was made for this report.');
    lines.push(`- Cached entries scored: ${rescoreStats.cachedEntriesScored}`);
    lines.push(`- Orphaned cache entries skipped (no matching manifest phrase): ${rescoreStats.orphanedCacheEntries}`);
    lines.push(`- Locales present in cache (in scope): ${rescoreStats.localesInCache.join(', ') || '(none)'}`);
  } else if (budgetInfo) {
    lines.push(`- DeepL usage before: ${budgetInfo.usageBefore.character_count} / ${budgetInfo.usageBefore.character_limit}`);
    if (budgetInfo.usageAfter) lines.push(`- DeepL usage after: ${budgetInfo.usageAfter.character_count} / ${budgetInfo.usageAfter.character_limit}`);
    lines.push(`- Explicit --budget: ${budgetInfo.explicitBudget ?? '(none)'}`);
    lines.push(`- Planned characters (desired selection, before truncation): ${budgetInfo.plannedChars}`);
    lines.push(`- Planned characters (after truncation to budget): ${budgetInfo.finalPlannedChars}`);
    lines.push(`- Predicted characters actually spent (sum of succeeded batches): ${budgetInfo.predictedSucceededChars}`);
    if (budgetInfo.actualUsageDeltaChars !== null) lines.push(`- Actual usage delta measured via /v2/usage: ${budgetInfo.actualUsageDeltaChars}`);
    lines.push(`- Served from cache (free): ${budgetInfo.cachedCount}`);
    lines.push(`- Quota exhausted mid-run (HTTP 456): ${budgetInfo.quotaExhausted ? 'yes' : 'no'}`);
  }
  lines.push('');
  lines.push('## Classification thresholds');
  lines.push('');
  lines.push(`- Source: ${thresholds.source} (n=${thresholds.n})`);
  lines.push(`- match >= ${thresholds.matchMin.toFixed(3)}`);
  lines.push(`- weak  >= ${thresholds.weakMin.toFixed(3)}`);
  lines.push('- mismatch below weak threshold');
  if (thresholds.source === 'fallback-insufficient-n') {
    lines.push('- NOTE: fewer than 6 scored phrases, could not infer 3 empirical clusters — using fixed provisional cut points.');
  } else {
    lines.push('- NOTE: derived from THIS run only (single language/budget slice); do not assume it generalizes to other languages without a wider sample.');
  }
  lines.push('');
  lines.push('## Per-locale summary');
  lines.push('');
  lines.push('| Locale | Checked | match | weak | mismatch | no-reference |');
  lines.push('|---|---|---|---|---|---|');
  for (const [locale, rows] of [...byLocale.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const c = (k: Classification) => rows.filter(r => r.classification === k).length;
    lines.push(`| ${locale} | ${rows.length} | ${c('match')} | ${c('weak')} | ${c('mismatch')} | ${c('no-reference')} |`);
  }
  lines.push('');
  lines.push('## Mismatch cases (full list)');
  lines.push('');
  const mismatches = scored.filter(r => r.classification === 'mismatch');
  if (!mismatches.length) {
    lines.push('_none_');
  } else {
    lines.push('| Target | Locale | Original phrase | Back-translation | German reference |');
    lines.push('|---|---|---|---|---|');
    for (const r of mismatches) {
      lines.push(`| ${r.targetId} | ${r.locale} | ${r.phrase.replace(/\|/g, '\\|')} | ${r.backTranslation.replace(/\|/g, '\\|')} | ${r.referenceText.replace(/\|/g, '\\|').slice(0, 200)} |`);
    }
  }
  lines.push('');
  writeFileAtomic(reportMdPath, lines.join('\n') + '\n');

  const resultPayload = {
    generatedAt: new Date().toISOString(),
    mode: rescoreStats ? 'rescore' : 'run',
    gateUsed,
    thresholds,
    budget: budgetInfo,
    rescore: rescoreStats,
    scored,
  };
  writeFileAtomic(reportJsonPath, JSON.stringify(resultPayload, null, 2) + '\n');
  console.log(`\nReports written:\n  ${reportMdPath}\n  ${reportJsonPath}`);
}

/**
 * Prints the per-locale planning breakdown used by --plan and --plan-only: how many candidate
 * phrases existed before the gate ran, how many the gate filtered out, how many survivors remain,
 * how many were actually selected for this run (full check for RISK_LOCALES, a sample for the
 * rest), and of those, how many are already cached versus how many characters a real run would
 * still need to send to DeepL. Pure computation over already-loaded data — no I/O, no network.
 */
function printPlanTable(
  scopeLocaleList: string[],
  statsByLocale: Map<string, LocaleStats>,
  survivorsByPair: Map<string, string[]>,
  desiredSelection: SelectedItem[],
  cachedItems: { item: SelectedItem; backTranslation: string }[],
  uncached: SelectedItem[],
): void {
  const survivorsByLocale = new Map<string, number>();
  for (const [key, phrases] of survivorsByPair) {
    const locale = key.split('|')[1];
    survivorsByLocale.set(locale, (survivorsByLocale.get(locale) ?? 0) + phrases.length);
  }
  const selectedByLocale = new Map<string, number>();
  for (const it of desiredSelection) selectedByLocale.set(it.locale, (selectedByLocale.get(it.locale) ?? 0) + 1);
  const cachedByLocale = new Map<string, number>();
  for (const c of cachedItems) cachedByLocale.set(c.item.locale, (cachedByLocale.get(c.item.locale) ?? 0) + 1);
  const uncachedByLocale = new Map<string, number>();
  const uncachedCharsByLocale = new Map<string, number>();
  for (const it of uncached) {
    uncachedByLocale.set(it.locale, (uncachedByLocale.get(it.locale) ?? 0) + 1);
    uncachedCharsByLocale.set(it.locale, (uncachedCharsByLocale.get(it.locale) ?? 0) + it.sourceChars);
  }

  console.log('\n--- Per-locale plan ---');
  console.log('locale  candidates  gateFiltered  survivors  selected  cached  uncached  plannedChars');
  let totalCandidates = 0, totalGateFiltered = 0, totalSurvivors = 0, totalSelected = 0, totalCached = 0, totalUncached = 0, totalPlannedChars = 0;
  for (const locale of [...scopeLocaleList].sort((a, b) => a.localeCompare(b))) {
    const stats = statsByLocale.get(locale) ?? { candidates: 0, gateFiltered: 0 };
    const survivors = survivorsByLocale.get(locale) ?? 0;
    const selected = selectedByLocale.get(locale) ?? 0;
    const cached = cachedByLocale.get(locale) ?? 0;
    const uncachedCount = uncachedByLocale.get(locale) ?? 0;
    const plannedChars = uncachedCharsByLocale.get(locale) ?? 0;
    console.log(`${locale.padEnd(8)}${String(stats.candidates).padEnd(12)}${String(stats.gateFiltered).padEnd(14)}${String(survivors).padEnd(11)}${String(selected).padEnd(10)}${String(cached).padEnd(8)}${String(uncachedCount).padEnd(10)}${plannedChars}`);
    totalCandidates += stats.candidates;
    totalGateFiltered += stats.gateFiltered;
    totalSurvivors += survivors;
    totalSelected += selected;
    totalCached += cached;
    totalUncached += uncachedCount;
    totalPlannedChars += plannedChars;
  }
  console.log(`${'TOTAL'.padEnd(8)}${String(totalCandidates).padEnd(12)}${String(totalGateFiltered).padEnd(14)}${String(totalSurvivors).padEnd(11)}${String(totalSelected).padEnd(10)}${String(totalCached).padEnd(8)}${String(totalUncached).padEnd(10)}${totalPlannedChars}`);
}

/**
 * Rescores the cache against the current scoring code with zero DeepL calls: no DEEPL_API_KEY is
 * read, no fetch() is ever invoked. The gate is deliberately NOT applied here (gate=null) — a
 * cached phrase already WAS translated once, so today's gate opinion on it is irrelevant; the
 * reconstruction is only used to recover which targetId a cached (locale, phrase) pair belongs to
 * (the cache key itself is only `locale|normalizedPhrase`, it does not carry targetId). A phrase
 * whose normalized key collides across two different targetIds in the same locale is resolved to
 * the first targetId in sort order and logged — this is a pre-existing cache-schema ambiguity,
 * not something --rescore introduces.
 */
async function runRescore(cli: CliArgs): Promise<void> {
  const cache = loadCache(cli.cachePath);
  const cacheKeys = Object.keys(cache);
  if (!cacheKeys.length) {
    console.error(`FATAL: cache file ${cli.cachePath} is empty or missing — nothing to rescore.`);
    process.exit(1);
    return;
  }
  const localesInCacheAll = [...new Set(cacheKeys.map(k => k.split('|')[0]))];
  const requestedLocales = cli.langs ?? localesInCacheAll;
  const scopeLocaleList = requestedLocales.filter(l => TRANSLATABLE_LOCALES.includes(l) && localesInCacheAll.includes(l));
  if (!scopeLocaleList.length) {
    console.error('FATAL: no in-scope locale has any cached entry (check --lang against what is actually cached).');
    process.exit(1);
    return;
  }
  const scopeLocales = new Set(scopeLocaleList);

  const manifest = readJsonFile<CoreTarget[]>(cli.coreManifestPath);
  const activeTargets = manifest.filter(t => !t.obsolete);
  const overlays = new Map<string, OverlayFile>();
  for (const locale of OVERLAY_LOCALES) {
    if (!scopeLocales.has(locale)) continue;
    const path = join(cli.pluginsRoot, locale, 'navigation-targets.json');
    if (!existsSync(path)) continue;
    overlays.set(locale, readJsonFile<OverlayFile>(path));
  }
  let anchorsByTargetId = new Map<string, AnchorEntry>();
  if (existsSync(cli.anchorsPath)) {
    const anchors = readJsonFile<AnchorsFile>(cli.anchorsPath);
    anchorsByTargetId = new Map(anchors.targets.map(a => [a.targetId, a]));
  } else {
    console.warn(`WARNING: anchors file not found at ${cli.anchorsPath}, reference text will fall back to core German synonyms only.`);
  }
  const coreDeByTargetId = new Map(activeTargets.map(t => [t.targetId, t.synonyms?.de ?? []]));

  const { survivorsByPair } = reconstructSurvivors(activeTargets, overlays, null, scopeLocales);
  const reverseIndex = new Map<string, { targetId: string; phrase: string }>();
  const collisions: string[] = [];
  const sortedPairKeys = [...survivorsByPair.keys()].sort((a, b) => a.localeCompare(b));
  for (const key of sortedPairKeys) {
    const [targetId, locale] = key.split('|');
    for (const phrase of survivorsByPair.get(key)!) {
      const ck = cacheKey(locale, phrase);
      if (reverseIndex.has(ck)) {
        collisions.push(`${ck} (kept ${reverseIndex.get(ck)!.targetId}, also matched by ${targetId})`);
        continue;
      }
      reverseIndex.set(ck, { targetId, phrase });
    }
  }
  if (collisions.length) {
    console.warn(`WARNING: ${collisions.length} cache key(s) matched more than one targetId; kept the first in sorted order. Examples:\n  ${collisions.slice(0, 5).join('\n  ')}`);
  }

  const scored: ScoredResult[] = [];
  const rawScores: number[] = [];
  const preliminary: { ck: string; targetId: string; phrase: string; locale: string; backTranslation: string; referenceText: string; tokenOverlap: number; trigramScore: number; combinedScore: number }[] = [];
  let orphanedCacheEntries = 0;
  for (const ck of cacheKeys) {
    const locale = ck.split('|')[0];
    if (!scopeLocales.has(locale)) continue;
    const resolved = reverseIndex.get(ck);
    if (!resolved) {
      orphanedCacheEntries++;
      continue;
    }
    const backTranslation = cache[ck].backTranslation;
    const anchor = anchorsByTargetId.get(resolved.targetId);
    const referenceText = buildReferenceText(anchor, coreDeByTargetId.get(resolved.targetId) ?? []);
    const tokenOverlap = referenceText ? tokenOverlapScore(backTranslation, referenceText) : 0;
    const trigramScore = referenceText ? trigramContainmentScore(backTranslation, referenceText) : 0;
    const combinedScore = Math.max(tokenOverlap, trigramScore);
    preliminary.push({ ck, targetId: resolved.targetId, phrase: resolved.phrase, locale, backTranslation, referenceText, tokenOverlap, trigramScore, combinedScore });
    if (referenceText) rawScores.push(combinedScore);
  }

  const thresholds = deriveThresholds(rawScores);
  for (const p of preliminary) {
    scored.push({
      targetId: p.targetId,
      locale: p.locale,
      phrase: p.phrase,
      backTranslation: p.backTranslation,
      referenceText: p.referenceText,
      tokenOverlap: p.tokenOverlap,
      trigramScore: p.trigramScore,
      combinedScore: p.combinedScore,
      classification: classify(p.combinedScore, thresholds, !!p.referenceText),
      fromCache: true,
    });
  }

  console.log(`\n=== backtranslate-synonyms --rescore ===`);
  console.log(`Locales in scope: ${scopeLocaleList.join(', ')}`);
  console.log(`Cached entries scored: ${scored.length}`);
  console.log(`Orphaned cache entries skipped: ${orphanedCacheEntries}`);

  writeReports(
    cli.reportMdPath,
    cli.reportJsonPath,
    scored,
    thresholds,
    null,
    false,
    { cachedEntriesScored: scored.length, orphanedCacheEntries, localesInCache: scopeLocaleList },
  );

  const matchCount = scored.filter(s => s.classification === 'match').length;
  const weakCount = scored.filter(s => s.classification === 'weak').length;
  const mismatchCount = scored.filter(s => s.classification === 'mismatch').length;
  const noRefCount = scored.filter(s => s.classification === 'no-reference').length;
  console.log(`\nScored ${scored.length} phrase(s): match=${matchCount} weak=${weakCount} mismatch=${mismatchCount} no-reference=${noRefCount}`);
}

async function main(): Promise<void> {
  const cli = parseArgs(process.argv.slice(2));

  if (cli.rescore) {
    if (cli.plan || cli.planOnly) {
      console.warn('WARNING: --plan/--plan-only ignored because --rescore is set (rescore never calls DeepL, so there is nothing to plan for).');
    }
    await runRescore(cli);
    return;
  }

  let gate: GateResult | null = null;
  if (!cli.noGate) {
    if (!existsSync(cli.gateResultPath)) {
      console.error(`FATAL: gate result not found at ${cli.gateResultPath}.`);
      console.error('Run "npm run gate:synonyms" first, or pass --no-gate to explicitly bypass gate filtering.');
      console.error('--no-gate treats ALL raw deduplicated phrases as survivors, including ones the gate would reject — not recommended for a real budget-spending run.');
      process.exit(1);
      return;
    }
    gate = readJsonFile<GateResult>(cli.gateResultPath);
  } else {
    console.warn('WARNING: running with --no-gate. Gate filtering is bypassed; every raw deduplicated phrase is treated as a survivor, including phrases the gate would have rejected.');
  }

  const requestedLocales = cli.langs ?? TRANSLATABLE_LOCALES;
  const invalidLocales = requestedLocales.filter(l => !TRANSLATABLE_LOCALES.includes(l));
  if (invalidLocales.length) {
    console.warn(`WARNING: ignoring unknown or non-translatable locale(s) from --lang: ${invalidLocales.join(', ')}`);
  }
  const scopeLocaleList = requestedLocales.filter(l => TRANSLATABLE_LOCALES.includes(l));
  if (!scopeLocaleList.length) {
    console.error('FATAL: no valid translatable locale in scope after applying --lang.');
    process.exit(1);
    return;
  }
  const scopeLocales = new Set(scopeLocaleList);

  const manifest = readJsonFile<CoreTarget[]>(cli.coreManifestPath);
  const activeTargets = manifest.filter(t => !t.obsolete);

  const overlays = new Map<string, OverlayFile>();
  for (const locale of OVERLAY_LOCALES) {
    if (!scopeLocales.has(locale)) continue;
    const path = join(cli.pluginsRoot, locale, 'navigation-targets.json');
    if (!existsSync(path)) continue;
    overlays.set(locale, readJsonFile<OverlayFile>(path));
  }

  let anchorsByTargetId = new Map<string, AnchorEntry>();
  if (existsSync(cli.anchorsPath)) {
    const anchors = readJsonFile<AnchorsFile>(cli.anchorsPath);
    anchorsByTargetId = new Map(anchors.targets.map(a => [a.targetId, a]));
  } else {
    console.warn(`WARNING: anchors file not found at ${cli.anchorsPath}, reference text will fall back to core German synonyms only.`);
  }
  const coreDeByTargetId = new Map(activeTargets.map(t => [t.targetId, t.synonyms?.de ?? []]));

  const { survivorsByPair, statsByLocale } = reconstructSurvivors(activeTargets, overlays, gate, scopeLocales);
  const desiredSelection = selectItems(survivorsByPair, scopeLocales, cli.sampleRate, cli.seed);

  const cache = loadCache(cli.cachePath);
  const cachedItems: { item: SelectedItem; backTranslation: string }[] = [];
  const uncached: SelectedItem[] = [];
  for (const item of desiredSelection) {
    const key = cacheKey(item.locale, item.phrase);
    const hit = cache[key];
    if (hit) cachedItems.push({ item, backTranslation: hit.backTranslation });
    else uncached.push(item);
  }

  const plannedChars = uncached.reduce((s, it) => s + it.sourceChars, 0);
  console.log(`\n=== backtranslate-synonyms ===`);
  console.log(`Locales in scope: ${scopeLocaleList.join(', ')}`);
  console.log(`Desired selection: ${desiredSelection.length} phrase(s) (${cachedItems.length} cached, ${uncached.length} need translation)`);
  console.log(`Planned characters to spend (before any budget truncation): ${plannedChars}`);

  printPlanTable(scopeLocaleList, statsByLocale, survivorsByPair, desiredSelection, cachedItems, uncached);

  if (cli.plan) {
    console.log('\n--plan set: fully offline planning only. DEEPL_API_KEY was not read and no network call of any kind was made (not even GET /v2/usage). Exiting.');
    return;
  }

  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    console.error('FATAL: DEEPL_API_KEY environment variable is not set. This script reads the DeepL key only from that variable.');
    process.exit(1);
    return;
  }

  const usageBefore = await fetchUsage(apiKey);
  const deeplRemaining = usageBefore.character_limit - usageBefore.character_count;
  console.log(`DeepL usage: ${usageBefore.character_count}/${usageBefore.character_limit} consumed, ${deeplRemaining} remaining`);

  let pending = uncached;
  if (cli.budget !== null && plannedChars > cli.budget) {
    pending = truncateToBudget(uncached, cli.budget);
    const droppedCount = uncached.length - pending.length;
    console.log(`--budget ${cli.budget} truncates selection deterministically: ${droppedCount} phrase(s) dropped.`);
  }
  const finalPlannedChars = pending.reduce((s, it) => s + it.sourceChars, 0);

  if (finalPlannedChars > deeplRemaining) {
    console.error(`ABORT: planned ${finalPlannedChars} characters exceed the live DeepL remaining budget of ${deeplRemaining} (short by ${finalPlannedChars - deeplRemaining}).`);
    console.error('Narrow --lang, lower --sample-rate, or pass a smaller --budget. No DeepL translate call was made.');
    process.exit(1);
    return;
  }

  if (cli.planOnly) {
    console.log('\n--plan-only set: exiting before any translate call.');
    console.log(`Final planned characters: ${finalPlannedChars}`);
    return;
  }

  const { results, succeededChars, quotaExhausted } = pending.length
    ? await runTranslation(apiKey, pending, cache, cli.cachePath)
    : { results: new Map<string, string>(), succeededChars: 0, quotaExhausted: false };

  let usageAfter: DeeplUsage | null = null;
  let actualUsageDeltaChars: number | null = null;
  if (pending.length) {
    usageAfter = await fetchUsage(apiKey);
    actualUsageDeltaChars = usageAfter.character_count - usageBefore.character_count;
    console.log(`\nDeepL usage after: ${usageAfter.character_count}/${usageAfter.character_limit}`);
    console.log(`Predicted characters spent (succeeded batches): ${succeededChars}`);
    console.log(`Actual usage delta measured: ${actualUsageDeltaChars}`);
  }

  const scored: ScoredResult[] = [];
  const rawScores: number[] = [];
  const combined: { item: SelectedItem; backTranslation: string; fromCache: boolean }[] = [
    ...cachedItems.map(c => ({ item: c.item, backTranslation: c.backTranslation, fromCache: true })),
    ...pending
      .filter(it => results.has(cacheKey(it.locale, it.phrase)))
      .map(it => ({ item: it, backTranslation: results.get(cacheKey(it.locale, it.phrase))!, fromCache: false })),
  ];

  const preliminary: { c: (typeof combined)[number]; referenceText: string; tokenOverlap: number; trigramScore: number; combinedScore: number }[] = [];
  for (const c of combined) {
    const anchor = anchorsByTargetId.get(c.item.targetId);
    const referenceText = buildReferenceText(anchor, coreDeByTargetId.get(c.item.targetId) ?? []);
    const tokenOverlap = referenceText ? tokenOverlapScore(c.backTranslation, referenceText) : 0;
    const trigramScore = referenceText ? trigramContainmentScore(c.backTranslation, referenceText) : 0;
    const combinedScore = Math.max(tokenOverlap, trigramScore);
    preliminary.push({ c, referenceText, tokenOverlap, trigramScore, combinedScore });
    if (referenceText) rawScores.push(combinedScore);
  }

  const thresholds = deriveThresholds(rawScores);
  for (const p of preliminary) {
    scored.push({
      targetId: p.c.item.targetId,
      locale: p.c.item.locale,
      phrase: p.c.item.phrase,
      backTranslation: p.c.backTranslation,
      referenceText: p.referenceText,
      tokenOverlap: p.tokenOverlap,
      trigramScore: p.trigramScore,
      combinedScore: p.combinedScore,
      classification: classify(p.combinedScore, thresholds, !!p.referenceText),
      fromCache: p.c.fromCache,
    });
  }

  writeReports(
    cli.reportMdPath,
    cli.reportJsonPath,
    scored,
    thresholds,
    {
      plannedChars,
      finalPlannedChars,
      predictedSucceededChars: succeededChars,
      actualUsageDeltaChars,
      usageBefore,
      usageAfter,
      cachedCount: cachedItems.length,
      explicitBudget: cli.budget,
      quotaExhausted,
    },
    gate !== null,
    null,
  );

  const matchCount = scored.filter(s => s.classification === 'match').length;
  const weakCount = scored.filter(s => s.classification === 'weak').length;
  const mismatchCount = scored.filter(s => s.classification === 'mismatch').length;
  const noRefCount = scored.filter(s => s.classification === 'no-reference').length;
  console.log(`\nScored ${scored.length} phrase(s): match=${matchCount} weak=${weakCount} mismatch=${mismatchCount} no-reference=${noRefCount}`);
}

if (require.main === module) {
  main().catch(err => {
    console.error(`FATAL: ${(err as Error).message}`);
    process.exit(1);
  });
}
