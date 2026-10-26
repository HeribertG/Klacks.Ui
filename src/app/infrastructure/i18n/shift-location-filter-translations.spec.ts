// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Guards the shift list filter labels (location texts and the validity checkboxes): every core language must
 * define each key and the non-English languages must not merely repeat the English text. The country and canton
 * dropdowns reuse the client filter keys, so no dedicated keys may exist for them.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const CORE_LANGUAGES = ['de', 'en', 'fr', 'it'] as const;
const NON_ENGLISH_CORE_LANGUAGES = ['de', 'fr', 'it'] as const;
const I18N_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../assets/i18n');
const LOCATION_KEYS = [
  'shift.all-shift.nav.location',
  'shift.all-shift.nav.location-city',
  'shift.all-shift.nav.location-zip-prefix',
  'shift.all-shift.nav.validity-valid',
  'shift.all-shift.nav.validity-completed',
  'shift.all-shift.nav.validity-future',
] as const;
const REMOVED_KEYS = ['shift.all-shift.nav.location-country', 'shift.all-shift.nav.location-state'] as const;
const CLIENT_FILTER_KEYS = [
  'address.all-address.all-address-nav.choose-countries',
  'address.all-address.all-address-nav.choose-cantons',
  'selecting',
  'deselecting',
  'close',
  'active',
  'former',
  'future',
] as const;
const VALIDITY_LABELS: Record<(typeof CORE_LANGUAGES)[number], readonly [string, string, string]> = {
  de: ['Gültig', 'Abgeschlossen', 'Künftig'],
  en: ['Valid', 'Completed', 'Upcoming'],
  fr: ['Valide', 'Terminé', 'À venir'],
  it: ['Valido', 'Concluso', 'Futuro'],
};

const load = (language: string): Record<string, string> =>
  JSON.parse(readFileSync(resolve(I18N_DIR, `${language}.json`), 'utf8'));

describe('shift location filter translations', () => {
  const byLanguage = new Map(CORE_LANGUAGES.map((language) => [language, load(language)]));

  it.each(CORE_LANGUAGES)('defines every location filter key in %s', (language) => {
    const translations = byLanguage.get(language)!;

    LOCATION_KEYS.forEach((key) => {
      expect(translations[key], `${language}: ${key}`).toBeTruthy();
      expect(translations[key], `${language}: ${key}`).not.toBe(key);
    });
  });

  it.each(NON_ENGLISH_CORE_LANGUAGES)('does not repeat the English labels in %s', (language) => {
    const translations = byLanguage.get(language)!;
    const english = byLanguage.get('en')!;

    const unchanged = [
      'shift.all-shift.nav.location',
      'shift.all-shift.nav.location-zip-prefix',
      'shift.all-shift.nav.validity-valid',
      'shift.all-shift.nav.validity-completed',
      'shift.all-shift.nav.validity-future',
    ].filter((key) => translations[key] === english[key]);

    expect(unchanged, language).toEqual([]);
  });

  it.each(CORE_LANGUAGES)('labels the validity checkboxes as agreed in %s', (language) => {
    const translations = byLanguage.get(language)!;
    const [valid, completed, future] = VALIDITY_LABELS[language];

    expect(translations['shift.all-shift.nav.validity-valid']).toBe(valid);
    expect(translations['shift.all-shift.nav.validity-completed']).toBe(completed);
    expect(translations['shift.all-shift.nav.validity-future']).toBe(future);
  });

  it.each(CORE_LANGUAGES)('keeps the client filter keys and defines no free-text country/state keys in %s', (language) => {
    const translations = byLanguage.get(language)!;

    CLIENT_FILTER_KEYS.forEach((key) => {
      expect(translations[key], `${language}: ${key}`).toBeTruthy();
    });
    REMOVED_KEYS.forEach((key) => {
      expect(translations[key], `${language}: ${key}`).toBeUndefined();
    });
  });

  it('leaves the client filter validity labels unchanged', () => {
    const german = byLanguage.get('de')!;

    expect(german['active']).toBe('Aktive');
    expect(german['former']).toBe('Einstige');
    expect(german['future']).toBe('Zukünftige');
  });
});
