// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Guards the goal-proposal translations: the panel renders titles and rationales purely from these
 * keys, so a key present in one core language and missing in another shows the proposal in the
 * fallback language instead of the user's own. Also asserts that no proposal text carries a technical
 * identifier and that every rationale interpolates both parameters the server sends.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const CORE_LANGUAGES = ['de', 'en', 'fr', 'it'] as const;
const TYPE_KEY_PREFIX = 'assistant-chat.goal-candidates.type.';
const TITLE_SUFFIX = '.title';
const RATIONALE_SUFFIX = '.rationale';
const I18N_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../assets/i18n');

const load = (language: string): Record<string, string> =>
  JSON.parse(readFileSync(resolve(I18N_DIR, `${language}.json`), 'utf8'));

const typeKeysOf = (translations: Record<string, string>): string[] =>
  Object.keys(translations)
    .filter((key) => key.startsWith(TYPE_KEY_PREFIX))
    .sort();

describe('goal candidate translations', () => {
  const byLanguage = new Map(CORE_LANGUAGES.map((language) => [language, load(language)]));
  const referenceKeys = typeKeysOf(byLanguage.get('de')!);

  it('defines goal type keys in the reference language', () => {
    expect(referenceKeys.length).toBeGreaterThan(0);
  });

  it.each(CORE_LANGUAGES)('has the same goal type keys in %s as in the reference language', (language) => {
    expect(typeKeysOf(byLanguage.get(language)!)).toEqual(referenceKeys);
  });

  it('pairs every title with a rationale', () => {
    const titles = referenceKeys.filter((key) => key.endsWith(TITLE_SUFFIX));
    const rationales = referenceKeys.filter((key) => key.endsWith(RATIONALE_SUFFIX));

    expect(titles.length).toBe(rationales.length);
    titles.forEach((title) => {
      expect(referenceKeys).toContain(title.replace(TITLE_SUFFIX, RATIONALE_SUFFIX));
    });
  });

  it.each(CORE_LANGUAGES)('interpolates both rationale parameters in %s', (language) => {
    const translations = byLanguage.get(language)!;

    referenceKeys
      .filter((key) => key.endsWith(RATIONALE_SUFFIX))
      .forEach((key) => {
        expect(translations[key]).toContain('{{count}}');
        expect(translations[key]).toContain('{{days}}');
      });
  });

  it.each(CORE_LANGUAGES)('carries no technical identifier in %s', (language) => {
    const translations = byLanguage.get(language)!;

    referenceKeys.forEach((key) => {
      expect(translations[key]).not.toMatch(/[a-z]+_[a-z]+/);
    });
  });

  it.each(CORE_LANGUAGES)('states in %s that approving drafts a plan', (language) => {
    expect(byLanguage.get(language)!['assistant-chat.goal-candidates.hint']).toBeTruthy();
    expect(byLanguage.get(language)!['assistant-chat.goal-candidates.confidence.high']).toBeTruthy();
    expect(byLanguage.get(language)!['assistant-chat.goal-candidates.confidence.low']).toBeTruthy();
  });
});
