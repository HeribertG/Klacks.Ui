// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Guards the texts of the variant (key) management: every scenarioVariant.* key must exist in the four core
 * languages, keep its interpolation placeholders and not fall back to the English text. The last test reads the sources
 * of the dialog, the panels, the mode bar, the selector menu, the more-actions menu of the schedule toolbar, the
 * scenario creation dialog, the scenario summary, the banner, the scenario actions, the row header tooltip and the
 * constants and fails for a key that is used but not listed
 * here, so a new key cannot be added without a translation.
 */

import { readdirSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const CORE_LANGUAGES = ['de', 'en', 'fr', 'it'] as const;
const NON_ENGLISH_CORE_LANGUAGES = ['de', 'fr', 'it'] as const;
const HERE = dirname(fileURLToPath(import.meta.url));
const I18N_DIR = resolve(HERE, '../../../assets/i18n');
const APP_DIR = resolve(HERE, '../..');
const KEY_PREFIX = 'scenarioVariant.';
const SOURCE_PATHS = [
  'presentation/workplace/schedule/dialogs/scenario-variants-dialog',
  'presentation/workplace/schedule/variant-mode-bar',
  'presentation/workplace/schedule/schedule-header/scenario-selector/scenario-selector.component.html',
  'presentation/workplace/schedule/schedule-header/schedule-header.component.html',
  'presentation/workplace/schedule/dialogs/create-scenario-dialog',
  'presentation/workplace/schedule/dialogs/scenario-summary-dialog',
  'presentation/workplace/schedule/scenario-banner',
  'presentation/workplace/schedule/services/scenario-actions.service.ts',
  'presentation/workplace/schedule/shift-section/schedule-shift-row-header/services/shift-row-header-tooltip.service.ts',
  'domain/constants/scenario-variant.constants.ts',
] as const;
const SOURCE_EXTENSIONS = ['.ts', '.html'] as const;
const SPEC_SUFFIX = '.spec.ts';
const USED_KEY_PATTERN = /['"`](scenarioVariant\.[A-Za-z.]+)['"`]/g;

const PLACEHOLDERS: Readonly<Record<string, readonly string[]>> = {
  'delete.confirm': ['{{name}}'],
  'shifts.title': ['{{name}}'],
  'shifts.deleteConfirm': ['{{name}}'],
  'copy.panelTitle': ['{{name}}'],
  'copy.existingNote': ['{{count}}'],
  'copy.confirmExisting': ['{{count}}'],
  'copy.selectedCount': ['{{count}}'],
  'copy.result': ['{{copied}}', '{{skipped}}'],
  'accept.confirmOpenSlots': ['{{name}}', '{{count}}', '{{keys}}'],
  'accept.consumed': ['{{names}}'],
  'accept.copiedShifts.one': ['{{count}}', '{{keys}}'],
  'accept.copiedShifts.other': ['{{count}}', '{{keys}}'],
  'summary.copiedShifts.one': ['{{count}}'],
  'summary.copiedShifts.other': ['{{count}}'],
  'summary.covered': ['{{filled}}', '{{demanded}}'],
  'summary.open': ['{{count}}'],
  'summary.peak': ['{{count}}', '{{date}}'],
};

const SAME_IN_ENGLISH_BY_NATURE = ['column.name', 'column.status', 'form.name', 'form.description', 'status.active', 'bar.label'];

const KEYS = [
  'menu', 'title', 'hint', 'noGroup', 'readOnly', 'create', 'empty', 'loadFailed', 'loading',
  'column.name', 'column.period', 'column.shifts', 'column.status', 'expired',
  'status.active', 'status.accepted', 'status.closed',
  'editShifts', 'copyShifts', 'edit', 'viewShifts', 'delete.title', 'delete.confirm',
  'form.name', 'form.description', 'form.from', 'form.until', 'form.invalid', 'form.save',
  'error.invalid', 'error.gone', 'error.conflict', 'error.inUse', 'error.consumed', 'error.shiftCloned', 'error.shiftHasCuts',
  'error.shiftRefused', 'error.shiftsOutsidePeriod',
  'back',
  'shifts.title', 'shifts.new', 'shifts.edit', 'shifts.cut', 'shifts.delete', 'shifts.deleteConfirm',
  'shifts.empty', 'shifts.loadFailed',
  'copy.title', 'copy.panelTitle', 'copy.warning', 'copy.existingNote', 'copy.confirmExisting',
  'copy.modeLabel', 'copy.modeSelection', 'copy.modeGroup', 'copy.group', 'copy.keyGroup',
  'copy.noCandidates', 'copy.loadFailed', 'copy.selectedCount', 'copy.start', 'copy.result', 'copy.refused',
  'bar.label', 'bar.hint', 'bar.end', 'leftForForeignShift',
  'select.title', 'select.hint', 'select.empty', 'select.expiredHint',
  'accept.needsShiftRight', 'accept.confirmOpenSlots', 'accept.consumed', 'accept.consumedUnnamed', 'accept.forbidden',
  'accept.copiedShifts.one', 'accept.copiedShifts.other',
  'summary.title', 'summary.covered', 'summary.open', 'summary.peak',
  'summary.copiedShifts.one', 'summary.copiedShifts.other',
  'marker.tooltip',
].map((key) => `${KEY_PREFIX}${key}`);

const load = (language: string): Record<string, string> =>
  JSON.parse(readFileSync(resolve(I18N_DIR, `${language}.json`), 'utf8'));

const collectSourceFiles = (path: string): string[] => {
  const absolute = join(APP_DIR, path);
  if (SOURCE_EXTENSIONS.some((extension) => absolute.endsWith(extension))) {
    return [absolute];
  }

  return readdirSync(absolute, { recursive: true, encoding: 'utf8' })
    .map((relative) => join(absolute, relative))
    .filter((file) => SOURCE_EXTENSIONS.some((extension) => file.endsWith(extension)) && !file.endsWith(SPEC_SUFFIX));
};

describe('scenario variant translations', () => {
  const byLanguage = new Map(CORE_LANGUAGES.map((language) => [language, load(language)]));

  it.each(CORE_LANGUAGES)('translates every variant key in %s', (language) => {
    const translations = byLanguage.get(language)!;

    KEYS.forEach((key) => {
      expect(translations[key], `${language}: ${key}`).toBeTruthy();
    });
  });

  it.each(CORE_LANGUAGES)('keeps the interpolation placeholders in %s', (language) => {
    const translations = byLanguage.get(language)!;

    Object.entries(PLACEHOLDERS).forEach(([key, placeholders]) => {
      placeholders.forEach((placeholder) => {
        expect(translations[`${KEY_PREFIX}${key}`], `${language}: ${key}`).toContain(placeholder);
      });
    });
  });

  it.each(NON_ENGLISH_CORE_LANGUAGES)('does not fall back to the English text in %s', (language) => {
    const english = byLanguage.get('en')!;
    const translations = byLanguage.get(language)!;
    const skipped = SAME_IN_ENGLISH_BY_NATURE.map((key) => `${KEY_PREFIX}${key}`);

    KEYS.filter((key) => !skipped.includes(key)).forEach((key) => {
      expect(translations[key], `${language}: ${key}`).not.toBe(english[key]);
    });
  });

  it('lists every key the dialog, the panels and the mode bar use', () => {
    const used = new Set<string>();
    SOURCE_PATHS.flatMap(collectSourceFiles).forEach((file) => {
      for (const match of readFileSync(file, 'utf8').matchAll(USED_KEY_PATTERN)) {
        used.add(match[1]);
      }
    });

    expect(used.size).toBeGreaterThan(0);
    expect([...used].filter((key) => !KEYS.includes(key)).sort()).toEqual([]);
  });

  it('uses every listed key somewhere in those sources', () => {
    const source = SOURCE_PATHS.flatMap(collectSourceFiles)
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');

    expect(KEYS.filter((key) => !source.includes(key))).toEqual([]);
  });
});
