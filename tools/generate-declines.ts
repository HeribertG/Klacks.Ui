// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Generates decline/refusal phrases ("declines") for plugin languages via LLM and writes them
 * into each language plugin's conversation-signals.json. The backend DeclineDetector matches
 * these entries at the START of a user message, so every phrase must be a natural sentence
 * opener a native speaker uses to decline an assistant offer ("no thanks", "not now").
 * Env (optional): SYNONYM_LLM_BASE_URL, SYNONYM_LLM_API_KEY, SYNONYM_LLM_MODEL, SYNONYM_LLM_PROVIDER_ID.
 * Falls back to the enabled provider in llm_providers (default: deepseek) when env vars are absent.
 * Flags: --force regenerates locales that already have declines; DECLINES_ONLY_LOCALES=es,pl limits locales.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';

interface LlmConfig { url: string; key: string; model: string; }

interface ConversationSignals {
  affirmations?: string[];
  negations?: string[];
  corrections?: string[];
  cancellations?: string[];
  gapIndicators?: string[];
  declines?: string[];
}

const UI_ROOT = resolve(__dirname, '..');
const PLUGINS_ROOT = resolve(UI_ROOT, '../Klacks.Api/Plugins/Languages');
const PLUGIN_LOCALES = ['ar','cs','da','el','es','fi','he','id','ja','ko','ms','nb','nl','pl','pt','ro','sv','th','vi','zh-CN','zh-TW'];
const SIGNALS_FILE_NAME = 'conversation-signals.json';
const PSQL_PATH = process.env.PSQL_PATH ?? 'C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe';
const DB_HOST = process.env.KLACKS_DB_HOST ?? 'localhost';
const DB_PORT = process.env.KLACKS_DB_PORT ?? '5434';
const DB_USER = process.env.KLACKS_DB_USER ?? 'postgres';
const DB_PASSWORD = process.env.KLACKS_DB_PASSWORD ?? 'admin';
const DB_NAME = process.env.KLACKS_DB_NAME ?? 'klacks';

const FORCE = process.argv.includes('--force');
const ONLY_LOCALES = (process.env.DECLINES_ONLY_LOCALES ?? '').split(',').map(s => s.trim()).filter(Boolean);
const ACTIVE_LOCALES = ONLY_LOCALES.length ? PLUGIN_LOCALES.filter(l => ONLY_LOCALES.includes(l)) : PLUGIN_LOCALES;

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
      console.log(`[generate-declines] Using ApiKey from llm_providers (${providerId})`);
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

async function callLlm(locale: string): Promise<string[]> {
  const { url, key, model } = resolveConfig();

  const prompt = [
    'You collect decline/refusal phrases for the chat assistant of Klacks, a workforce scheduling application.',
    'Situation: the assistant just asked the user a follow-up question or made an offer (e.g. "Do you want to know more about a specific section?"). The user answers by DECLINING — they want nothing right now.',
    `Task: write 15 short phrases a native ${locale} speaker would naturally say or type to decline such an offer.`,
    'CRITICAL: the backend matches each phrase at the very START of the user message. Every phrase must therefore be a natural sentence OPENER on its own ("no thanks", "not now", "never mind"), never a phrase that only appears mid-sentence.',
    'Keep each phrase 1 to 4 words. Include the plain one-word "no" of the language, polite variants ("no thank you"), deferrals ("not now", "maybe later"), and dismissals ("never mind", "leave it").',
    `Write every phrase in the natural native script and orthography of ${locale}, lowercase where the script has case, exactly as a native speaker types it. Never output romanized or transliterated text.`,
    'EXCLUDE: pure command verbs like "cancel" or "stop" (those are handled elsewhere), anything that requests an action, question words, and the bot name "klacksy".',
    'Reference for the MEANING only (do not translate literally, honour the natural wording of the language) — German: "nein", "nein danke", "nicht jetzt", "im moment nicht", "lass gut sein" || English: "no", "no thanks", "not now", "maybe later", "never mind".',
    'Output a strict JSON array of strings.',
  ].join(' ');

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
      const parsed = JSON.parse(content);
      const arr: string[] = Array.isArray(parsed) ? parsed : (parsed.declines ?? parsed.phrases ?? []);
      return [...new Set(arr.map(s => String(s).toLowerCase().trim()).filter(Boolean))];
    } catch (e) {
      if (attempt === maxAttempts) throw e;
      console.warn(`  retry ${attempt}/${maxAttempts} (${locale}): ${e}`);
      await sleep(1000 * attempt);
    }
  }
  return [];
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function run(): Promise<void> {
  let processed = 0;
  for (const locale of ACTIVE_LOCALES) {
    const file = join(PLUGINS_ROOT, locale, SIGNALS_FILE_NAME);
    if (!existsSync(file)) {
      console.warn(`✗ ${locale}: no ${SIGNALS_FILE_NAME}, skipped`);
      continue;
    }

    const signals: ConversationSignals = JSON.parse(readFileSync(file, 'utf8'));
    if (!FORCE && (signals.declines?.length ?? 0) > 0) {
      console.log(`= ${locale}: declines already present, skipped (use --force to regenerate)`);
      continue;
    }

    console.log(`→ ${locale}`);
    let declines: string[];
    try {
      declines = await callLlm(locale);
    } catch (e) {
      console.error(`  ✗ skipped ${locale}: ${e}`);
      continue;
    }
    if (!declines.length) {
      console.error(`  ✗ empty result ${locale}, skipped`);
      continue;
    }

    signals.declines = declines;
    writeFileSync(file, JSON.stringify(signals, null, 2) + '\n', 'utf8');
    processed++;
    await sleep(200);
  }
  console.log(`Done. Generated declines for ${processed} locale(s).`);
}

run().catch(e => { console.error(e); process.exit(1); });
