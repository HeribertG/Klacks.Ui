// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Guards the reload toast translations: the countdown and standing toasts render purely from these
 * keys, so a key missing in one core language would show a raw key or another language instead of the
 * user's own. Also asserts that only the countdown texts interpolate the remaining seconds and that no
 * core language merely repeats the English text.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { APP_RELOAD_TOAST } from 'src/app/presentation/services/app-reload-toast.constants';

const CORE_LANGUAGES = ['de', 'en', 'fr', 'it'] as const;
const NON_ENGLISH_CORE_LANGUAGES = ['de', 'fr', 'it'] as const;
const I18N_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../assets/i18n');
const RELOAD_KEYS: readonly string[] = Object.values(APP_RELOAD_TOAST.KEYS);
const COUNTDOWN_KEYS: readonly string[] = [
  APP_RELOAD_TOAST.KEYS.UPDATE_COUNTDOWN,
  APP_RELOAD_TOAST.KEYS.RECONNECTED_COUNTDOWN,
];
const SECONDS_PLACEHOLDER = `{{${APP_RELOAD_TOAST.SECONDS_PARAM}}}`;

const load = (language: string): Record<string, string> =>
  JSON.parse(readFileSync(resolve(I18N_DIR, `${language}.json`), 'utf8'));

describe('app reload translations', () => {
  const byLanguage = new Map(CORE_LANGUAGES.map((language) => [language, load(language)]));

  it.each(CORE_LANGUAGES)('translates every reload toast key in %s', (language) => {
    const translations = byLanguage.get(language)!;

    RELOAD_KEYS.forEach((key) => {
      expect(translations[key], `${language}: ${key}`).toBeTruthy();
      expect(translations[key], `${language}: ${key}`).not.toBe(key);
    });
  });

  it.each(CORE_LANGUAGES)('interpolates the remaining seconds only in the countdown texts in %s', (language) => {
    const translations = byLanguage.get(language)!;

    RELOAD_KEYS.forEach((key) => {
      expect(translations[key]?.includes(SECONDS_PLACEHOLDER), `${language}: ${key}`).toBe(
        COUNTDOWN_KEYS.includes(key),
      );
    });
  });

  it.each(NON_ENGLISH_CORE_LANGUAGES)('does not fall back to the English text in %s', (language) => {
    const english = byLanguage.get('en')!;
    const translations = byLanguage.get(language)!;

    RELOAD_KEYS.forEach((key) => {
      expect(translations[key], `${language}: ${key}`).not.toBe(english[key]);
    });
  });
});
