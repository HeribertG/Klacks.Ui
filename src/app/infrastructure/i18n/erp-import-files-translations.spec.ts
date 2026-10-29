// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Guards the ERP import file list texts: every 'settings.erp-drop-points.files.' key the code uses (constants
 * plus literal keys in the erp-drop-points templates and components) exists, non-empty, in all four core
 * languages, the core languages carry the same key set with the same placeholders, the texts of the old
 * folder-based list stay gone, and the UI mirror of the API's fixed failure reasons still matches
 * Klacks.Api/Domain/Constants/ErpImportFileFailureReasons.cs when that repository is checked out next to it.
 * Order-level rejection reasons in that file (shown raw in the expanded rejected orders, like every other
 * order rejection message) are listed in ORDER_LEVEL_REASONS and excluded from the comparison.
 */

import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { collectFiles } from 'src/app/source-files.testing';
import {
  ERP_IMPORT_FILE_FAILURE_REASONS,
  ERP_IMPORT_FILES_I18N,
} from 'src/app/domain/constants/erp-import-file.constants';

const CORE_LANGUAGES = ['de', 'en', 'fr', 'it'] as const;
const REFERENCE_LANGUAGE = 'en';
const KEY_PREFIX = 'settings.erp-drop-points.files.';
const HERE = dirname(fileURLToPath(import.meta.url));
const I18N_DIR = resolve(HERE, '../../../assets/i18n');
const SOURCE_DIR = resolve(HERE, '../../presentation/workplace/settings/erp-drop-points');
const API_FAILURE_REASONS_FILE = resolve(HERE, '../../../../../Klacks.Api/Domain/Constants/ErpImportFileFailureReasons.cs');
const LITERAL_KEY_PATTERN = /["'](settings\.erp-drop-points\.files\.[A-Za-z0-9.-]*[A-Za-z0-9])["']/g;
const SOURCE_FILE_PATTERN = /\.(ts|html)$/;
const SPEC_FILE_SUFFIX = '.spec.ts';
const PLACEHOLDER_PATTERN = /\{\{\s*([^{}\s]+)\s*\}\}/g;
const CSHARP_CONSTANT_PATTERN = /public const string (\w+) = "((?:[^"\\]|\\.)*)";/g;

const ORDER_LEVEL_REASONS = ['ConcurrentOpenDraft'];

const RETIRED_KEYS = [
  'settings.erp-drop-points.files.import-processed',
  'settings.erp-drop-points.files.import-rejected',
  'settings.erp-drop-points.files.success.retry',
];

const load = (language: string): Record<string, string> =>
  JSON.parse(readFileSync(resolve(I18N_DIR, `${language}.json`), 'utf8'));

const sourceFiles = (path: string): string[] =>
  collectFiles(path, (file) => SOURCE_FILE_PATTERN.test(file) && !file.endsWith(SPEC_FILE_SUFFIX));

function keysUsedInCode(): string[] {
  const keys = new Set<string>(Object.values(ERP_IMPORT_FILES_I18N));
  for (const file of sourceFiles(SOURCE_DIR)) {
    for (const match of readFileSync(file, 'utf8').matchAll(LITERAL_KEY_PATTERN)) {
      keys.add(match[1]);
    }
  }
  return [...keys].sort();
}

const filesKeysOf = (translations: Record<string, string>): string[] =>
  Object.keys(translations)
    .filter((key) => key.startsWith(KEY_PREFIX))
    .sort();

const placeholdersOf = (text: string): string[] => [...text.matchAll(PLACEHOLDER_PATTERN)].map((match) => match[1]).sort();

describe('ERP import file list translations', () => {
  const byLanguage = new Map(CORE_LANGUAGES.map((language) => [language, load(language)]));
  const reference = byLanguage.get(REFERENCE_LANGUAGE)!;

  it('finds the literal keys of the erp-drop-points templates', () => {
    expect(keysUsedInCode()).toContain('settings.erp-drop-points.files.header.source');
  });

  it.each(CORE_LANGUAGES)('translates every file list key used in code in %s', (language) => {
    const translations = byLanguage.get(language)!;

    keysUsedInCode().forEach((key) => {
      expect(translations[key]?.trim(), `${language}: ${key}`).toBeTruthy();
    });
  });

  it.each(CORE_LANGUAGES)('has the same file list keys and placeholders in %s as in English', (language) => {
    const translations = byLanguage.get(language)!;

    expect(filesKeysOf(translations)).toEqual(filesKeysOf(reference));
    filesKeysOf(reference).forEach((key) => {
      expect(placeholdersOf(translations[key]), `${language}: ${key}`).toEqual(placeholdersOf(reference[key]));
    });
  });

  it.each(CORE_LANGUAGES)('no longer carries the texts of the folder-based list in %s', (language) => {
    const keys = Object.keys(byLanguage.get(language)!);

    expect(keys.filter((key) => RETIRED_KEYS.includes(key))).toEqual([]);
  });

  it.skipIf(!existsSync(API_FAILURE_REASONS_FILE))('mirrors the fixed failure reasons of the API verbatim', () => {
    const apiReasons = Object.fromEntries(
      [...readFileSync(API_FAILURE_REASONS_FILE, 'utf8').matchAll(CSHARP_CONSTANT_PATTERN)]
        .filter((match) => !ORDER_LEVEL_REASONS.includes(match[1]))
        .map((match) => [match[1], JSON.parse(`"${match[2]}"`)]),
    );

    expect(apiReasons).toEqual({ ...ERP_IMPORT_FILE_FAILURE_REASONS });
  });
});
