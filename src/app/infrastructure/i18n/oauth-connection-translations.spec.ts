// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Guards the translations of the OAuth connection settings card: every key the template uses and every
 * validation message of the own-targets list must exist in each core language, and no non-English core
 * language may merely repeat the English text.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { OAUTH_CUSTOM_TARGET_ERROR } from 'src/app/domain/constants/oauth-connection.constants';

const CORE_LANGUAGES = ['de', 'en', 'fr', 'it'] as const;
const NON_ENGLISH_CORE_LANGUAGES = ['de', 'fr', 'it'] as const;
const SPEC_DIR = dirname(fileURLToPath(import.meta.url));
const I18N_DIR = resolve(SPEC_DIR, '../../../assets/i18n');
const TEMPLATE = resolve(SPEC_DIR, '../../presentation/workplace/settings/oauth-connection-settings/oauth-connection-settings.component.html');
const TEMPLATE_KEY_PATTERN = /["'](setting\.oauthConnection\.[A-Za-z.-]+)["']/g;
const CARD_LABEL_KEY = 'settings.oauthConnections';

const load = (language: string): Record<string, string> =>
  JSON.parse(readFileSync(resolve(I18N_DIR, `${language}.json`), 'utf8'));

const templateKeys = (): string[] =>
  [...readFileSync(TEMPLATE, 'utf8').matchAll(TEMPLATE_KEY_PATTERN)].map((match) => match[1]);

const REQUIRED_KEYS: readonly string[] = [
  ...new Set([CARD_LABEL_KEY, ...templateKeys(), ...Object.values(OAUTH_CUSTOM_TARGET_ERROR)]),
];

describe('OAuth connection translations', () => {
  const byLanguage = new Map(CORE_LANGUAGES.map((language) => [language, load(language)]));

  it('finds the keys the template uses', () => {
    expect(templateKeys().length).toBeGreaterThan(10);
    expect(REQUIRED_KEYS).toContain(OAUTH_CUSTOM_TARGET_ERROR.Duplicate);
  });

  it.each(CORE_LANGUAGES)('translates every key of the card in %s', (language) => {
    const translations = byLanguage.get(language)!;

    REQUIRED_KEYS.forEach((key) => {
      expect(translations[key], `${language}: ${key}`).toBeTruthy();
      expect(translations[key], `${language}: ${key}`).not.toBe(key);
    });
  });

  it.each(NON_ENGLISH_CORE_LANGUAGES)('does not fall back to the English text in %s', (language) => {
    const translations = byLanguage.get(language)!;
    const english = byLanguage.get('en')!;

    REQUIRED_KEYS.forEach((key) => {
      expect(translations[key], `${language}: ${key}`).not.toBe(english[key]);
    });
  });
});
