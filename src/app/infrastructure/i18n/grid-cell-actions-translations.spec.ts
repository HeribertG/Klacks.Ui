// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Guards the accessible name of the touch-mode cell actions button: it is the only text the button
 * carries, so a key missing in one core language would announce the raw translation key to a screen
 * reader instead of a sentence.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { GRID_CELL_ACTIONS_LABEL_KEY } from 'src/app/presentation/shared/grid/body/grid-cell-actions-button/grid-cell-actions-button.component';

const CORE_LANGUAGES = ['de', 'en', 'fr', 'it'] as const;
const I18N_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../assets/i18n');

const load = (language: string): Record<string, string> =>
  JSON.parse(readFileSync(resolve(I18N_DIR, `${language}.json`), 'utf8'));

describe('grid cell actions translations', () => {
  it.each(CORE_LANGUAGES)('translates the cell actions label in %s', (language) => {
    const translations = load(language);

    expect(translations[GRID_CELL_ACTIONS_LABEL_KEY], language).toBeTruthy();
    expect(translations[GRID_CELL_ACTIONS_LABEL_KEY], language).not.toBe(
      GRID_CELL_ACTIONS_LABEL_KEY,
    );
  });

  it('uses a distinct wording per language, so no locale silently falls back to English', () => {
    const labels = CORE_LANGUAGES.map((language) => load(language)[GRID_CELL_ACTIONS_LABEL_KEY]);

    expect(new Set(labels).size).toBe(CORE_LANGUAGES.length);
  });
});
