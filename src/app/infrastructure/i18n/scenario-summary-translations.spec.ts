// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Guards the texts of the scenario summary and the open-slots toast: a key missing in one core language would show a
 * raw key in a dialog or toast the planner reads right after a run. The toast must interpolate its counts and reason.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import {
  SCENARIO_OPEN_SLOT_REASON,
  SCENARIO_OPEN_SLOT_REASON_KEY_PREFIX,
} from 'src/app/domain/constants/scenario-summary.constants';

const CORE_LANGUAGES = ['de', 'en', 'fr', 'it'] as const;
const NON_ENGLISH_CORE_LANGUAGES = ['de', 'fr', 'it'] as const;
const I18N_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../assets/i18n');

const TOAST_KEY = 'autoWizard.toast.openSlots';
const TOAST_NO_REASON_KEY = 'autoWizard.toast.openSlotsNoReason';
const REASON_KEYS = Object.values(SCENARIO_OPEN_SLOT_REASON).map(
  (code) => `${SCENARIO_OPEN_SLOT_REASON_KEY_PREFIX}${code}`,
);
const SUMMARY_KEYS = [
  'scenarioSummary.button',
  'scenarioSummary.title',
  'scenarioSummary.loading',
  'scenarioSummary.notAvailable',
  'scenarioSummary.loadFailed',
  'scenarioSummary.total',
  'scenarioSummary.shiftsTitle',
  'scenarioSummary.col.shift',
  'scenarioSummary.col.covered',
  'scenarioSummary.col.open',
  'scenarioSummary.reasonsTitle',
  'scenarioSummary.reasonCount',
  ...REASON_KEYS,
] as const;
const ALL_KEYS = [TOAST_KEY, TOAST_NO_REASON_KEY, ...SUMMARY_KEYS];

const load = (language: string): Record<string, string> =>
  JSON.parse(readFileSync(resolve(I18N_DIR, `${language}.json`), 'utf8'));

describe('scenario summary translations', () => {
  const byLanguage = new Map(CORE_LANGUAGES.map((language) => [language, load(language)]));

  it.each(CORE_LANGUAGES)('translates every summary and toast key in %s', (language) => {
    const translations = byLanguage.get(language)!;

    ALL_KEYS.forEach((key) => {
      expect(translations[key], `${language}: ${key}`).toBeTruthy();
    });
  });

  it('covers every reason code the client knows', () => {
    expect(REASON_KEYS).toHaveLength(5);
  });

  it.each(CORE_LANGUAGES)('interpolates counts and reason in the open-slots toast in %s', (language) => {
    const translations = byLanguage.get(language)!;

    ['{{open}}', '{{demanded}}', '{{reason}}'].forEach((placeholder) => {
      expect(translations[TOAST_KEY], `${language}: ${placeholder}`).toContain(placeholder);
    });
    ['{{open}}', '{{demanded}}'].forEach((placeholder) => {
      expect(translations[TOAST_NO_REASON_KEY], `${language}: ${placeholder}`).toContain(placeholder);
    });
  });

  it.each(CORE_LANGUAGES)('interpolates the summary total and the reason count in %s', (language) => {
    const translations = byLanguage.get(language)!;

    ['{{filled}}', '{{demanded}}', '{{open}}'].forEach((placeholder) => {
      expect(translations['scenarioSummary.total'], `${language}: ${placeholder}`).toContain(placeholder);
    });
    expect(translations['scenarioSummary.reasonCount']).toContain('{{count}}');
  });

  it.each(NON_ENGLISH_CORE_LANGUAGES)('does not fall back to the English text in %s', (language) => {
    const english = byLanguage.get('en')!;
    const translations = byLanguage.get(language)!;

    ALL_KEYS.forEach((key) => {
      expect(translations[key], `${language}: ${key}`).not.toBe(english[key]);
    });
  });
});
