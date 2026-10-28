// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Guards the playground texts (token-limit message, separate privacy passage, chat notice and prompt-limit texts): all keys exist, non-empty, in all
 * four core languages, the translated languages differ from English, and the passage stays a separate key so the
 * general privacy text is untouched. The other language packs fall back to English by design.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import {
  PLAYGROUND_CHAT_NOTICE_I18N_KEY,
  PLAYGROUND_FEATURE_BLOCKED_I18N_KEY,
  PLAYGROUND_PROMPT_REJECTED_I18N_KEY,
  PLAYGROUND_CHAT_NOTICE_SHORT_I18N_KEY,
  PLAYGROUND_NOTICE_ACKNOWLEDGE_I18N_KEY,
  PLAYGROUND_NOTICE_LINK_I18N_KEY,
  PLAYGROUND_NOTICE_REQUIRED_I18N_KEY,
  PLAYGROUND_PROMPT_TOO_LONG_I18N_KEY,
  PLAYGROUND_TOKEN_LIMIT_I18N_KEY,
  PLAYGROUND_VOICE_TOO_LONG_I18N_KEY,
} from 'src/app/domain/constants/playground.constants';

const CORE_LANGUAGES = ['de', 'en', 'fr', 'it'] as const;
const TRANSLATED_LANGUAGES = ['de', 'fr', 'it'] as const;
const REFERENCE_LANGUAGE = 'en';
const PRIVACY_PASSAGE_KEY = 'legal.privacy.playground';
const PRIVACY_GENERAL_KEY = 'legal.privacy.content';
const KEYS: readonly string[] = [
  PLAYGROUND_TOKEN_LIMIT_I18N_KEY,
  PRIVACY_PASSAGE_KEY,
  PLAYGROUND_CHAT_NOTICE_I18N_KEY,
  PLAYGROUND_CHAT_NOTICE_SHORT_I18N_KEY,
  PLAYGROUND_NOTICE_LINK_I18N_KEY,
  PLAYGROUND_NOTICE_ACKNOWLEDGE_I18N_KEY,
  PLAYGROUND_NOTICE_REQUIRED_I18N_KEY,
  PLAYGROUND_PROMPT_TOO_LONG_I18N_KEY,
  PLAYGROUND_VOICE_TOO_LONG_I18N_KEY,
  PLAYGROUND_FEATURE_BLOCKED_I18N_KEY,
  PLAYGROUND_PROMPT_REJECTED_I18N_KEY,
];
const MAX_PLACEHOLDER = '{{max}}';
const PROVIDER_NAMES = ['DeepSeek', 'Groq'] as const;
const I18N_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../assets/i18n');

const load = (language: string): Record<string, string> =>
  JSON.parse(readFileSync(resolve(I18N_DIR, `${language}.json`), 'utf-8')) as Record<string, string>;

describe('playground translations', () => {
  const byLanguage = Object.fromEntries(CORE_LANGUAGES.map((language) => [language, load(language)]));

  it.each(CORE_LANGUAGES)('%s defines every playground key with a non-empty text', (language) => {
    for (const key of KEYS) {
      expect(byLanguage[language][key]?.trim(), `${language}: ${key}`).toBeTruthy();
    }
  });

  it.each(TRANSLATED_LANGUAGES)('%s texts are translated, not copied from English', (language) => {
    for (const key of KEYS) {
      expect(byLanguage[language][key], `${language}: ${key}`).not.toBe(byLanguage[REFERENCE_LANGUAGE][key]);
    }
  });

  it.each(CORE_LANGUAGES)('%s prompt-limit text carries the max placeholder and the notice names both AI providers', (language) => {
    expect(byLanguage[language][PLAYGROUND_PROMPT_TOO_LONG_I18N_KEY]).toContain(MAX_PLACEHOLDER);
    for (const provider of PROVIDER_NAMES) {
      expect(byLanguage[language][PLAYGROUND_CHAT_NOTICE_I18N_KEY]).toContain(provider);
    }
  });

  it.each(CORE_LANGUAGES)('%s keeps the playground passage out of the general privacy text', (language) => {
    expect(byLanguage[language][PRIVACY_PASSAGE_KEY]).not.toBe(byLanguage[language][PRIVACY_GENERAL_KEY]);
    expect(byLanguage[language][PRIVACY_GENERAL_KEY]).not.toContain(byLanguage[language][PRIVACY_PASSAGE_KEY]);
  });
});
