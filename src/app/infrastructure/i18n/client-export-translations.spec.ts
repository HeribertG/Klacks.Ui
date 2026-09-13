// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Guards the client list CSV export captions: the file has no other source for its column headers,
 * so a key missing in one core language would ship a raw translation key inside the export.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { CLIENT_EXPORT_COLUMN_KEYS } from 'src/app/domain/constants/client-export.constants';

const CORE_LANGUAGES = ['de', 'en', 'fr', 'it'] as const;
const I18N_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../assets/i18n');

const load = (language: string): Record<string, string> =>
  JSON.parse(readFileSync(resolve(I18N_DIR, `${language}.json`), 'utf8'));

describe('client export translations', () => {
  it.each(CORE_LANGUAGES)('translates every export column key in %s', (language) => {
    const translations = load(language);

    CLIENT_EXPORT_COLUMN_KEYS.forEach((key) => {
      expect(translations[key], `${language}: ${key}`).toBeTruthy();
      expect(translations[key], `${language}: ${key}`).not.toBe(key);
    });
  });
});
