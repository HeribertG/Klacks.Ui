// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Guards the commercial license notice on the imprint and login pages: every core language translates
 * both keys in its own language instead of repeating the English text.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const CORE_LANGUAGES = ['de', 'en', 'fr', 'it'] as const;
const NON_ENGLISH_CORE_LANGUAGES = ['de', 'fr', 'it'] as const;
const I18N_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../assets/i18n');
const COMMERCIAL_LICENSE_KEYS = ['legal.license.commercial-text', 'legal.commercial-license-link'] as const;

const load = (language: string): Record<string, string> =>
  JSON.parse(readFileSync(resolve(I18N_DIR, `${language}.json`), 'utf8'));

describe('commercial license translations', () => {
  const byLanguage = new Map(CORE_LANGUAGES.map((language) => [language, load(language)]));

  it.each(CORE_LANGUAGES)('translates every commercial license key in %s', (language) => {
    const translations = byLanguage.get(language)!;

    COMMERCIAL_LICENSE_KEYS.forEach((key) => {
      expect(translations[key], `${language}: ${key}`).toBeTruthy();
    });
  });

  it.each(NON_ENGLISH_CORE_LANGUAGES)('does not fall back to the English text in %s', (language) => {
    const english = byLanguage.get('en')!;
    const translations = byLanguage.get(language)!;

    COMMERCIAL_LICENSE_KEYS.forEach((key) => {
      expect(translations[key], `${language}: ${key}`).not.toBe(english[key]);
    });
  });
});
