// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Guards the local speech recognition texts (STT dropdown entry, inline block, plugin card, unsupported-language
 * hint): every key the code uses exists, non-empty, in all four core languages, the translated languages differ
 * from English, the name/engine placeholders survive, no directional arrow breaks right-to-left layouts, and the core
 * languages carry the same key set.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const CORE_LANGUAGES = ['de', 'en', 'fr', 'it'] as const;
const TRANSLATED_LANGUAGES = ['de', 'fr', 'it'] as const;
const REFERENCE_LANGUAGE = 'en';
const KEY_PREFIXES = ['setting.speech.whisper-plugin.', 'setting.speech.local-stt.', 'setting.speech.stt-local-'];
const ENGINE_PLACEHOLDER = '{{engine}}';
const ENGINE_NAME_PLACEHOLDER = '{{name}}';
const ENGINE_PLACEHOLDER_KEYS: readonly string[] = [
  'setting.speech.stt-local-installed',
  'setting.speech.stt-local-not-installed',
  'setting.speech.local-stt.install-engine',
];
const ENGINE_NAME_PLACEHOLDER_KEYS: readonly string[] = [
  'setting.speech.whisper-plugin.model-parakeet',
  'setting.speech.whisper-plugin.model-small',
  'setting.speech.whisper-plugin.model-large',
];
const ARROWS_FIRST_CODE_POINT = 0x2190;
const ARROWS_LAST_CODE_POINT = 0x21ff;

const hasDirectionalArrow = (text: string): boolean =>
  Array.from(text).some((char) => {
    const codePoint = char.codePointAt(0)!;
    return codePoint >= ARROWS_FIRST_CODE_POINT && codePoint <= ARROWS_LAST_CODE_POINT;
  });
const SAME_IN_EVERY_LANGUAGE_KEYS: readonly string[] = ['setting.speech.whisper-plugin.model-small'];
const I18N_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../assets/i18n');

const NEW_OR_CHANGED_KEYS: readonly string[] = [
  'setting.speech.whisper-plugin.headline',
  'setting.speech.whisper-plugin.description',
  'setting.speech.whisper-plugin.other-operation-active',
  'setting.speech.whisper-plugin.model-parakeet',
  'setting.speech.whisper-plugin.model-parakeet-hint',
  'setting.speech.whisper-plugin.model-small',
  'setting.speech.whisper-plugin.model-large',
  'setting.speech.whisper-plugin.attribution',
  'setting.speech.whisper-plugin.status-unavailable',
  'setting.speech.whisper-plugin.status-retry',
  'setting.speech.stt-local-not-installed',
  'setting.speech.stt-local-installed',
  'setting.speech.local-stt.languages',
  'setting.speech.local-stt.requirements',
  'setting.speech.local-stt.license',
  'setting.speech.local-stt.install-parakeet',
  'setting.speech.local-stt.install-engine',
  'setting.speech.local-stt.retry',
  'setting.speech.local-stt.more-options',
  'setting.speech.local-stt.switch-to-parakeet',
  'settings.whisperPlugin',
  'klacksy.voice.errors.stt-unsupported-language',
];

const load = (language: string): Record<string, string> =>
  JSON.parse(readFileSync(resolve(I18N_DIR, `${language}.json`), 'utf8'));

const localSttKeysOf = (translations: Record<string, string>): string[] =>
  Object.keys(translations)
    .filter((key) => KEY_PREFIXES.some((prefix) => key.startsWith(prefix)))
    .sort();

describe('local speech recognition translations', () => {
  const byLanguage = new Map(CORE_LANGUAGES.map((language) => [language, load(language)]));

  it.each(CORE_LANGUAGES)('translates every local speech recognition key used in code in %s', (language) => {
    const translations = byLanguage.get(language)!;

    NEW_OR_CHANGED_KEYS.forEach((key) => {
      expect(translations[key]?.trim(), `${language}: ${key}`).toBeTruthy();
    });
  });

  it.each(CORE_LANGUAGES)('has the same local speech recognition keys in %s as in English', (language) => {
    expect(localSttKeysOf(byLanguage.get(language)!)).toEqual(localSttKeysOf(byLanguage.get(REFERENCE_LANGUAGE)!));
  });

  it.each(TRANSLATED_LANGUAGES)('does not leave English texts in %s', (language) => {
    const translations = byLanguage.get(language)!;
    const english = byLanguage.get(REFERENCE_LANGUAGE)!;

    NEW_OR_CHANGED_KEYS.filter((key) => !SAME_IN_EVERY_LANGUAGE_KEYS.includes(key)).forEach((key) => {
      expect(translations[key], `${language}: ${key}`).not.toBe(english[key]);
    });
  });

  it.each(CORE_LANGUAGES)('keeps the engine placeholder of the dropdown entries in %s', (language) => {
    ENGINE_PLACEHOLDER_KEYS.forEach((key) => {
      expect(byLanguage.get(language)![key], `${language}: ${key}`).toContain(ENGINE_PLACEHOLDER);
    });
  });

  it.each(CORE_LANGUAGES)('keeps the engine name placeholder of the card model labels in %s', (language) => {
    ENGINE_NAME_PLACEHOLDER_KEYS.forEach((key) => {
      expect(byLanguage.get(language)![key], `${language}: ${key}`).toContain(ENGINE_NAME_PLACEHOLDER);
    });
  });

  it.each(CORE_LANGUAGES)('uses no directional arrows in the local speech recognition texts in %s', (language) => {
    const translations = byLanguage.get(language)!;
    NEW_OR_CHANGED_KEYS.forEach((key) => {
      expect(hasDirectionalArrow(translations[key]), `${language}: ${key}`).toBe(false);
    });
  });

  it('names the label for Klacksy navigation like the card headline', () => {
    CORE_LANGUAGES.forEach((language) => {
      const translations = byLanguage.get(language)!;
      expect(translations['settings.whisperPlugin'], language).toBe(translations['setting.speech.whisper-plugin.headline']);
    });
  });
});
