// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Validates generated navigation synonyms per locale via an LLM critic and writes a report of suspect entries.
 * Each plugin target is judged against its concept (English + German core synonyms) for script correctness,
 * topical match, foreign-language bleed and thinness.
 * Env (optional): SYNONYM_LLM_BASE_URL, SYNONYM_LLM_API_KEY, SYNONYM_LLM_MODEL, SYNONYM_LLM_PROVIDER_ID.
 * Falls back to the enabled provider in llm_providers (default: deepseek) when env vars are absent.
 * Filters: VALIDATE_ONLY_LOCALES (comma list), VALIDATE_CHUNK_SIZE (default 10).
 * NOTE: the critic is only as reliable as the model — a weak multilingual model produces many false
 * positives (deepseek over-flagged correct native terms). Point it at a strong multilingual model.
 * The verdict also assumes the concept anchor (core en/de synonyms) is correct; a corrupt anchor yields false positives.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';

interface TargetEntry {
  targetId: string; route: string; labelKey: string; category?: string;
  synonyms: Record<string, string[]>; synonymStatus: string; obsolete?: boolean;
}
interface LlmConfig { url: string; key: string; model: string; }
interface Verdict { targetId: string; verdict: string; issues?: string[]; note?: string; }

const UI_ROOT = resolve(__dirname, '..');
const MANIFEST = resolve(UI_ROOT, '../Klacks.Api/Application/Skills/Definitions/navigation-targets.json');
const PLUGINS_ROOT = resolve(UI_ROOT, '../Klacks.Api/Plugins/Languages');
const REPORT = resolve(UI_ROOT, 'tools/synonym-validation-report.json');
const PLUGIN_LOCALES = ['ar','cs','da','el','es','fi','he','id','ja','ko','ms','nb','nl','pl','pt','ro','sv','th','vi','zh-CN','zh-TW'];
const LOCALE_NAMES: Record<string, string> = {
  ar: 'Arabic', cs: 'Czech', da: 'Danish', el: 'Greek', es: 'Spanish', fi: 'Finnish', he: 'Hebrew',
  id: 'Indonesian', ja: 'Japanese', ko: 'Korean', ms: 'Malay', nb: 'Norwegian Bokmål', nl: 'Dutch',
  pl: 'Polish', pt: 'Portuguese', ro: 'Romanian', sv: 'Swedish', th: 'Thai', vi: 'Vietnamese',
  'zh-CN': 'Simplified Chinese', 'zh-TW': 'Traditional Chinese',
};
const CHUNK_SIZE = Number(process.env.VALIDATE_CHUNK_SIZE ?? '10');
const ONLY_LOCALES = (process.env.VALIDATE_ONLY_LOCALES ?? '').split(',').map(s => s.trim()).filter(Boolean);
const ACTIVE_LOCALES = ONLY_LOCALES.length ? PLUGIN_LOCALES.filter(l => ONLY_LOCALES.includes(l)) : PLUGIN_LOCALES;
const PSQL_PATH = process.env.PSQL_PATH ?? 'C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe';
const DB_HOST = process.env.KLACKS_DB_HOST ?? 'localhost';
const DB_PORT = process.env.KLACKS_DB_PORT ?? '5434';
const DB_USER = process.env.KLACKS_DB_USER ?? 'postgres';
const DB_PASSWORD = process.env.KLACKS_DB_PASSWORD ?? 'admin';
const DB_NAME = process.env.KLACKS_DB_NAME ?? 'klacks';

let cachedConfig: LlmConfig | null = null;

function fetchProviderFromDb(providerId: string): { apiKey: string; baseUrl: string } | null {
  try {
    const sql = `SELECT api_key || '|' || COALESCE(base_url, '') FROM llm_providers WHERE provider_id='${providerId}' AND is_enabled=true AND api_key IS NOT NULL AND LENGTH(api_key) > 0 LIMIT 1`;
    const out = execFileSync(PSQL_PATH, ['-h', DB_HOST, '-p', DB_PORT, '-U', DB_USER, '-d', DB_NAME, '-t', '-A', '-c', sql], {
      encoding: 'utf8', env: { ...process.env, PGPASSWORD: DB_PASSWORD }
    }).trim();
    if (!out) return null;
    const sep = out.indexOf('|');
    return { apiKey: sep === -1 ? out : out.slice(0, sep), baseUrl: sep === -1 ? '' : out.slice(sep + 1) };
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
    if (!key && dbProvider?.apiKey) key = dbProvider.apiKey;
    if (!url && dbProvider?.baseUrl) url = `${dbProvider.baseUrl.replace(/\/$/, '')}/chat/completions`;
  }
  if (!url) url = 'https://api.deepseek.com/v1/chat/completions';
  if (!key) throw new Error('SYNONYM_LLM_API_KEY not set and no enabled provider with ApiKey found in llm_providers.');
  cachedConfig = { url, key, model };
  return cachedConfig;
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function judgeChunk(locale: string, langName: string, targets: TargetEntry[], overlay: Record<string, { synonyms: string[] }>): Promise<Verdict[]> {
  const { url, key, model } = resolveConfig();
  const blocks = targets.map((t, i) => {
    const en = (t.synonyms?.['en'] ?? []).slice(0, 6).join(', ');
    const de = (t.synonyms?.['de'] ?? []).slice(0, 6).join(', ');
    const gen = (overlay[t.targetId]?.synonyms ?? []).join(' | ');
    return `${i + 1}) targetId="${t.targetId}" | concept EN: ${en} | concept DE: ${de}\n   generated ${locale}: ${gen}`;
  }).join('\n');

  const prompt = [
    `You are a strict QA reviewer for in-app navigation search keywords of Klacks (workforce scheduling: shifts, employees, absences, contracts, settings).`,
    `For each target you get its concept (reference phrases in English and German, which together disambiguate the meaning) and the generated ${langName} phrases that should let a native ${langName} speaker navigate to that target.`,
    `Flag a target as "suspect" if ANY of these clearly apply:`,
    `- "offtopic": the phrases are about a different concept than the reference (semantic mismatch or hallucination).`,
    `- "script": phrases are not in the natural native script/orthography of ${langName} (romanization, wrong script, missing diacritics, or single-script-only where unnatural).`,
    `- "bleed": several phrases are in the wrong language (English or German bleed-through) although a native ${langName} term exists.`,
    `- "thin": clearly too few usable phrases (fewer than 8) or mostly duplicates.`,
    `Otherwise verdict "ok". Be conservative: only flag clear problems, established loanwords are fine.`,
    `Respond as STRICT JSON: {"results":[{"targetId":"...","verdict":"ok"|"suspect","issues":["offtopic"],"note":"<=12 words"}]} with one entry per target, same order.`,
    ``,
    `Targets:`,
    blocks,
  ].join('\n');

  const body = JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' } });
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }, body });
      if (!res.ok) throw new Error(`LLM ${res.status}`);
      const data = await res.json() as { choices: { message: { content: string } }[] };
      const parsed = JSON.parse(data.choices[0].message.content);
      const results: Verdict[] = Array.isArray(parsed) ? parsed : (parsed.results ?? []);
      return results;
    } catch (e) {
      if (attempt === maxAttempts) throw e;
      console.warn(`  retry ${attempt}/${maxAttempts} (${locale} chunk): ${e}`);
      await sleep(1000 * attempt);
    }
  }
  return [];
}

async function run(): Promise<void> {
  const manifest: TargetEntry[] = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  const active = manifest.filter(t => !t.obsolete);
  const byLocale: Record<string, { checked: number; suspect: Verdict[] }> = {};
  let totalChecked = 0, totalSuspect = 0, totalErrors = 0;

  for (const locale of ACTIVE_LOCALES) {
    const file = join(PLUGINS_ROOT, locale, 'navigation-targets.json');
    if (!existsSync(file)) { console.warn(`! missing overlay: ${locale}`); continue; }
    const overlay = JSON.parse(readFileSync(file, 'utf8')) as Record<string, { synonyms: string[] }>;
    const present = active.filter(t => t.targetId in overlay);
    const langName = LOCALE_NAMES[locale] ?? locale;
    const suspects: Verdict[] = [];

    for (let i = 0; i < present.length; i += CHUNK_SIZE) {
      const chunk = present.slice(i, i + CHUNK_SIZE);
      console.log(`→ ${locale}: targets ${i + 1}-${i + chunk.length}/${present.length}`);
      let verdicts: Verdict[];
      try {
        verdicts = await judgeChunk(locale, langName, chunk, overlay);
      } catch (e) {
        console.error(`  ✗ chunk failed ${locale} ${i + 1}: ${e}`);
        totalErrors++;
        continue;
      }
      for (const v of verdicts) {
        if (v && v.verdict === 'suspect') suspects.push({ targetId: v.targetId, verdict: 'suspect', issues: v.issues ?? [], note: v.note ?? '' });
      }
      await sleep(200);
    }

    byLocale[locale] = { checked: present.length, suspect: suspects };
    totalChecked += present.length;
    totalSuspect += suspects.length;
    console.log(`  ${locale}: ${suspects.length} suspect / ${present.length} checked`);
  }

  const { model } = resolveConfig();
  const report = { generatedAt: new Date().toISOString(), model, totalChecked, totalSuspect, totalErrors, byLocale };
  writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n', 'utf8');

  console.log(`\n=== Validation report → ${REPORT}`);
  console.log(`Checked ${totalChecked} entries across ${Object.keys(byLocale).length} locales | suspect: ${totalSuspect} | chunk errors: ${totalErrors}\n`);
  for (const [loc, r] of Object.entries(byLocale)) {
    if (!r.suspect.length) continue;
    const ids = r.suspect.map(s => s.targetId).join(',');
    console.log(`${loc} (${r.suspect.length}): ${r.suspect.map(s => `${s.targetId}[${(s.issues ?? []).join('/')}]`).join(', ')}`);
    console.log(`  regen: SYNONYM_ONLY_LOCALES="${loc}" SYNONYM_ONLY_TARGETS="${ids}"`);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
