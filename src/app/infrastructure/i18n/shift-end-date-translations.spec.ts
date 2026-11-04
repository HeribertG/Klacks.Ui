// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Guards the texts around the end date of a locked shift, the reset of cuts and the question before leaving the edit page: a key missing in
 * one core language would show a raw translation key in a toast or in the dialog.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { SHIFT_END_DATE_REFUSED_KEY } from 'src/app/domain/helpers/shift-end-date-refusal.helper';
import { SHIFT_RESET_REFUSED_KEY } from 'src/app/domain/helpers/shift-reset-refusal.helper';

const CORE_LANGUAGES = ['de', 'en', 'fr', 'it'] as const;
const I18N_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../assets/i18n');
const KEYS = [
  SHIFT_END_DATE_REFUSED_KEY,
  'shift.edit-shift.main.until-hint',
  'shift.edit-shift.leave.title',
  'shift.edit-shift.leave.message',
  'setting.report.discardConfirm',
  'setting.report.discardCancel',
  SHIFT_RESET_REFUSED_KEY,
  'shift.cut-shift.reset-undo-hint',
  'shift.cut-shift.reset-keep-hint',
];

const load = (language: string): Record<string, string> =>
  JSON.parse(readFileSync(resolve(I18N_DIR, `${language}.json`), 'utf8'));

describe('shift end date translations', () => {
  it.each(CORE_LANGUAGES)('translates every key in %s', (language) => {
    const translations = load(language);

    KEYS.forEach((key) => {
      expect(translations[key], `${language}: ${key}`).toBeTruthy();
      expect(translations[key], `${language}: ${key}`).not.toBe(key);
    });
  });
});
