// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Guards the database engine upgrade texts of the Software Updates card: every key exists in each core language,
 * only the texts that name the target version interpolate the major, and no core language merely repeats English.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import {
  ENGINE_UPGRADE_KEYS,
  ENGINE_UPGRADE_MAJOR_PARAM,
  ENGINE_UPGRADE_REASON_KEYS,
} from 'src/app/domain/constants/engine-upgrade.constants';

const CORE_LANGUAGES = ['de', 'en', 'fr', 'it'] as const;
const NON_ENGLISH_CORE_LANGUAGES = ['de', 'fr', 'it'] as const;
const I18N_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../assets/i18n');
const ENGINE_KEYS: readonly string[] = [...Object.values(ENGINE_UPGRADE_KEYS), ...Object.values(ENGINE_UPGRADE_REASON_KEYS)];
const SHARED_KEYS: readonly string[] = [ENGINE_UPGRADE_KEYS.CANCEL, ENGINE_UPGRADE_KEYS.UP_TO_DATE];
const MAJOR_KEYS: readonly string[] = [
  ENGINE_UPGRADE_KEYS.BUTTON,
  ENGINE_UPGRADE_KEYS.CONFIRM_TITLE,
  ENGINE_UPGRADE_KEYS.CONFIRM_MESSAGE,
];
const MAJOR_PLACEHOLDER = `{{${ENGINE_UPGRADE_MAJOR_PARAM}}}`;

const load = (language: string): Record<string, string> =>
  JSON.parse(readFileSync(resolve(I18N_DIR, `${language}.json`), 'utf8'));

describe('engine upgrade translations', () => {
  const byLanguage = new Map(CORE_LANGUAGES.map((language) => [language, load(language)]));

  it.each(CORE_LANGUAGES)('translates every engine upgrade key in %s', (language) => {
    const translations = byLanguage.get(language)!;

    ENGINE_KEYS.forEach((key) => {
      expect(translations[key], `${language}: ${key}`).toBeTruthy();
      expect(translations[key], `${language}: ${key}`).not.toBe(key);
    });
  });

  it.each(CORE_LANGUAGES)('interpolates the target major only where the version is named in %s', (language) => {
    const translations = byLanguage.get(language)!;

    ENGINE_KEYS.filter((key) => !SHARED_KEYS.includes(key)).forEach((key) => {
      expect(translations[key]?.includes(MAJOR_PLACEHOLDER), `${language}: ${key}`).toBe(MAJOR_KEYS.includes(key));
    });
  });

  it.each(NON_ENGLISH_CORE_LANGUAGES)('does not fall back to the English text in %s', (language) => {
    const english = byLanguage.get('en')!;
    const translations = byLanguage.get(language)!;

    ENGINE_KEYS.filter((key) => !SHARED_KEYS.includes(key)).forEach((key) => {
      expect(translations[key], `${language}: ${key}`).not.toBe(english[key]);
    });
  });
});
