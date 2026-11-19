// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Guards the texts of the directory sign-in approval: every key the approval tab, its refusal map, the user list label
 * the transport warnings and the sign-in refusal use exists in each core language, no non-English core language merely repeats the English
 * text, and the removed hint for linking an existing account stays gone.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import {
  AD_REQUIRES_SSL_WARNING_KEY,
  DIRECTORY_ACCOUNT_ERROR_GENERIC_KEY,
  DIRECTORY_ACCOUNT_ERROR_KEYS,
  LDAP_UNENCRYPTED_WARNING_KEY,
} from 'src/app/domain/constants/identity-provider.constants';

const CORE_LANGUAGES = ['de', 'en', 'fr', 'it'] as const;
const NON_ENGLISH_CORE_LANGUAGES = ['de', 'fr', 'it'] as const;
const SPEC_DIR = dirname(fileURLToPath(import.meta.url));
const I18N_DIR = resolve(SPEC_DIR, '../../../assets/i18n');
const SETTINGS_DIR = resolve(SPEC_DIR, '../../presentation/workplace/settings');
const ACCOUNTS_TEMPLATE = resolve(
  SETTINGS_DIR,
  'identity-providers/identity-provider-accounts/identity-provider-accounts.component.html'
);
const TEMPLATE_KEY_PATTERN = /["'](settings\.identity-provider\.accounts\.[A-Za-z.-]+)["']/g;
const REMOVED_KEY = 'settings.identity-provider.accounts.hint.links-existing';
const NEUTRAL_KEYS = new Set([
  'settings.identity-provider.accounts.column.name',
  'settings.identity-provider.accounts.column.email',
]);

const load = (language: string): Record<string, string> =>
  JSON.parse(readFileSync(resolve(I18N_DIR, `${language}.json`), 'utf8'));

const templateKeys = (): string[] =>
  [...readFileSync(ACCOUNTS_TEMPLATE, 'utf8').matchAll(TEMPLATE_KEY_PATTERN)].map((match) => match[1]);

const REQUIRED_KEYS: readonly string[] = [
  ...new Set([
    ...templateKeys(),
    ...Object.values(DIRECTORY_ACCOUNT_ERROR_KEYS),
    DIRECTORY_ACCOUNT_ERROR_GENERIC_KEY,
    'settings.identity-provider.tab-accounts',
    AD_REQUIRES_SSL_WARNING_KEY,
    LDAP_UNENCRYPTED_WARNING_KEY,
    'setting.user-admin.row.directory-login',
    'AUTH_DIRECTORY_ACCESS_NOT_GRANTED',
  ]),
];

describe('directory accounts translations', () => {
  const byLanguage = new Map(CORE_LANGUAGES.map((language) => [language, load(language)]));

  it('finds the keys the approval tab uses', () => {
    expect(templateKeys().length).toBeGreaterThan(10);
    expect(REQUIRED_KEYS).toContain('settings.identity-provider.accounts.hint.email-in-use');
    expect(REQUIRED_KEYS).toContain('settings.identity-provider.accounts.hint.has-roles');
  });

  it.each(CORE_LANGUAGES)('translates every key of the directory sign-in approval in %s', (language) => {
    const translations = byLanguage.get(language)!;

    REQUIRED_KEYS.forEach((key) => {
      expect(translations[key], `${language}: ${key}`).toBeTruthy();
      expect(translations[key], `${language}: ${key}`).not.toBe(key);
    });
  });

  it.each(NON_ENGLISH_CORE_LANGUAGES)('does not fall back to the English text in %s', (language) => {
    const translations = byLanguage.get(language)!;
    const english = byLanguage.get('en')!;

    REQUIRED_KEYS.filter((key) => !NEUTRAL_KEYS.has(key)).forEach((key) => {
      expect(translations[key], `${language}: ${key}`).not.toBe(english[key]);
    });
  });

  it.each(CORE_LANGUAGES)('no longer carries the removed hint for linking an existing account in %s', (language) => {
    expect(Object.keys(byLanguage.get(language)!)).not.toContain(REMOVED_KEY);
  });
});
