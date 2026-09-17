// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Generates missing skill-labels.json for the 21 Klacksy plugin language packs (Graceful
 * Correction TP1, Block 3). Source of truth: the German `labels.de` string per skill in
 * Application/Skills/Definitions/skill-seeds.json. Target: Plugins/Languages/<locale>/skill-labels.json,
 * a flat { skillName: label } map (one authored string per language, NOT an array like skill-synonyms).
 * Existing entries are never overwritten — only missing skill keys are added.
 *
 * Two providers, split by locale (owner decision 2026-09-17):
 * - DeepL (translation of the German label): ar, he, cs, da, el, es, fi, nb, nl, pl, pt, ro, sv.
 * - DeepSeek (LLM authoring, model deepseek-flash): id, ja, ko, ms, th, vi, zh-CN, zh-TW.
 *
 * Env: LABEL_DEEPL_API_KEY (required for DeepL locales), LABEL_LLM_API_KEY (optional — falls back
 * to the enabled deepseek provider in llm_providers), LABEL_LLM_MODEL (default: deepseek-flash).
 * CLI: --only-locales=xx,yy restricts to a locale subset, --dry-run prints the coverage plan
 * without calling any provider.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';

interface SkillSeed {
  name: string;
  labels?: Record<string, string>;
  version?: number;
}

interface LlmConfig { url: string; key: string; model: string; }

const UI_ROOT = resolve(__dirname, '..');
const SEEDS_FILE = resolve(UI_ROOT, '../Klacks.Api/Application/Skills/Definitions/skill-seeds.json');
const PLUGINS_ROOT = resolve(UI_ROOT, '../Klacks.Api/Plugins/Languages');

const LOCALE_NAMES: Record<string, string> = {
  ar: 'Arabic', cs: 'Czech', da: 'Danish', el: 'Greek', es: 'Spanish', fi: 'Finnish', he: 'Hebrew',
  id: 'Indonesian', ja: 'Japanese', ko: 'Korean', ms: 'Malay', nb: 'Norwegian Bokmål', nl: 'Dutch',
  pl: 'Polish', pt: 'Portuguese', ro: 'Romanian', sv: 'Swedish', th: 'Thai', vi: 'Vietnamese',
  'zh-CN': 'Simplified Chinese', 'zh-TW': 'Traditional Chinese',
};

// DeepL now covers every one of the 21 pack locales (verified live against /v2/languages on
// 2026-09-17) — this split is an owner choice (provider variety / cost distribution), not a
// capability gap. pt maps to PT-PT because the pack's own manifest.json declares speechLocale
// "pt-PT" (European Portuguese), not Brazilian.
const DEEPL_LOCALE_TARGET: Record<string, string> = {
  ar: 'AR', he: 'HE', cs: 'CS', da: 'DA', el: 'EL', es: 'ES', fi: 'FI', nb: 'NB', nl: 'NL',
  pl: 'PL', pt: 'PT-PT', ro: 'RO', sv: 'SV',
};
const BASE_DEEPSEEK_LOCALES = ['id', 'ja', 'ko', 'ms', 'th', 'vi', 'zh-CN', 'zh-TW'];
// Escape hatch for a locale whose assigned provider is temporarily unavailable (e.g. DeepL monthly
// quota exhausted mid-run) — moves it from the DeepL set to DeepSeek for this invocation only,
// without touching the owner's actual per-locale provider assignment above.
const FORCE_DEEPSEEK_LOCALES = (process.env.LABEL_FORCE_DEEPSEEK_LOCALES ?? '')
  .split(',').map(s => s.trim()).filter(Boolean);
const DEEPSEEK_LOCALES = [...new Set([...BASE_DEEPSEEK_LOCALES, ...FORCE_DEEPSEEK_LOCALES])];
const PLUGIN_LOCALES = [...new Set([...Object.keys(DEEPL_LOCALE_TARGET), ...DEEPSEEK_LOCALES])];

const LABEL_MAX_LENGTH = 80; // GracefulCorrectionDefaults.OptionLabelMaxLength

// Marker SettingsEncryptionService puts in front of DataProtection-encrypted values. Such a value is
// useless outside the API process, so it must never travel to a provider as a credential.
const ENCRYPTED_PREFIX = 'ENC:';

const PSQL_PATH = process.env.PSQL_PATH ?? 'C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe';
const DB_HOST = process.env.KLACKS_DB_HOST ?? 'localhost';
const DB_PORT = process.env.KLACKS_DB_PORT ?? '5434';
const DB_USER = process.env.KLACKS_DB_USER ?? 'postgres';
const DB_PASSWORD = process.env.KLACKS_DB_PASSWORD ?? 'admin';
const DB_NAME = process.env.KLACKS_DB_NAME ?? 'klacks';

const ONLY_LOCALES = (process.argv.find(a => a.startsWith('--only-locales='))?.split('=')[1] ?? '')
  .split(',').map(s => s.trim()).filter(Boolean);
const ACTIVE_LOCALES = ONLY_LOCALES.length ? PLUGIN_LOCALES.filter(l => ONLY_LOCALES.includes(l)) : PLUGIN_LOCALES;
const DRY_RUN = process.argv.includes('--dry-run');
const DEEPL_BATCH_SIZE = 50; // DeepL API limit: up to 50 text parameters per request
const DEEPSEEK_BATCH_SIZE = Number(process.env.LABEL_BATCH_SIZE ?? '20');

let cachedDeepSeekConfig: LlmConfig | null = null;

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

function resolveDeepSeekConfig(): LlmConfig {
  if (cachedDeepSeekConfig) return cachedDeepSeekConfig;

  const providerId = process.env.LABEL_LLM_PROVIDER_ID ?? 'deepseek';
  const model = process.env.LABEL_LLM_MODEL ?? 'deepseek-flash';

  let key = process.env.LABEL_LLM_API_KEY ?? '';
  let url = process.env.LABEL_LLM_BASE_URL ?? '';

  if (!key || !url) {
    const dbProvider = fetchProviderFromDb(providerId);
    if (!key && dbProvider?.apiKey) {
      if (dbProvider.apiKey.startsWith(ENCRYPTED_PREFIX)) {
        throw new Error(
          `The ApiKey of provider '${providerId}' is stored encrypted (${ENCRYPTED_PREFIX}… DataProtection ` +
          'blob) and can only be decrypted by the API itself. Pass a plaintext key instead:\n' +
          '  LABEL_LLM_API_KEY=sk-… npx tsx tools/generate-skill-labels.ts',
        );
      }
      key = dbProvider.apiKey;
      console.log(`[generate-skill-labels] Using ApiKey from llm_providers (${providerId})`);
    }
    if (!url && dbProvider?.baseUrl) {
      const trimmed = dbProvider.baseUrl.replace(/\/$/, '');
      url = `${trimmed}/chat/completions`;
    }
  }

  if (!url) url = 'https://api.deepseek.com/v1/chat/completions';
  if (!key) throw new Error('LABEL_LLM_API_KEY not set and no enabled deepseek provider with ApiKey found in llm_providers.');

  cachedDeepSeekConfig = { url, key, model };
  return cachedDeepSeekConfig;
}

function resolveDeepLConfig(): { url: string; key: string } {
  const key = process.env.LABEL_DEEPL_API_KEY ?? '';
  if (!key) throw new Error('LABEL_DEEPL_API_KEY not set.');
  // A DeepL API-Free key always ends in ":fx" and only works against the api-free host.
  const url = key.endsWith(':fx') ? 'https://api-free.deepl.com/v2/translate' : 'https://api.deepl.com/v2/translate';
  return { url, key };
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function callDeepL(texts: string[], targetLang: string): Promise<string[]> {
  const { url, key } = resolveDeepLConfig();
  const body = new URLSearchParams();
  for (const t of texts) body.append('text', t);
  body.append('source_lang', 'DE');
  body.append('target_lang', targetLang);

  const maxAttempts = 4;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `DeepL-Auth-Key ${key}` },
        body: body.toString(),
      });
      if (!res.ok) throw new Error(`DeepL ${res.status}: ${await res.text()}`);
      const data = await res.json() as { translations: { text: string }[] };
      return data.translations.map(t => t.text);
    } catch (e) {
      if (attempt === maxAttempts) throw e;
      const backoff = 1000 * 2 ** (attempt - 1);
      console.warn(`  retry ${attempt}/${maxAttempts} (DeepL batch of ${texts.length}): ${e} — waiting ${backoff}ms`);
      await sleep(backoff);
    }
  }
  return [];
}

function buildDeepSeekPrompt(langName: string, batch: SkillSeed[]): string {
  const blocks = batch.map((s, i) =>
    `${i + 1}) skill_name="${s.name}" | german: "${s.labels?.de ?? ''}" | english: "${s.labels?.en ?? ''}"`,
  ).join('\n');

  return [
    `You author short, user-facing labels for Klacksy, the assistant of Klacks — a workforce scheduling application.`,
    `A label names an action back to the user in a clarification question, like a short menu item (e.g. "Add employee to group").`,
    `For each skill below you get its internal name and its already-authored German and English label.`,
    `Task: for EACH skill, write ONE natural, idiomatic ${langName} label that says the same thing — not a mechanical word-for-word translation, but what a native ${langName} speaker would write for that same menu item.`,
    `Rules: max 80 characters, no underscores, no markdown, no quotes around the text itself, capitalize the way ${langName} normally capitalizes a short label.`,
    `Output STRICT JSON: an object mapping each exact skill_name to ONE label string, e.g. {"skill_name_1": "label text", "skill_name_2": "..."}. Include every skill_name from the list below, in the same spelling.`,
    ``,
    `Skills:`,
    blocks,
  ].join('\n');
}

async function callDeepSeek(langName: string, batch: SkillSeed[]): Promise<Record<string, string>> {
  const { url, key, model } = resolveDeepSeekConfig();
  const prompt = buildDeepSeekPrompt(langName, batch);
  const body = JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' } });

  const maxAttempts = 4;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body,
      });
      if (!res.ok) throw new Error(`DeepSeek ${res.status}`);
      const data = await res.json() as { choices: { message: { content: string } }[] };
      const parsed = JSON.parse(data.choices[0].message.content) as Record<string, unknown>;
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === 'string' && v.trim()) out[k] = v.trim();
      }
      return out;
    } catch (e) {
      if (attempt === maxAttempts) throw e;
      const backoff = 1000 * 2 ** (attempt - 1);
      console.warn(`  retry ${attempt}/${maxAttempts} (DeepSeek batch of ${batch.length}): ${e} — waiting ${backoff}ms`);
      await sleep(backoff);
    }
  }
  return {};
}

function loadCoreSkills(): SkillSeed[] {
  const data = JSON.parse(readFileSync(SEEDS_FILE, 'utf8')) as { skills: SkillSeed[] };
  const withLabel = data.skills.filter(s => s.labels?.de && s.labels.de.trim().length > 0);

  // skill-seeds.json has a small number of duplicate skill names with different versions/definitions.
  // Pack files key labels by skill name, so only one definition per name can ever be covered — keep
  // the highest version per name (same precedent as generate-skill-synonyms.ts).
  const byName = new Map<string, SkillSeed>();
  for (const s of withLabel) {
    const existing = byName.get(s.name);
    if (!existing || (s.version ?? 0) > (existing.version ?? 0)) byName.set(s.name, s);
  }
  const deduped = [...byName.values()];
  if (withLabel.length !== deduped.length) {
    console.warn(`[generate-skill-labels] Deduped ${withLabel.length - deduped.length} duplicate skill name(s) in skill-seeds.json (kept highest version).`);
  }
  return deduped;
}

function loadPack(locale: string): Record<string, string> {
  const file = join(PLUGINS_ROOT, locale, 'skill-labels.json');
  if (!existsSync(file)) return {};
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Error(`Failed to parse existing pack ${file}: ${e}`);
  }
}

function writePack(locale: string, pack: Record<string, string>): void {
  const file = join(PLUGINS_ROOT, locale, 'skill-labels.json');
  mkdirSync(dirname(file), { recursive: true });
  const sorted: Record<string, string> = {};
  for (const key of Object.keys(pack).sort()) sorted[key] = pack[key];
  writeFileSync(file, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function sanitize(label: string): string {
  return label.trim().replace(/^["'“„]+|["'“„]+$/g, '').slice(0, LABEL_MAX_LENGTH);
}

function reportDuplicates(locale: string, pack: Record<string, string>): void {
  const seen = new Map<string, string[]>();
  for (const [name, label] of Object.entries(pack)) {
    const norm = label.trim().toLowerCase();
    seen.set(norm, [...(seen.get(norm) ?? []), name]);
  }
  for (const [label, names] of seen) {
    if (names.length > 1) {
      console.warn(`  ⚠ duplicate label in ${locale}: '${label}' used by ${names.join(', ')} — needs manual review before commit`);
    }
  }
}

interface LocaleResult { locale: string; before: number; after: number; total: number; provider: string; calls: number; errors: number; }

async function processDeepLLocale(locale: string, coreSkills: SkillSeed[]): Promise<LocaleResult> {
  const targetLang = DEEPL_LOCALE_TARGET[locale];
  let pack = loadPack(locale);
  const before = Object.keys(pack).length;
  const missing = coreSkills.filter(s => !(s.name in pack));

  let calls = 0;
  let errors = 0;

  if (missing.length && !DRY_RUN) {
    const batches = chunk(missing, DEEPL_BATCH_SIZE);
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`→ ${locale} (DeepL): batch ${i + 1}/${batches.length} (${batch.length} skills)`);
      try {
        const translations = await callDeepL(batch.map(s => s.labels!.de), targetLang);
        calls++;
        batch.forEach((s, idx) => {
          const t = translations[idx];
          if (t) pack[s.name] = sanitize(t);
        });
      } catch (e) {
        console.error(`  ✗ batch failed ${locale} #${i + 1}: ${e}`);
        errors++;
        continue;
      }
      pack = { ...loadPack(locale), ...pack };
      writePack(locale, pack);
      await sleep(100);
    }
  }

  reportDuplicates(locale, pack);
  return { locale, before, after: Object.keys(pack).length, total: coreSkills.length, provider: 'DeepL', calls, errors };
}

async function processDeepSeekLocale(locale: string, coreSkills: SkillSeed[]): Promise<LocaleResult> {
  const langName = LOCALE_NAMES[locale] ?? locale;
  let pack = loadPack(locale);
  const before = Object.keys(pack).length;
  const missing = coreSkills.filter(s => !(s.name in pack));

  let calls = 0;
  let errors = 0;

  if (missing.length && !DRY_RUN) {
    const batches = chunk(missing, DEEPSEEK_BATCH_SIZE);
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`→ ${locale} (DeepSeek): batch ${i + 1}/${batches.length} (${batch.length} skills)`);
      let result: Record<string, string>;
      try {
        result = await callDeepSeek(langName, batch);
        calls++;
      } catch (e) {
        console.error(`  ✗ batch failed ${locale} #${i + 1}: ${e}`);
        errors++;
        continue;
      }
      for (const skill of batch) {
        const label = result[skill.name];
        if (label) pack[skill.name] = sanitize(label);
        else console.error(`  ✗ missing label ${locale}/${skill.name}`);
      }
      pack = { ...loadPack(locale), ...pack };
      writePack(locale, pack);
      await sleep(150);
    }
  }

  reportDuplicates(locale, pack);
  return { locale, before, after: Object.keys(pack).length, total: coreSkills.length, provider: 'DeepSeek', calls, errors };
}

async function runPool<T>(items: string[], worker: (item: string) => Promise<T>, concurrency: number): Promise<T[]> {
  const results: T[] = [];
  let idx = 0;
  async function next(): Promise<void> {
    while (idx < items.length) {
      const current = idx++;
      results[current] = await worker(items[current]);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => next());
  await Promise.all(workers);
  return results;
}

async function run(): Promise<void> {
  const coreSkills = loadCoreSkills();
  console.log(`[generate-skill-labels] Core skills with a de-label: ${coreSkills.length}`);
  console.log(`[generate-skill-labels] Locales: ${ACTIVE_LOCALES.join(', ')}`);
  if (DRY_RUN) console.log('[generate-skill-labels] DRY RUN — no provider calls, coverage plan only.');

  const deepLLocales = ACTIVE_LOCALES.filter(l => l in DEEPL_LOCALE_TARGET && !FORCE_DEEPSEEK_LOCALES.includes(l));
  const deepSeekLocales = ACTIVE_LOCALES.filter(l => DEEPSEEK_LOCALES.includes(l));

  if (!DRY_RUN) {
    if (deepLLocales.length) resolveDeepLConfig();
    if (deepSeekLocales.length) resolveDeepSeekConfig();
  }

  const results = [
    ...await runPool(deepLLocales, loc => processDeepLLocale(loc, coreSkills), DRY_RUN ? deepLLocales.length : 3),
    ...await runPool(deepSeekLocales, loc => processDeepSeekLocale(loc, coreSkills), DRY_RUN ? deepSeekLocales.length : 3),
  ];

  console.log('\n=== Coverage report ===');
  console.log('locale\tprovider\tbefore\tafter\ttotal\tcalls\terrors');
  let totalCalls = 0, totalErrors = 0;
  for (const r of results) {
    console.log(`${r.locale}\t${r.provider}\t${r.before}\t${r.after}\t${r.total}\t${r.calls}\t${r.errors}`);
    totalCalls += r.calls;
    totalErrors += r.errors;
  }
  console.log(`\nTotal provider calls: ${totalCalls} (errors: ${totalErrors})`);
}

run().catch(e => { console.error(e); process.exit(1); });
