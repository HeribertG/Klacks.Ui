// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Guards the texts of the scenario banner and the accept/reject confirmations: a key missing in one core
 * language would show a raw key in the banner or in the confirmation of an action that replaces the real
 * schedule. The confirmations must name the scenario, so they have to interpolate its name.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const CORE_LANGUAGES = ['de', 'en', 'fr', 'it'] as const;
const NON_ENGLISH_CORE_LANGUAGES = ['de', 'fr', 'it'] as const;
const I18N_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../assets/i18n');
const NAME_PLACEHOLDER = '{{name}}';
const CONFIRM_KEYS = ['scenario.accept.confirm', 'scenario.reject.confirm'] as const;
const SCENARIO_KEYS = [
  ...CONFIRM_KEYS,
  'scenario.banner.hint',
  'scenario.notActive',
  'scenario.accept',
  'scenario.reject',
  'scenario.exit',
] as const;

const load = (language: string): Record<string, string> =>
  JSON.parse(readFileSync(resolve(I18N_DIR, `${language}.json`), 'utf8'));

describe('scenario decision translations', () => {
  const byLanguage = new Map(CORE_LANGUAGES.map((language) => [language, load(language)]));

  it.each(CORE_LANGUAGES)('translates every banner and confirmation key in %s', (language) => {
    const translations = byLanguage.get(language)!;

    [...SCENARIO_KEYS, 'scenario.banner.label'].forEach((key) => {
      expect(translations[key], `${language}: ${key}`).toBeTruthy();
    });
  });

  it.each(CORE_LANGUAGES)('names the scenario in both confirmations in %s', (language) => {
    const translations = byLanguage.get(language)!;

    CONFIRM_KEYS.forEach((key) => {
      expect(translations[key], `${language}: ${key}`).toContain(NAME_PLACEHOLDER);
    });
  });

  it.each(NON_ENGLISH_CORE_LANGUAGES)('does not fall back to the English text in %s', (language) => {
    const english = byLanguage.get('en')!;
    const translations = byLanguage.get(language)!;

    SCENARIO_KEYS.forEach((key) => {
      expect(translations[key], `${language}: ${key}`).not.toBe(english[key]);
    });
  });
});
