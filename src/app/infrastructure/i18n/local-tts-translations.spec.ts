// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Guards the texts of the local voice (provider option, install card, licence dialog, voice names, computer-generated
 * label and pseudonymisation hint): every key exists in each core language, the placeholders are kept, and no other
 * core language merely repeats English.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { LOCAL_TTS_KEYS } from 'src/app/domain/constants/local-tts.constants';

const CORE_LANGUAGES = ['de', 'en', 'fr', 'it'] as const;
const NON_ENGLISH_CORE_LANGUAGES = ['de', 'fr', 'it'] as const;
const I18N_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../assets/i18n');
const KEYS: readonly string[] = Object.values(LOCAL_TTS_KEYS);
const PLACEHOLDERS: Readonly<Record<string, string>> = {
  [LOCAL_TTS_KEYS.DESCRIPTION]: '{{size}}',
  [LOCAL_TTS_KEYS.LAST_ERROR]: '{{error}}',
  [LOCAL_TTS_KEYS.VOICE_FEMALE]: '{{number}}',
  [LOCAL_TTS_KEYS.VOICE_MALE]: '{{number}}',
};

const load = (language: string): Record<string, string> =>
  JSON.parse(readFileSync(resolve(I18N_DIR, `${language}.json`), 'utf8'));

describe('local voice translations', () => {
  const byLanguage = new Map(CORE_LANGUAGES.map((language) => [language, load(language)]));

  it.each(CORE_LANGUAGES)('translates every local voice key in %s', (language) => {
    const translations = byLanguage.get(language)!;

    KEYS.forEach((key) => {
      expect(translations[key], `${language}: ${key}`).toBeTruthy();
      expect(translations[key], `${language}: ${key}`).not.toBe(key);
    });
  });

  it.each(CORE_LANGUAGES)('keeps the placeholders in %s', (language) => {
    const translations = byLanguage.get(language)!;

    Object.entries(PLACEHOLDERS).forEach(([key, placeholder]) => {
      expect(translations[key]?.includes(placeholder), `${language}: ${key}`).toBe(true);
    });
  });

  it.each(NON_ENGLISH_CORE_LANGUAGES)('does not fall back to the English text in %s', (language) => {
    const english = byLanguage.get('en')!;
    const translations = byLanguage.get(language)!;

    KEYS.forEach((key) => {
      expect(translations[key], `${language}: ${key}`).not.toBe(english[key]);
    });
  });
});
