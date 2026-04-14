// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Generates synonyms for pending navigation targets via LLM.
 * Env: SYNONYM_LLM_BASE_URL, SYNONYM_LLM_API_KEY, SYNONYM_LLM_MODEL (default deepseek-chat).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';

interface TargetEntry {
  targetId: string; route: string; labelKey: string; category?: string;
  synonyms: Record<string, string[]>; synonymStatus: string;
}

const UI_ROOT = resolve(__dirname, '..');
const MANIFEST = resolve(UI_ROOT, '../Klacks.Api/Application/Skills/Definitions/navigation-targets.json');
const PLUGINS_ROOT = resolve(UI_ROOT, '../Klacks.Api/Plugins/Languages');
const CORE_LOCALES = ['de', 'en', 'fr', 'it'];
const PLUGIN_LOCALES = ['ar','cs','da','el','es','fi','he','id','ja','ko','ms','nb','nl','pl','pt','ro','sv','th','vi','zh-CN','zh-TW'];

async function callLlm(target: TargetEntry, locale: string, label: string): Promise<string[]> {
  const url = process.env.SYNONYM_LLM_BASE_URL ?? 'https://api.deepseek.com/chat/completions';
  const key = process.env.SYNONYM_LLM_API_KEY;
  const model = process.env.SYNONYM_LLM_MODEL ?? 'deepseek-chat';
  if (!key) throw new Error('SYNONYM_LLM_API_KEY not set');

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

async function run(): Promise<void> {
  const manifest: TargetEntry[] = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  for (const t of manifest) {
    if (t.synonymStatus !== 'pending') continue;
    const label = t.labelKey.split('.').pop() ?? t.targetId;
    for (const loc of CORE_LOCALES) {
      console.log(`→ ${t.targetId} / ${loc}`);
      t.synonyms[loc] = await callLlm(t, loc, label);
      await sleep(200);
    }
    t.synonymStatus = 'generated';
    for (const loc of PLUGIN_LOCALES) {
      console.log(`→ ${t.targetId} / ${loc} (plugin)`);
      const synonyms = await callLlm(t, loc, label);
      await sleep(200);
      const file = join(PLUGINS_ROOT, loc, 'navigation-targets.json');
      mkdirSync(dirname(file), { recursive: true });
      const overlay = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
      overlay[t.targetId] = { synonyms, status: 'generated' };
      writeFileSync(file, JSON.stringify(overlay, null, 2) + '\n', 'utf8');
    }
  }
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log('Done.');
}

run().catch(e => { console.error(e); process.exit(1); });
