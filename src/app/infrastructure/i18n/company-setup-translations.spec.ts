// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Guards the texts of the first-run page "Country and industry": every core language carries every text, none of
 * them is empty or left in English outside the English file.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const CORE_LANGUAGES = ['de', 'en', 'fr', 'it'] as const;
const SOURCE_LANGUAGE = 'en';
const I18N_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../assets/i18n');
const KEYS = [
  'companySetup.header',
  'companySetup.intro',
  'companySetup.country',
  'companySetup.countryHint',
  'companySetup.noCountry',
  'companySetup.assistantHint',
  'companySetup.continue',
];

const load = (language: string): Record<string, string> =>
  JSON.parse(readFileSync(resolve(I18N_DIR, `${language}.json`), 'utf8'));

describe('company setup translations', () => {
  const english = load(SOURCE_LANGUAGE);

  it.each(CORE_LANGUAGES)('%s carries every text of the country and industry page', (language) => {
    const catalogue = load(language);

    const missing = KEYS.filter((key) => !(catalogue[key] ?? '').trim());
    expect(missing).toEqual([]);
  });

  it.each(CORE_LANGUAGES.filter((language) => language !== SOURCE_LANGUAGE))(
    '%s does not fall back to the English text',
    (language) => {
      const catalogue = load(language);

      const untranslated = KEYS.filter((key) => catalogue[key] === english[key]);
      expect(untranslated).toEqual([]);
    }
  );
});
