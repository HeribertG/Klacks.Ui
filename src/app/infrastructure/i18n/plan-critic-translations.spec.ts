// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Guards the texts of the Wizard 3 vision-critic report: a key missing in one core language would show a raw key in
 * the stage-3 result, and the discarded and model lines must interpolate their values.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { PLAN_CRITIC_TEXT_KEYS } from 'src/app/domain/constants/plan-critic.constants';

const CORE_LANGUAGES = ['de', 'en', 'fr', 'it'] as const;
const I18N_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../assets/i18n');

const load = (language: string): Record<string, string> =>
  JSON.parse(readFileSync(resolve(I18N_DIR, `${language}.json`), 'utf8'));

describe('plan critic translations', () => {
  const byLanguage = new Map(CORE_LANGUAGES.map((language) => [language, load(language)]));

  it.each(CORE_LANGUAGES)('translates every critic key in %s', (language) => {
    const translations = byLanguage.get(language)!;

    PLAN_CRITIC_TEXT_KEYS.forEach((key) => {
      expect(translations[key], `${language}: ${key}`).toBeTruthy();
    });
  });

  it.each(CORE_LANGUAGES)('interpolates count and model in %s', (language) => {
    const translations = byLanguage.get(language)!;

    expect(translations['holisticHarmonizer.critic.discarded']).toContain('{{count}}');
    expect(translations['holisticHarmonizer.critic.model']).toContain('{{model}}');
  });
});
