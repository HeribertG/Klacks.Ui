// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Deterministic accept/reject gate for navigation synonyms (core manifest + language-plugin
 * overlays). Unlike validate-synonyms.ts (an LLM critic), this script makes no API call: every
 * decision is a pure function of the JSON data on disk, so the same input always yields the same
 * output. Each check REJECTS outright — it never just warns — except the two checks explicitly
 * marked "warning-only" at the bottom of the file. A target that ends up with zero synonyms in a
 * locale is accepted as a correct outcome (empty falls back to the LLM navigation path), so this
 * script never enforces a "keep at least N" floor.
 *
 * Default run (no flags): report-only, writes tools/synonym-gate-report.md and
 * tools/synonym-gate-result.json, changes nothing on disk.
 * --apply: rewrites navigation-targets.json (core) and every locale overlay in place, removing
 *   deduplicated and rejected phrases. Writes via a .tmp file + rename, then re-reads the final
 *   file to confirm it does not start with a NUL byte and still parses as JSON.
 * --only-locale=xx: restrict the run to one locale (comma-separated), for faster iteration.
 *
 * Extension point (not implemented): an embedding-argmax check — embed every surviving phrase and
 * the English anchor synonyms of all targets, reject if the phrase's nearest target is not its own
 * — would need the backend's ONNX embedding model, which does not fit in this machine's free RAM
 * right now. Wire it in as an additional entry in the CHECKS pipeline (see runChecks()) once that
 * constraint is gone; it must stay additive, never replacing the checks below.
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

interface Rejection {
  targetId: string;
  locale: string;
  phrase: string;
  checks: string[];
}
interface Warning {
  targetId: string;
  locale: string;
  message: string;
}
interface EmptyPair {
  targetId: string;
  locale: string;
}

const UI_ROOT = resolve(__dirname, '..');
const MANIFEST_PATH = resolve(UI_ROOT, '../Klacks.Api/Application/Skills/Definitions/navigation-targets.json');
const PLUGINS_ROOT = resolve(UI_ROOT, '../Klacks.Api/Plugins/Languages');
const CORE_I18N_ROOT = resolve(UI_ROOT, 'src/assets/i18n');
const WAKE_WORD_PATH = resolve(UI_ROOT, '../Klacks.Api/Application/Klacksy/wake-word-variants.json');
const REPORT_MD_PATH = resolve(UI_ROOT, 'tools/synonym-gate-report.md');
const REPORT_JSON_PATH = resolve(UI_ROOT, 'tools/synonym-gate-result.json');

const CORE_LOCALES = ['de', 'en', 'fr', 'it'];
const OVERLAY_LOCALES = ['ar', 'cs', 'da', 'el', 'es', 'fi', 'he', 'id', 'ja', 'ko', 'ms', 'nb', 'nl', 'pl', 'pt', 'ro', 'sv', 'th', 'vi', 'zh-CN', 'zh-TW'];
const ALL_LOCALES = [...CORE_LOCALES, ...OVERLAY_LOCALES];
const SPACELESS_LOCALES = new Set(['ja', 'zh-CN', 'zh-TW', 'th']);
const REQUIRED_SCRIPT_BLOCKS: Record<string, string[]> = {
  ja: ['Han', 'Hiragana', 'Katakana'],
  ko: ['Hangul'],
  th: ['Thai'],
  he: ['Hebrew'],
  ar: ['Arabic'],
  el: ['Greek'],
  'zh-CN': ['Han'],
  'zh-TW': ['Han'],
};
const ASCII_ACRONYMS = new Set(['erp', 'xml', 'pdf', 'api', 'csv', 'id', 'url', 'llm', 'sms', 'imap', 'smtp']);

const MIN_LEN_SPACED = 2;
const MIN_LEN_SPACELESS = 1;
const MAX_LEN = 40;
const WARN_ONE_WORD_RATIO = 0.30;
const WARN_SHORT_CHAR_LEN = 6;
const WARN_MIN_SURVIVORS = 4;

export interface SentenceThreshold {
  unit: 'tokens' | 'chars';
  max: number;
}

/**
 * Per-locale ceiling for the full-sentence lock (#5): a phrase above this is a sentence, not a
 * navigation keyword. A single fixed number ("3 tokens" / "12 chars") is wrong across languages
 * because word-per-concept density differs by script and morphology: Thai is alphabetic (several
 * characters per syllable, unlike logographic Han/Kana), and Vietnamese writes each syllable of a
 * compound as its own space-separated token, unlike German/English tokens.
 * Measured (not guessed) as the 90th percentile of real, human-written UI label lengths for each
 * language, from Klacks.Ui/src/assets/i18n/{de,en,fr,it}.json (core) and
 * Klacks.Api/Plugins/Languages/{locale}/translations.json (overlay locales), values 3-39 chars,
 * excluding any label containing a "{{" interpolation placeholder. Corrected 2026-09-09 after the
 * original de/en/fr/it-shaped thresholds (3 tokens / 12 chars for every spaceless script) rejected
 * roughly half of Thai's and most of Vietnamese's real UI vocabulary.
 */
export const SENTENCE_THRESHOLDS: Record<string, SentenceThreshold> = {
  de: { unit: 'tokens', max: 3 },
  fi: { unit: 'tokens', max: 3 },
  en: { unit: 'tokens', max: 4 },
  fr: { unit: 'tokens', max: 4 },
  it: { unit: 'tokens', max: 4 },
  ar: { unit: 'tokens', max: 4 },
  cs: { unit: 'tokens', max: 4 },
  da: { unit: 'tokens', max: 4 },
  el: { unit: 'tokens', max: 4 },
  he: { unit: 'tokens', max: 4 },
  id: { unit: 'tokens', max: 4 },
  ms: { unit: 'tokens', max: 4 },
  nb: { unit: 'tokens', max: 4 },
  nl: { unit: 'tokens', max: 4 },
  pl: { unit: 'tokens', max: 4 },
  ro: { unit: 'tokens', max: 4 },
  sv: { unit: 'tokens', max: 4 },
  es: { unit: 'tokens', max: 5 },
  pt: { unit: 'tokens', max: 5 },
  ko: { unit: 'tokens', max: 5 },
  vi: { unit: 'tokens', max: 6 },
  'zh-CN': { unit: 'chars', max: 14 },
  'zh-TW': { unit: 'chars', max: 14 },
  ja: { unit: 'chars', max: 21 },
  th: { unit: 'chars', max: 28 },
};
/**
 * Fallback for a locale not yet in SENTENCE_THRESHOLDS (e.g. a newly added language pack): a
 * conservative default so an unmeasured locale degrades gracefully instead of crashing the gate.
 * Token-based languages default to the most common measured ceiling (4); a locale already known
 * to use a spaceless script (SPACELESS_LOCALES) defaults to the ja/zh character ceiling (21)
 * rather than the token ceiling, since counting "tokens" in unsegmented text is meaningless.
 */
const DEFAULT_SENTENCE_THRESHOLD_TOKENS: SentenceThreshold = { unit: 'tokens', max: 4 };
const DEFAULT_SENTENCE_THRESHOLD_CHARS: SentenceThreshold = { unit: 'chars', max: 21 };
function sentenceThresholdFor(locale: string): SentenceThreshold {
  return SENTENCE_THRESHOLDS[locale] ?? (isSpaceless(locale) ? DEFAULT_SENTENCE_THRESHOLD_CHARS : DEFAULT_SENTENCE_THRESHOLD_TOKENS);
}

/**
 * A route- or category-derived generic label a phrase must not equal on its own, scoped to the
 * targets that share the route/category (only groups with more than one active target qualify).
 */
interface GenericGroup {
  memberTargetIds: Set<string>;
  slugCandidate: string;
  labelKeys: string[];
}

const ROUTE_LABEL_KEY: Record<string, string> = {
  '/workplace/settings': 'setting.title',
  '/workplace/period-closing': 'periodClosing.title',
};

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const onlyLocaleArg = args.find(a => a.startsWith('--only-locale='));
const ONLY_LOCALES = onlyLocaleArg ? onlyLocaleArg.split('=')[1].split(',').map(s => s.trim()) : null;
const activeLocales = ONLY_LOCALES ? ALL_LOCALES.filter(l => ONLY_LOCALES.includes(l)) : ALL_LOCALES;

function readAndCheckFile(path: string): { text: string | null; issues: string[] } {
  const buf = readFileSync(path);
  const issues: string[] = [];
  let work = buf;
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    issues.push('bom');
    work = buf.subarray(3);
  }
  if (work.includes(0x00)) {
    issues.push('null-byte');
  }
  const text = work.toString('utf8');
  const roundtrip = Buffer.from(text, 'utf8');
  if (!roundtrip.equals(work)) {
    issues.push('invalid-utf8');
  }
  if (issues.includes('null-byte') || issues.includes('invalid-utf8')) {
    return { text: null, issues };
  }
  return { text, issues };
}

function parseJsonFile<T>(path: string, fileIssues: Record<string, string[]>): T | null {
  const { text, issues } = readAndCheckFile(path);
  if (issues.length) fileIssues[path] = issues;
  if (text === null) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    fileIssues[path] = [...(fileIssues[path] ?? []), 'json-parse-error'];
    return null;
  }
}

function nfcOf(s: string): string {
  return s.normalize('NFC');
}
function hasNfcMismatch(raw: string): boolean {
  return raw !== nfcOf(raw);
}
const CONTROL_CHAR_RE = /[\x00-\x1f\x7f\uFEFF]/;
function hasControlChar(raw: string): boolean {
  return CONTROL_CHAR_RE.test(raw);
}
function normKey(s: string): string {
  return nfcOf(s).trim().replace(/\s+/g, ' ').toLowerCase();
}
function normDisplay(s: string): string {
  return nfcOf(s).trim().replace(/\s+/g, ' ');
}
function codepointLength(s: string): number {
  return Array.from(s).length;
}
function isSpaceless(locale: string): boolean {
  return SPACELESS_LOCALES.has(locale);
}

const NEUTRAL_RE = /[\d\s\u0300-\u036f\u3000-\u303f\u2000-\u206f\p{P}]/u;
const HAN_RE = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/u;
const HIRAGANA_RE = /[\u3040-\u309f]/u;
const KATAKANA_RE = /[\u30a0-\u30ff]/u;
const HANGUL_RE = /[\uac00-\ud7a3\u1100-\u11ff\u3130-\u318f]/u;
const THAI_RE = /[\u0e00-\u0e7f]/u;
const HEBREW_RE = /[\u0590-\u05ff]/u;
const ARABIC_RE = /[\u0600-\u06ff\u0750-\u077f]/u;
const GREEK_RE = /[\u0370-\u03ff]/u;
const LATIN_RE = /[A-Za-z\u00c0-\u02af\u1e00-\u1eff\uff21-\uff3a\uff41-\uff5a]/u;

type ScriptBlock = 'Han' | 'Hiragana' | 'Katakana' | 'Hangul' | 'Thai' | 'Hebrew' | 'Arabic' | 'Greek' | 'Latin' | 'neutral' | 'other';
function classifyChar(ch: string): ScriptBlock {
  if (NEUTRAL_RE.test(ch)) return 'neutral';
  if (HAN_RE.test(ch)) return 'Han';
  if (HIRAGANA_RE.test(ch)) return 'Hiragana';
  if (KATAKANA_RE.test(ch)) return 'Katakana';
  if (HANGUL_RE.test(ch)) return 'Hangul';
  if (THAI_RE.test(ch)) return 'Thai';
  if (HEBREW_RE.test(ch)) return 'Hebrew';
  if (ARABIC_RE.test(ch)) return 'Arabic';
  if (GREEK_RE.test(ch)) return 'Greek';
  if (LATIN_RE.test(ch)) return 'Latin';
  return 'other';
}

const TOKEN_SPLIT_RE = /[\s\-_/,.:;()"'!?]+/;
function tokenize(phrase: string): string[] {
  return phrase.split(TOKEN_SPLIT_RE).filter(Boolean);
}

function significantChars(phrase: string): string[] {
  const tokens = tokenize(phrase);
  const acronymTokens = tokens.filter(t => ASCII_ACRONYMS.has(t.toLowerCase()));
  let working = phrase;
  for (const t of acronymTokens) {
    working = working.replace(new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'), ' ');
  }
  return Array.from(working);
}

function scriptViolation(locale: string, phrase: string): boolean {
  const chars = significantChars(phrase);
  const required = REQUIRED_SCRIPT_BLOCKS[locale];
  if (required) {
    return !chars.some(c => required.includes(classifyChar(c)));
  }
  const FOREIGN_BLOCKS: ScriptBlock[] = ['Han', 'Hiragana', 'Katakana', 'Hangul', 'Thai', 'Hebrew', 'Arabic', 'Greek'];
  return chars.some(c => FOREIGN_BLOCKS.includes(classifyChar(c)));
}

function lengthViolation(locale: string, phrase: string): boolean {
  const len = codepointLength(phrase);
  const min = isSpaceless(locale) ? MIN_LEN_SPACELESS : MIN_LEN_SPACED;
  return len < min || len > MAX_LEN;
}

function sentenceViolation(locale: string, phrase: string, prefixes: string[]): boolean {
  const threshold = sentenceThresholdFor(locale);
  if (threshold.unit === 'chars') {
    if (codepointLength(phrase) > threshold.max) return true;
  } else {
    if (tokenize(phrase).length > threshold.max) return true;
  }
  const lower = phrase.toLowerCase();
  return prefixes.some(p => lower.startsWith(p.toLowerCase()));
}

/**
 * Targets whose own subject IS Klacksy/the assistant, so their synonyms legitimately have to say
 * "klacksy" ("Klacksy Persönlichkeit", "Klacksy Modell-Check", ...) — the wake-word-lock (#6)
 * would otherwise reject every synonym for these targets. Curated by hand from the current
 * manifest, not by a blanket "contains klacksy" rule: every targetId containing "klacksy" or
 * "assistant" turned out to sit under category "settings.ai" or the page "klacksy-training" (both
 * are meta-settings screens for the bot itself) — except "plan-execution-panel", found by reading
 * its sourceFile (Application/.../assistant-chat/plan-execution-panel/...) rather than its
 * targetId: it is the panel that visualizes Klacksy's own agent action plans.
 * Deliberately NOT exempted: any other target that merely mentions "klacksy" in passing, e.g.
 * "deepl" ("linkitä deepl klacksiin" — link DeepL to Klacksy). That target's own subject is the
 * DeepL integration, not the bot, so a bot-name mention there is exactly the accidental-bleed
 * case check #6 exists to catch, and it stays rejected.
 */
const BOT_SELF_TARGET_IDS = new Set([
  'assistant-learning',
  'assistant-personality',
  'assistant-skill-relations',
  'assistant-speech',
  'klacksy-autonomy',
  'klacksy-model-check',
  'klacksy-proactive-governance',
  'klacksy-training',
  'plan-execution-panel',
]);

function wakeWordViolation(targetId: string, phrase: string, badWords: string[]): boolean {
  if (BOT_SELF_TARGET_IDS.has(targetId)) return false;
  const lower = phrase.toLowerCase();
  return badWords.some(w => lower.includes(w));
}

/**
 * A phrase is generic when it equals the route/category slug of a group the target belongs to, or
 * the label of ANOTHER member of that group. The target's own label is exempt: a group collects the
 * labels of all its members, so without the exemption every settings card lost its own name.
 * @param ownLabelKey - labelKey of the target the phrase belongs to
 */
function genericViolation(groups: GenericGroup[], locale: string, targetId: string, ownLabelKey: string, phrase: string, translations: Map<string, Record<string, string>>): boolean {
  const key = normKey(phrase);
  for (const g of groups) {
    if (!g.memberTargetIds.has(targetId)) continue;
    if (key === normKey(g.slugCandidate)) return true;
    const localeTranslations = translations.get(locale);
    if (!localeTranslations) continue;
    for (const lk of g.labelKeys) {
      if (lk === ownLabelKey) continue;
      const resolved = localeTranslations[lk];
      if (resolved && key === normKey(resolved)) return true;
    }
  }
  return false;
}

function loadTranslations(locale: string, fileIssues: Record<string, string[]>): Record<string, string> {
  const path = CORE_LOCALES.includes(locale)
    ? join(CORE_I18N_ROOT, `${locale}.json`)
    : join(PLUGINS_ROOT, locale, 'translations.json');
  if (!existsSync(path)) return {};
  const data = parseJsonFile<Record<string, string>>(path, fileIssues);
  return data ?? {};
}

function buildGenericGroups(targets: CoreTarget[]): GenericGroup[] {
  const groups: GenericGroup[] = [];
  const byRoute = new Map<string, CoreTarget[]>();
  const byCategory = new Map<string, CoreTarget[]>();
  for (const t of targets) {
    if (t.route) {
      const arr = byRoute.get(t.route) ?? [];
      arr.push(t);
      byRoute.set(t.route, arr);
    }
    if (t.category) {
      const arr = byCategory.get(t.category) ?? [];
      arr.push(t);
      byCategory.set(t.category, arr);
    }
  }
  const slugFromRoute = (route: string): string => {
    const seg = route.split('/').filter(Boolean).pop() ?? '';
    return seg.replace(/-/g, ' ');
  };
  const slugFromCategory = (category: string): string => {
    const seg = category.split('.').pop() ?? category;
    return seg.replace(/-/g, ' ');
  };
  for (const [route, members] of byRoute) {
    if (members.length < 2) continue;
    const slug = slugFromRoute(route);
    if (!slug) continue;
    const labelKeys = [...new Set(members.map(m => m.labelKey).filter(Boolean))];
    if (ROUTE_LABEL_KEY[route]) labelKeys.push(ROUTE_LABEL_KEY[route]);
    groups.push({ memberTargetIds: new Set(members.map(m => m.targetId)), slugCandidate: slug, labelKeys });
  }
  for (const [category, members] of byCategory) {
    if (members.length < 2) continue;
    const slug = slugFromCategory(category);
    if (!slug) continue;
    const labelKeys = [...new Set(members.map(m => m.labelKey).filter(Boolean))];
    groups.push({ memberTargetIds: new Set(members.map(m => m.targetId)), slugCandidate: slug, labelKeys });
  }
  return groups;
}

interface PairPhrases {
  targetId: string;
  locale: string;
  raw: string[];
}

function collectPairs(targets: CoreTarget[], overlays: Map<string, OverlayFile>): PairPhrases[] {
  const pairs: PairPhrases[] = [];
  for (const t of targets) {
    for (const locale of CORE_LOCALES) {
      if (!activeLocales.includes(locale)) continue;
      const raw = t.synonyms?.[locale];
      if (raw && raw.length) pairs.push({ targetId: t.targetId, locale, raw });
    }
    for (const locale of OVERLAY_LOCALES) {
      if (!activeLocales.includes(locale)) continue;
      const overlay = overlays.get(locale);
      const entry = overlay?.[t.targetId];
      if (entry?.synonyms?.length) pairs.push({ targetId: t.targetId, locale, raw: entry.synonyms });
    }
  }
  return pairs;
}

function run(): void {
  const fileIssues: Record<string, string[]> = {};
  const manifest = parseJsonFile<CoreTarget[]>(MANIFEST_PATH, fileIssues);
  if (!manifest) {
    console.error(`FATAL: cannot parse core manifest ${MANIFEST_PATH}`);
    console.error(JSON.stringify(fileIssues, null, 2));
    process.exit(1);
  }
  const wakeWordCfg = JSON.parse(readFileSync(WAKE_WORD_PATH, 'utf8')) as { canonical: string; variants: string[]; prefixes: Record<string, string[]> };
  const badWords = [wakeWordCfg.canonical, ...wakeWordCfg.variants].map(w => w.toLowerCase());
  const prefixesByLocale = wakeWordCfg.prefixes ?? {};

  const overlays = new Map<string, OverlayFile>();
  for (const locale of OVERLAY_LOCALES) {
    const path = join(PLUGINS_ROOT, locale, 'navigation-targets.json');
    if (!existsSync(path)) continue;
    const data = parseJsonFile<OverlayFile>(path, fileIssues);
    if (data) overlays.set(locale, data);
  }

  const activeTargets = manifest.filter(t => !t.obsolete);
  const obsoleteCount = manifest.length - activeTargets.length;
  const genericGroups = buildGenericGroups(activeTargets);

  const translationsByLocale = new Map<string, Record<string, string>>();
  for (const locale of ALL_LOCALES) {
    translationsByLocale.set(locale, loadTranslations(locale, fileIssues));
  }

  const activeTargetIds = new Set(activeTargets.map(t => t.targetId));
  const labelKeyById = new Map(activeTargets.map(t => [t.targetId, t.labelKey ?? '']));
  const pairs = collectPairs(activeTargets, overlays).filter(p => activeTargetIds.has(p.targetId));

  const rejections: Rejection[] = [];
  const warnings: Warning[] = [];
  const emptyPairs: EmptyPair[] = [];
  const survivorsByPair = new Map<string, string[]>();
  const dedupRemovedByPair = new Map<string, number>();
  let totalRaw = 0;
  let totalDedupRemoved = 0;
  let totalUnique = 0;
  const checkCounts: Record<string, number> = {};
  const localeStats = new Map<string, { unique: number; rejected: number }>();

  for (const { targetId, locale, raw } of pairs) {
    totalRaw += raw.length;
    const seen = new Map<string, string>();
    let dedupRemoved = 0;
    for (const p of raw) {
      const k = normKey(p);
      if (seen.has(k)) dedupRemoved++;
      else seen.set(k, p);
    }
    const uniquePhrases = [...seen.values()];
    totalDedupRemoved += dedupRemoved;
    totalUnique += uniquePhrases.length;
    dedupRemovedByPair.set(`${targetId}|${locale}`, dedupRemoved);

    const stat = localeStats.get(locale) ?? { unique: 0, rejected: 0 };
    stat.unique += uniquePhrases.length;
    localeStats.set(locale, stat);

    const tentativeClean: string[] = [];
    for (const phrase of uniquePhrases) {
      const violated: string[] = [];
      if (hasNfcMismatch(phrase) || hasControlChar(phrase)) violated.push('integrity');
      if (scriptViolation(locale, phrase)) violated.push('script');
      if (sentenceViolation(locale, phrase, prefixesByLocale[locale] ?? [])) violated.push('full-sentence');
      if (wakeWordViolation(targetId, phrase, badWords)) violated.push('wake-word');
      if (lengthViolation(locale, phrase)) violated.push('length');
      if (genericViolation(genericGroups, locale, targetId, labelKeyById.get(targetId) ?? '', phrase, translationsByLocale)) violated.push('generic-lock');

      if (violated.length) {
        rejections.push({ targetId, locale, phrase, checks: violated });
        for (const c of violated) checkCounts[c] = (checkCounts[c] ?? 0) + 1;
      } else {
        tentativeClean.push(phrase);
      }
    }
    survivorsByPair.set(`${targetId}|${locale}`, tentativeClean);
  }

  const collisionMap = new Map<string, Map<string, string[]>>();
  for (const [pairKey, phrases] of survivorsByPair) {
    const [targetId, locale] = pairKey.split('|');
    const localeMap = collisionMap.get(locale) ?? new Map<string, string[]>();
    for (const phrase of phrases) {
      const k = normKey(phrase);
      const list = localeMap.get(k) ?? [];
      list.push(targetId);
      localeMap.set(k, list);
    }
    collisionMap.set(locale, localeMap);
  }
  const phraseByPairKey = new Map<string, string[]>();
  for (const [pairKey, phrases] of survivorsByPair) phraseByPairKey.set(pairKey, phrases);

  for (const [locale, localeMap] of collisionMap) {
    for (const [normPhrase, targetIds] of localeMap) {
      const distinctTargets = [...new Set(targetIds)];
      if (distinctTargets.length <= 1) continue;
      for (const targetId of distinctTargets) {
        const pairKey = `${targetId}|${locale}`;
        const phrases = phraseByPairKey.get(pairKey) ?? [];
        const idx = phrases.findIndex(p => normKey(p) === normPhrase);
        const original = idx >= 0 ? phrases[idx] : normPhrase;
        rejections.push({ targetId, locale, phrase: original, checks: ['collision'] });
        checkCounts['collision'] = (checkCounts['collision'] ?? 0) + 1;
        const survivors = survivorsByPair.get(pairKey) ?? [];
        survivorsByPair.set(pairKey, survivors.filter(p => normKey(p) !== normPhrase));
      }
    }
  }

  const rejectedPairKeys = new Set<string>();
  for (const r of rejections) rejectedPairKeys.add(`${r.targetId}|${r.locale}`);

  for (const [pairKey, phrases] of survivorsByPair) {
    const [targetId, locale] = pairKey.split('|');
    const stat = localeStats.get(locale)!;
    if (rejectedPairKeys.has(pairKey)) {
      const rejectedInPair = new Set(rejections.filter(r => `${r.targetId}|${r.locale}` === pairKey).map(r => normKey(r.phrase)));
      stat.rejected += rejectedInPair.size;
    }
    if (phrases.length === 0) {
      const hadEntry = (dedupRemovedByPair.get(pairKey) ?? 0) > 0 || rejectedPairKeys.has(pairKey);
      if (hadEntry) emptyPairs.push({ targetId, locale });
      continue;
    }
    const oneWordOrShort = isSpaceless(locale)
      ? phrases.filter(p => codepointLength(p) <= WARN_SHORT_CHAR_LEN).length
      : phrases.filter(p => tokenize(p).length === 1).length;
    const ratio = oneWordOrShort / phrases.length;
    if (ratio < WARN_ONE_WORD_RATIO) {
      warnings.push({
        targetId,
        locale,
        message: isSpaceless(locale)
          ? `only ${(ratio * 100).toFixed(0)}% of surviving phrases are <=${WARN_SHORT_CHAR_LEN} chars`
          : `only ${(ratio * 100).toFixed(0)}% of surviving phrases are single-word`,
      });
    }
    if (phrases.length < WARN_MIN_SURVIVORS) {
      warnings.push({ targetId, locale, message: `only ${phrases.length} surviving phrase(s), below ${WARN_MIN_SURVIVORS}` });
    }
  }

  const totalRejectedDistinct = new Set(rejections.map(r => `${r.targetId}|${r.locale}|${normKey(r.phrase)}`)).size;
  const rejectionRatePct = totalUnique ? (totalRejectedDistinct / totalUnique) * 100 : 0;

  console.log(`\n=== synonym-gate ${APPLY ? '(APPLY MODE)' : '(report-only)'} ===`);
  console.log(`Active targets: ${activeTargets.length} (obsolete excluded: ${obsoleteCount})`);
  console.log(`Raw phrases: ${totalRaw} | deduplicated: ${totalDedupRemoved} | unique candidates: ${totalUnique}`);
  console.log(`Rejected: ${totalRejectedDistinct} (${rejectionRatePct.toFixed(1)}%) | survivors: ${totalUnique - totalRejectedDistinct}`);
  console.log(`Per-check counts (union, phrases can violate more than one check):`);
  for (const [c, n] of Object.entries(checkCounts).sort((a, b) => b[1] - a[1])) console.log(`  ${c}: ${n}`);
  console.log(`Warnings: ${warnings.length} | empty-after-gate pairs: ${emptyPairs.length}`);
  if (Object.keys(fileIssues).length) {
    console.log(`\nFile integrity issues:`);
    for (const [path, issues] of Object.entries(fileIssues)) console.log(`  ${path}: ${issues.join(', ')}`);
  }

  localeDeDiagnostic();

  writeReports(activeTargets, fileIssues, checkCounts, rejections, warnings, emptyPairs, {
    totalRaw,
    totalDedupRemoved,
    totalUnique,
    totalRejectedDistinct,
    rejectionRatePct,
    obsoleteCount,
    activeCount: activeTargets.length,
  }, localeStats);

  function localeDeDiagnostic(): void {
    const deActiveMap = new Map<string, string[]>();
    for (const t of activeTargets) {
      for (const p of t.synonyms?.['de'] ?? []) {
        const k = normKey(p);
        const arr = deActiveMap.get(k) ?? [];
        arr.push(t.targetId);
        deActiveMap.set(k, arr);
      }
    }
    const deAllMap = new Map<string, string[]>();
    for (const t of manifest ?? []) {
      for (const p of t.synonyms?.['de'] ?? []) {
        const k = normKey(p);
        const arr = deAllMap.get(k) ?? [];
        arr.push(t.targetId);
        deAllMap.set(k, arr);
      }
    }
    const ambiguous = (m: Map<string, string[]>) => [...m.values()].filter(v => new Set(v).size > 1).length;
    console.log(`\nDE collision diagnostic:`);
    console.log(`  active-only (142): distinct=${deActiveMap.size}, ambiguous=${ambiguous(deActiveMap)}`);
    console.log(`  including obsolete (147): distinct=${deAllMap.size}, ambiguous=${ambiguous(deAllMap)}`);
  }

  if (APPLY) {
    applyRejections(manifest, overlays, rejections, dedupRemovedByPair, survivorsByPair);
  }
}

function writeReports(
  activeTargets: CoreTarget[],
  fileIssues: Record<string, string[]>,
  checkCounts: Record<string, number>,
  rejections: Rejection[],
  warnings: Warning[],
  emptyPairs: EmptyPair[],
  totals: { totalRaw: number; totalDedupRemoved: number; totalUnique: number; totalRejectedDistinct: number; rejectionRatePct: number; obsoleteCount: number; activeCount: number },
  localeStats: Map<string, { unique: number; rejected: number }>,
): void {
  const byLocaleCheck = new Map<string, Record<string, number>>();
  for (const r of rejections) {
    const m = byLocaleCheck.get(r.locale) ?? {};
    for (const c of r.checks) m[c] = (m[c] ?? 0) + 1;
    byLocaleCheck.set(r.locale, m);
  }

  const localeRows = [...localeStats.entries()].map(([locale, s]) => ({
    locale,
    unique: s.unique,
    rejected: s.rejected,
    ratePct: s.unique ? (s.rejected / s.unique) * 100 : 0,
  })).sort((a, b) => b.ratePct - a.ratePct);

  const lines: string[] = [];
  lines.push('# Synonym Gate Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Active targets: ${totals.activeCount} (obsolete excluded: ${totals.obsoleteCount})`);
  lines.push('');
  lines.push('## Totals');
  lines.push('');
  lines.push(`- Raw phrases: ${totals.totalRaw}`);
  lines.push(`- Deduplicated (removed, not a rejection): ${totals.totalDedupRemoved}`);
  lines.push(`- Unique candidates checked: ${totals.totalUnique}`);
  lines.push(`- Rejected (distinct): ${totals.totalRejectedDistinct} (${totals.rejectionRatePct.toFixed(1)}% of unique candidates)`);
  lines.push(`- Survivors: ${totals.totalUnique - totals.totalRejectedDistinct}`);
  lines.push('');
  lines.push('## Rejections per check (union — a phrase failing 2 checks counts in both rows)');
  lines.push('');
  for (const [c, n] of Object.entries(checkCounts).sort((a, b) => b[1] - a[1])) lines.push(`- ${c}: ${n}`);
  lines.push('');
  lines.push('## Rejection rate per locale');
  lines.push('');
  lines.push('| Locale | Unique | Rejected | Rate |');
  lines.push('|---|---|---|---|');
  for (const row of localeRows) lines.push(`| ${row.locale} | ${row.unique} | ${row.rejected} | ${row.ratePct.toFixed(1)}% |`);
  lines.push('');
  lines.push('## Rejections per check, per locale');
  lines.push('');
  for (const [locale, m] of byLocaleCheck) {
    lines.push(`### ${locale}`);
    for (const [c, n] of Object.entries(m).sort((a, b) => b[1] - a[1])) lines.push(`- ${c}: ${n}`);
    lines.push('');
  }
  lines.push('## Warnings (not rejections)');
  lines.push('');
  if (!warnings.length) lines.push('_none_');
  for (const w of warnings) lines.push(`- ${w.targetId} / ${w.locale}: ${w.message}`);
  lines.push('');
  lines.push(`## Empty-after-gate pairs (${emptyPairs.length})`);
  lines.push('');
  lines.push('A target with zero surviving synonyms in a locale is a correct, accepted outcome — it falls back to the LLM navigation path instead of a wrong fast-path match.');
  lines.push('');
  if (!emptyPairs.length) lines.push('_none_');
  for (const p of emptyPairs.sort((a, b) => (a.locale + a.targetId).localeCompare(b.locale + b.targetId))) lines.push(`- ${p.targetId} / ${p.locale}`);
  lines.push('');
  if (Object.keys(fileIssues).length) {
    lines.push('## File integrity issues');
    lines.push('');
    for (const [path, issues] of Object.entries(fileIssues)) lines.push(`- ${path}: ${issues.join(', ')}`);
    lines.push('');
  }
  writeFileSync(REPORT_MD_PATH, lines.join('\n') + '\n', 'utf8');
  writeFileSync(REPORT_JSON_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), totals, checkCounts, rejections, warnings, emptyPairs }, null, 2) + '\n', 'utf8');
  console.log(`\nReports written:\n  ${REPORT_MD_PATH}\n  ${REPORT_JSON_PATH}`);
}

function writeJsonAtomically(path: string, data: unknown): void {
  const tmp = `${path}.tmp`;
  const text = JSON.stringify(data, null, 2) + '\n';
  writeFileSync(tmp, text, 'utf8');
  renameSync(tmp, path);
  const verifyBuf = readFileSync(path);
  if (verifyBuf.length === 0 || verifyBuf[0] === 0x00) {
    throw new Error(`Post-write verification failed (NUL/empty) for ${path}`);
  }
  JSON.parse(verifyBuf.toString('utf8'));
}

function applyRejections(
  manifest: CoreTarget[],
  overlays: Map<string, OverlayFile>,
  rejections: Rejection[],
  dedupRemovedByPair: Map<string, number>,
  survivorsByPair: Map<string, string[]>,
): void {
  const survivorLookup = new Map<string, Set<string>>();
  for (const [pairKey, phrases] of survivorsByPair) survivorLookup.set(pairKey, new Set(phrases.map(normKey)));

  for (const t of manifest) {
    if (t.obsolete) continue;
    for (const locale of CORE_LOCALES) {
      const pairKey = `${t.targetId}|${locale}`;
      if (!survivorLookup.has(pairKey)) continue;
      const survivors = survivorLookup.get(pairKey)!;
      const original = t.synonyms?.[locale];
      if (!original) continue;
      const seenKeep = new Set<string>();
      const kept: string[] = [];
      for (const p of original) {
        const k = normKey(p);
        if (survivors.has(k) && !seenKeep.has(k)) {
          kept.push(p);
          seenKeep.add(k);
        }
      }
      t.synonyms[locale] = kept;
    }
  }
  writeJsonAtomically(MANIFEST_PATH, manifest);

  for (const [locale, overlay] of overlays) {
    let changed = false;
    for (const targetId of Object.keys(overlay)) {
      const pairKey = `${targetId}|${locale}`;
      if (!survivorLookup.has(pairKey)) continue;
      const survivors = survivorLookup.get(pairKey)!;
      const original = overlay[targetId].synonyms;
      const seenKeep = new Set<string>();
      const kept: string[] = [];
      for (const p of original) {
        const k = normKey(p);
        if (survivors.has(k) && !seenKeep.has(k)) {
          kept.push(p);
          seenKeep.add(k);
        }
      }
      if (kept.length !== original.length) changed = true;
      overlay[targetId].synonyms = kept;
    }
    if (changed) {
      const path = join(PLUGINS_ROOT, locale, 'navigation-targets.json');
      writeJsonAtomically(path, overlay);
    }
  }
  console.log(`\nApplied: manifest + ${overlays.size} overlays rewritten (only overlays with actual removals were touched).`);
}

if (require.main === module) {
  run();
}
