// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Generates missing skill synonyms for the 21 Klacksy plugin language packs via LLM.
 * Source of truth: Application/Skills/Definitions/skill-seeds.json (skills with non-empty
 * core `synonyms` in de/en/fr/it). Target: Plugins/Languages/<locale>/skill-synonyms.json.
 * Existing entries are never overwritten — only missing skill keys are added.
 * Env (optional): SYNONYM_LLM_BASE_URL, SYNONYM_LLM_API_KEY, SYNONYM_LLM_MODEL, SYNONYM_LLM_PROVIDER_ID.
 * Falls back to the enabled provider in llm_providers (default: deepseek) when env vars are absent.
 * CLI: --only-locales=xx,yy restricts to a locale subset, --batch-size=N overrides the
 * default LLM batch size, --dry-run prints the coverage plan without calling the LLM,
 * --top-up appends extra phrases to entries below the minimum phrase count (existing
 * phrases are always kept and never replaced).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';

interface SkillParameter {
  name: string;
  description?: string;
}

interface SkillSeed {
  name: string;
  description: string;
  category?: string;
  parameters?: SkillParameter[];
  synonyms?: Record<string, string[]>;
  version?: number;
}

interface LlmConfig { url: string; key: string; model: string; }

const UI_ROOT = resolve(__dirname, '..');
const SEEDS_FILE = resolve(UI_ROOT, '../Klacks.Api/Application/Skills/Definitions/skill-seeds.json');
const PLUGINS_ROOT = resolve(UI_ROOT, '../Klacks.Api/Plugins/Languages');

const PLUGIN_LOCALES = ['ar', 'cs', 'da', 'el', 'es', 'fi', 'he', 'id', 'ja', 'ko', 'ms', 'nb', 'nl', 'pl', 'pt', 'ro', 'sv', 'th', 'vi', 'zh-CN', 'zh-TW'];
const LOCALE_NAMES: Record<string, string> = {
  ar: 'Arabic', cs: 'Czech', da: 'Danish', el: 'Greek', es: 'Spanish', fi: 'Finnish', he: 'Hebrew',
  id: 'Indonesian', ja: 'Japanese', ko: 'Korean', ms: 'Malay', nb: 'Norwegian Bokmål', nl: 'Dutch',
  pl: 'Polish', pt: 'Portuguese', ro: 'Romanian', sv: 'Swedish', th: 'Thai', vi: 'Vietnamese',
  'zh-CN': 'Simplified Chinese', 'zh-TW': 'Traditional Chinese',
};
// Locales whose script has no reliable word-boundary and where the runtime keyword matcher
// (SkillMatchingEngine.MinMatchLength = 4) drops any candidate shorter than 4 characters.
const MIN_PHRASE_LEN_LOCALES = new Set(['ja', 'ko', 'zh-CN', 'zh-TW', 'th']);
const MIN_PHRASE_LEN = 4;

// Marker SettingsEncryptionService puts in front of DataProtection-encrypted values. Such a value is
// useless outside the API process, so it must never travel to a provider as a credential.
const ENCRYPTED_PREFIX = 'ENC:';

const PSQL_PATH = process.env.PSQL_PATH ?? 'C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe';
const DB_HOST = process.env.KLACKS_DB_HOST ?? 'localhost';
const DB_PORT = process.env.KLACKS_DB_PORT ?? '5434';
const DB_USER = process.env.KLACKS_DB_USER ?? 'postgres';
const DB_PASSWORD = process.env.KLACKS_DB_PASSWORD ?? 'admin';
const DB_NAME = process.env.KLACKS_DB_NAME ?? 'klacks';

const ONLY_LOCALES = (process.argv.find(a => a.startsWith('--only-locales='))?.split('=')[1] ?? process.env.SYNONYM_ONLY_LOCALES ?? '')
  .split(',').map(s => s.trim()).filter(Boolean);
const ACTIVE_LOCALES = ONLY_LOCALES.length ? PLUGIN_LOCALES.filter(l => ONLY_LOCALES.includes(l)) : PLUGIN_LOCALES;
const BATCH_SIZE = Number(process.argv.find(a => a.startsWith('--batch-size='))?.split('=')[1] ?? process.env.SYNONYM_BATCH_SIZE ?? '15');
const CONCURRENCY = Number(process.argv.find(a => a.startsWith('--concurrency='))?.split('=')[1] ?? process.env.SYNONYM_CONCURRENCY ?? '5');
const DRY_RUN = process.argv.includes('--dry-run');
const TOP_UP = process.argv.includes('--top-up');
const MIN_PHRASES = 4;
const MAX_PHRASES = 6;

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
      if (dbProvider.apiKey.startsWith(ENCRYPTED_PREFIX)) {
        throw new Error(
          `The ApiKey of provider '${providerId}' is stored encrypted (${ENCRYPTED_PREFIX}… DataProtection ` +
          'blob) and can only be decrypted by the API itself. Reading it straight from the database and ' +
          'sending it as a bearer token yields HTTP 401 on every request. Pass a plaintext key instead:\n' +
          '  SYNONYM_LLM_API_KEY=sk-… npx tsx tools/generate-skill-synonyms.ts',
        );
      }
      key = dbProvider.apiKey;
      console.log(`[generate-skill-synonyms] Using ApiKey from llm_providers (${providerId})`);
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

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function buildAnchor(skill: SkillSeed): string {
  const de = (skill.synonyms?.['de'] ?? []).slice(0, 6);
  const en = (skill.synonyms?.['en'] ?? []).slice(0, 6);
  const parts: string[] = [];
  if (en.length) parts.push(`EN: ${en.join(', ')}`);
  if (de.length) parts.push(`DE: ${de.join(', ')}`);
  return parts.join(' | ');
}

function buildBatchPrompt(locale: string, langName: string, batch: SkillSeed[], enforceMinLen: boolean): string {
  const blocks = batch.map((s, i) => {
    const params = (s.parameters ?? []).map(p => p.name).join(', ');
    return `${i + 1}) skill_name="${s.name}" | description: ${s.description}${params ? ` | parameters: ${params}` : ''} | reference synonyms: ${buildAnchor(s)}`;
  }).join('\n');

  const lengthRule = enforceMinLen
    ? `Every phrase MUST be at least ${MIN_PHRASE_LEN} characters long (count actual characters of the script, e.g. Han/Kana/Hangul/Thai characters). Never output a single short word alone — prefer natural multi-character/multi-word expressions. This is mandatory because the runtime keyword matcher discards any phrase shorter than ${MIN_PHRASE_LEN} characters.`
    : `Avoid single-letter or otherwise meaningless fragments; every phrase must be a real, usable expression.`;

  return [
    `You generate in-app assistant trigger synonyms for Klacksy, the assistant of Klacks — a workforce scheduling application (shifts, employees, absences, contracts, clients, groups, settings).`,
    `For each skill below you get its internal name, an English description, optionally its parameter names, and reference synonyms in English/German (only to disambiguate the MEANING — never translate them literally).`,
    `Task: for EACH skill, write 4 to 6 phrases a native ${langName} speaker would naturally type or say to trigger this skill/action in a chat assistant.`,
    `Write idiomatic, native ${langName} expressions — NOT word-for-word translations of the reference phrases. Use the natural script and orthography of ${langName} (no romanization/transliteration unless that IS the natural everyday writing for ${langName}).`,
    lengthRule,
    `Rules: lowercase where the script has case, no duplicates within a skill, no markdown, exclude the assistant name "klacksy" and its variants.`,
    `Output STRICT JSON: an object mapping each exact skill_name to an array of phrase strings, e.g. {"skill_name_1": ["phrase a", "phrase b", ...], "skill_name_2": [...]}. Include every skill_name from the list below, in the same spelling.`,
    ``,
    `Skills:`,
    blocks,
  ].join('\n');
}

async function callLlm(locale: string, langName: string, batch: SkillSeed[], enforceMinLen: boolean): Promise<Record<string, string[]>> {
  const { url, key, model } = resolveConfig();
  const prompt = buildBatchPrompt(locale, langName, batch, enforceMinLen);
  const body = JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' } });

  const maxAttempts = 4;
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
      const parsed = JSON.parse(content) as Record<string, unknown>;
      const out: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (!Array.isArray(v)) continue;
        const phrases = [...new Set(v.map(s => String(s).toLowerCase().trim()).filter(Boolean))];
        out[k] = phrases;
      }
      return out;
    } catch (e) {
      if (attempt === maxAttempts) throw e;
      const backoff = 1000 * 2 ** (attempt - 1);
      console.warn(`  retry ${attempt}/${maxAttempts} (${locale} batch of ${batch.length}): ${e} — waiting ${backoff}ms`);
      await sleep(backoff);
    }
  }
  return {};
}

function loadCoreSkills(): SkillSeed[] {
  const data = JSON.parse(readFileSync(SEEDS_FILE, 'utf8')) as { skills: SkillSeed[] };
  const withSynonyms = data.skills.filter(s => s.synonyms && Object.values(s.synonyms).some(arr => Array.isArray(arr) && arr.length > 0));

  // skill-seeds.json has a small number of duplicate skill names with different versions/definitions
  // (e.g. list_scheduling_rules, get_scheduling_defaults). Pack files key phrases by skill name, so
  // only one definition per name can ever be covered — keep the highest version per name.
  const byName = new Map<string, SkillSeed>();
  for (const s of withSynonyms) {
    const existing = byName.get(s.name);
    if (!existing || (s.version ?? 0) > (existing.version ?? 0)) byName.set(s.name, s);
  }
  const deduped = [...byName.values()];
  if (withSynonyms.length !== deduped.length) {
    console.warn(`[generate-skill-synonyms] Deduped ${withSynonyms.length - deduped.length} duplicate skill name(s) in skill-seeds.json (kept highest version).`);
  }
  return deduped;
}

function loadPack(locale: string): Record<string, string[]> {
  const file = join(PLUGINS_ROOT, locale, 'skill-synonyms.json');
  if (!existsSync(file)) return {};
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Error(`Failed to parse existing pack ${file}: ${e}`);
  }
}

function writePack(locale: string, pack: Record<string, string[]>): void {
  const file = join(PLUGINS_ROOT, locale, 'skill-synonyms.json');
  mkdirSync(dirname(file), { recursive: true });
  const sorted: Record<string, string[]> = {};
  for (const key of Object.keys(pack).sort()) sorted[key] = pack[key];
  writeFileSync(file, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

interface LocaleResult { locale: string; before: number; after: number; total: number; calls: number; errors: number; shortfallRetries: number; }

async function processLocale(locale: string, coreSkills: SkillSeed[]): Promise<LocaleResult> {
  const langName = LOCALE_NAMES[locale] ?? locale;
  const enforceMinLen = MIN_PHRASE_LEN_LOCALES.has(locale);
  let pack = loadPack(locale);
  const before = Object.keys(pack).filter(k => coreSkills.some(s => s.name === k)).length;
  const missing = coreSkills.filter(s => !(s.name in pack));

  let calls = 0;
  let errors = 0;
  let shortfallRetries = 0;

  if (missing.length && !DRY_RUN) {
    const batches = chunk(missing, BATCH_SIZE);
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`→ ${locale}: batch ${i + 1}/${batches.length} (${batch.length} skills)`);
      let result: Record<string, string[]>;
      try {
        result = await callLlm(locale, langName, batch, enforceMinLen);
        calls++;
      } catch (e) {
        console.error(`  ✗ batch failed ${locale} #${i + 1}: ${e}`);
        errors++;
        continue;
      }

      const shortfall: SkillSeed[] = [];
      for (const skill of batch) {
        let phrases = result[skill.name] ?? [];
        if (enforceMinLen) {
          phrases = phrases.filter(p => p.length >= MIN_PHRASE_LEN);
        }
        if (phrases.length < 3) {
          shortfall.push(skill);
        } else {
          pack[skill.name] = phrases.slice(0, 6);
        }
      }

      if (shortfall.length) {
        console.warn(`  ↻ shortfall retry ${locale}: ${shortfall.map(s => s.name).join(', ')}`);
        try {
          const retryResult = await callLlm(locale, langName, shortfall, enforceMinLen);
          calls++;
          shortfallRetries++;
          for (const skill of shortfall) {
            let phrases = retryResult[skill.name] ?? [];
            if (enforceMinLen) phrases = phrases.filter(p => p.length >= MIN_PHRASE_LEN);
            if (phrases.length) {
              pack[skill.name] = phrases.slice(0, 6);
            } else {
              console.error(`  ✗ empty result after retry ${locale}/${skill.name}, skipped`);
            }
          }
        } catch (e) {
          console.error(`  ✗ shortfall retry failed ${locale}: ${e}`);
          errors++;
        }
      }

      pack = { ...loadPack(locale), ...pack };
      writePack(locale, pack);
      await sleep(150);
    }
  }

  if (TOP_UP && !DRY_RUN) {
    const thin = coreSkills.filter(s => Array.isArray(pack[s.name]) && pack[s.name].length > 0 && pack[s.name].length < MIN_PHRASES);
    if (thin.length) {
      console.log(`→ ${locale}: top-up for ${thin.length} thin entries`);
      const batches = chunk(thin, BATCH_SIZE);
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        let result: Record<string, string[]>;
        try {
          result = await callLlm(locale, langName, batch, enforceMinLen);
          calls++;
        } catch (e) {
          console.error(`  ✗ top-up batch failed ${locale} #${i + 1}: ${e}`);
          errors++;
          continue;
        }
        for (const skill of batch) {
          let fresh = result[skill.name] ?? [];
          if (enforceMinLen) fresh = fresh.filter(p => p.length >= MIN_PHRASE_LEN);
          const existing = pack[skill.name];
          const merged = [...new Set([...existing, ...fresh])].slice(0, MAX_PHRASES);
          if (merged.length > existing.length) pack[skill.name] = merged;
        }
        pack = { ...loadPack(locale), ...pack };
        writePack(locale, pack);
        await sleep(150);
      }
    }
  }

  const after = Object.keys(pack).filter(k => coreSkills.some(s => s.name === k)).length;
  return { locale, before, after, total: coreSkills.length, calls, errors, shortfallRetries };
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
  console.log(`[generate-skill-synonyms] Core skills with synonyms: ${coreSkills.length}`);
  console.log(`[generate-skill-synonyms] Locales: ${ACTIVE_LOCALES.join(', ')}`);
  if (DRY_RUN) console.log('[generate-skill-synonyms] DRY RUN — no LLM calls, coverage plan only.');

  // Resolve the credential once up front. Without this the same unusable key is discovered inside
  // every batch of every locale, turning one configuration problem into a hundred identical errors.
  if (!DRY_RUN) resolveConfig();

  const results = await runPool(ACTIVE_LOCALES, loc => processLocale(loc, coreSkills), DRY_RUN ? ACTIVE_LOCALES.length : CONCURRENCY);

  console.log('\n=== Coverage report ===');
  console.log('locale\tbefore\tafter\ttotal\tcalls\tretries\terrors');
  let totalCalls = 0, totalErrors = 0, totalRetries = 0;
  for (const r of results) {
    console.log(`${r.locale}\t${r.before}\t${r.after}\t${r.total}\t${r.calls}\t${r.shortfallRetries}\t${r.errors}`);
    totalCalls += r.calls;
    totalErrors += r.errors;
    totalRetries += r.shortfallRetries;
  }
  console.log(`\nTotal LLM calls: ${totalCalls} (shortfall retries: ${totalRetries}, batch errors: ${totalErrors})`);
}

run().catch(e => { console.error(e); process.exit(1); });
