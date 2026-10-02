// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Guards the messages shown when the backend refuses a work booking: every core language must carry
 * every message with the same interpolation placeholders as English, otherwise a user would read a
 * raw translation key or a sentence with a missing employee, qualification or shift name.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { WORK_CONFLICT } from 'src/app/domain/constants/work-conflict.constants';

const CORE_LANGUAGES = ['de', 'en', 'fr', 'it'] as const;
const I18N_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../assets/i18n');
const PLACEHOLDER = /\{\{\w+\}\}/g;
const MESSAGE_KEYS = Object.values(WORK_CONFLICT.MESSAGE_KEYS);

const load = (language: string): Record<string, string> =>
  JSON.parse(readFileSync(resolve(I18N_DIR, `${language}.json`), 'utf8'));

const placeholders = (text: string): string[] => (text.match(PLACEHOLDER) ?? []).sort();

describe('work conflict translations', () => {
  describe.each(CORE_LANGUAGES)('%s', (language) => {
    it.each(MESSAGE_KEYS)('translates %s', (key) => {
      const translations = load(language);

      expect(translations[key], key).toBeTruthy();
      expect(translations[key], key).not.toBe(key);
    });

    it.each(MESSAGE_KEYS)('keeps the placeholders of English in %s', (key) => {
      expect(placeholders(load(language)[key]), key).toEqual(placeholders(load('en')[key]));
    });
  });
});
