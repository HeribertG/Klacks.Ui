// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Guards the texts of the own-admin setup form and of a rejected account registration: every core language must
 * carry every text with the same interpolation placeholders as English, every reason code the backend can send
 * must have its own text, and the removed user name field must not come back.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { ACCOUNT_REGISTRATION_REASONS } from 'src/app/domain/constants/account-registration.constants';
import { PASSWORD_RULE } from 'src/app/domain/constants/password-policy.constants';
import {
  ACCOUNT_REGISTRATION_UNKNOWN_REASON_KEY,
  accountRegistrationReasonKey,
} from 'src/app/domain/helpers/account-registration-rejection.helper';

const CORE_LANGUAGES = ['de', 'en', 'fr', 'it'] as const;
const I18N_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../assets/i18n');
const PLACEHOLDER = /\{\{\w+\}\}/g;
const COUNT_PLACEHOLDER = '{{count}}';
const RULE_KEY_PREFIX = 'setup.rule.';
const LENGTH_RULE_KEY = `${RULE_KEY_PREFIX}${PASSWORD_RULE.LENGTH}`;
const REMOVED_KEYS = ['setup.userName'];
const SETUP_KEYS = [
  'setup.passwordConfirm',
  'setup.passwordRules',
  'setup.error.required',
  'setup.error.passwordMismatch',
  ...Object.values(PASSWORD_RULE).map((rule) => `${RULE_KEY_PREFIX}${rule}`),
];
const REASON_KEYS = [
  ...Object.values(ACCOUNT_REGISTRATION_REASONS).map(accountRegistrationReasonKey),
  ACCOUNT_REGISTRATION_UNKNOWN_REASON_KEY,
];
const MESSAGE_KEYS = [...SETUP_KEYS, ...REASON_KEYS];

const load = (language: string): Record<string, string> =>
  JSON.parse(readFileSync(resolve(I18N_DIR, `${language}.json`), 'utf8'));

const placeholders = (text: string): string[] => (text.match(PLACEHOLDER) ?? []).sort();

describe('account registration translations', () => {
  it('gives every backend reason code its own text instead of the unknown-reason fallback', () => {
    const reasonKeys = Object.values(ACCOUNT_REGISTRATION_REASONS).map(accountRegistrationReasonKey);

    expect(reasonKeys).not.toContain(ACCOUNT_REGISTRATION_UNKNOWN_REASON_KEY);
  });

  describe.each(CORE_LANGUAGES)('%s', (language) => {
    it.each(MESSAGE_KEYS)('translates %s', (key) => {
      const translations = load(language);

      expect(translations[key], key).toBeTruthy();
      expect(translations[key], key).not.toBe(key);
    });

    it.each(MESSAGE_KEYS)('keeps the placeholders of English in %s', (key) => {
      expect(placeholders(load(language)[key]), key).toEqual(placeholders(load('en')[key]));
    });

    it('puts the required length into the length rule', () => {
      expect(load(language)[LENGTH_RULE_KEY]).toContain(COUNT_PLACEHOLDER);
    });

    it.each(REMOVED_KEYS)('no longer carries %s', (key) => {
      expect(load(language)[key]).toBeUndefined();
    });
  });
});
