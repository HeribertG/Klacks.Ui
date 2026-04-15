// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Generates synonyms for pending navigation targets via LLM.
 * Env (optional): SYNONYM_LLM_BASE_URL, SYNONYM_LLM_API_KEY, SYNONYM_LLM_MODEL, SYNONYM_LLM_PROVIDER_ID.
 * Falls back to the enabled provider in llm_providers (default: deepseek) when env vars are absent.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';

interface TargetEntry {
  targetId: string; route: string; labelKey: string; category?: string;
  synonyms: Record<string, string[]>; synonymStatus: string;
}

interface LlmConfig { url: string; key: string; model: string; }

const UI_ROOT = resolve(__dirname, '..');
const MANIFEST = resolve(UI_ROOT, '../Klacks.Api/Application/Skills/Definitions/navigation-targets.json');
const PLUGINS_ROOT = resolve(UI_ROOT, '../Klacks.Api/Plugins/Languages');
const CORE_LOCALES = ['de', 'en', 'fr', 'it'];
const PLUGIN_LOCALES = ['ar','cs','da','el','es','fi','he','id','ja','ko','ms','nb','nl','pl','pt','ro','sv','th','vi','zh-CN','zh-TW'];
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

async function callLlm(target: TargetEntry, locale: string, label: string): Promise<string[]> {
  const { url, key, model } = resolveConfig();

  const prompt = `You generate in-app navigation synonyms. Target: "${label}". Category: "${target.category ?? ''}". App: Klacks (workforce scheduling). Language: ${locale}. Generate 20 natural user phrases, lowercase, no duplicates, EXCLUDE the bot name "klacksy" and its variants. Output strict JSON array of strings.`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' } })
  });
  if (!res.ok) throw new Error(`LLM ${res.status}`);
  const data = await res.json() as { choices: { message: { content: string } }[] };
  const content = data.choices[0].message.content;
  const parsed = JSON.parse(content);
  const arr: string[] = Array.isArray(parsed) ? parsed : (parsed.synonyms ?? parsed.phrases ?? []);
  return [...new Set(arr.map(s => String(s).toLowerCase().trim()).filter(Boolean))];
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

const SKIP_PLUGINS = process.env.SYNONYM_SKIP_PLUGINS === '1' || process.argv.includes('--core-only');
const PLUGINS_ONLY = process.env.SYNONYM_PLUGINS_ONLY === '1' || process.argv.includes('--plugins-only');

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

async function generatePluginsForTarget(t: TargetEntry, label: string, force: boolean): Promise<number> {
  let calls = 0;
  for (const loc of PLUGIN_LOCALES) {
    if (!force && pluginOverlayHasTarget(loc, t.targetId)) continue;
    console.log(`→ ${t.targetId} / ${loc} (plugin)`);
    const synonyms = await callLlm(t, loc, label);
    await sleep(200);
    const file = join(PLUGINS_ROOT, loc, 'navigation-targets.json');
    mkdirSync(dirname(file), { recursive: true });
    const overlay = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
    overlay[t.targetId] = { synonyms, status: 'generated' };
    writeFileSync(file, JSON.stringify(overlay, null, 2) + '\n', 'utf8');
    calls++;
  }
  return calls;
}

async function run(): Promise<void> {
  const manifest: TargetEntry[] = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  if (SKIP_PLUGINS) console.log('[generate-synonyms] Core-only mode (plugin locales skipped)');
  if (PLUGINS_ONLY) console.log('[generate-synonyms] Plugins-only mode (only missing plugin overlays)');

  let processed = 0;
  for (const t of manifest) {
    const label = t.labelKey.split('.').pop() ?? t.targetId;

    if (PLUGINS_ONLY) {
      const calls = await generatePluginsForTarget(t, label, false);
      if (calls > 0) processed++;
    } else {
      if (t.synonymStatus !== 'pending') continue;
      for (const loc of CORE_LOCALES) {
        console.log(`→ ${t.targetId} / ${loc}`);
        t.synonyms[loc] = await callLlm(t, loc, label);
        await sleep(200);
      }
      t.synonymStatus = 'generated';
      if (!SKIP_PLUGINS) {
        await generatePluginsForTarget(t, label, true);
      }
      processed++;
    }

    if (processed > 0 && processed % 5 === 0) {
      writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
      console.log(`[generate-synonyms] Manifest checkpoint after ${processed} targets.`);
    }
  }
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`Done. Processed ${processed} targets.`);
}

run().catch(e => { console.error(e); process.exit(1); });
