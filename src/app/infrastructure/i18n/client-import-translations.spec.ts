// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Guards the employee import translations in the four core languages: every issue code, file error
 * code and enum value the UI builds a key from, plus every literal clientImport key used in the import card,
 * modal and step templates, components and constants, must resolve to a real text instead of a raw key.
 */

import { readFileSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { collectFiles } from 'src/app/source-files.testing';
import {
  CLIENT_IMPORT_CLIENT_TYPE_KEY_PREFIX,
  CLIENT_IMPORT_COUNT_KEYS,
  CLIENT_IMPORT_FILE_ERROR_CODES,
  CLIENT_IMPORT_FILE_ERROR_KEY_PREFIX,
  CLIENT_IMPORT_GENDER_KEY_PREFIX,
  CLIENT_IMPORT_ISSUE_CODES,
  CLIENT_IMPORT_ISSUE_KEY_PREFIX,
  CLIENT_IMPORT_ISSUE_REASON_KEY_PREFIX,
  CLIENT_IMPORT_ISSUE_REASONS,
  CLIENT_IMPORT_LEGAL_ENTITY_GENDER,
  CLIENT_IMPORT_REQUEST_ERROR_CODES,
  CLIENT_IMPORT_REQUEST_ERROR_KEY_PREFIX,
  CLIENT_IMPORT_TARGET_KEY_PREFIX,
  CLIENT_IMPORT_TARGETS,
} from 'src/app/domain/constants/client-import.constants';
import {
  ClientImportClientType,
  ClientImportDateFormat,
  ClientImportDuplicateHandling,
  ClientImportEmailType,
  ClientImportFormerEmployeesHandling,
  ClientImportGender,
  ClientImportMobileType,
  ClientImportNameOrder,
  ClientImportPhoneType,
  ClientImportRowStatus,
  ClientImportStep,
} from 'src/app/domain/enums/client-import.enums';

const CORE_LANGUAGES = ['de', 'en', 'fr', 'it'] as const;
const HERE = dirname(fileURLToPath(import.meta.url));
const I18N_DIR = resolve(HERE, '../../../assets/i18n');
const SOURCE_PATHS = [
  resolve(HERE, '../../presentation/workplace/settings/client-import'),
  resolve(HERE, '../../presentation/workplace/settings/client-import-card'),
  resolve(HERE, '../../domain/constants/client-import.constants.ts'),
];
const LITERAL_KEY_PATTERN = /["'](clientImport\.[A-Za-z0-9.-]*[A-Za-z0-9])["']/g;
const SOURCE_FILE_PATTERN = /\.(ts|html)$/;
const SPEC_FILE_SUFFIX = '.spec.ts';

const load = (language: string): Record<string, string> =>
  JSON.parse(readFileSync(resolve(I18N_DIR, `${language}.json`), 'utf8'));

const isSourceFile = (path: string): boolean => SOURCE_FILE_PATTERN.test(path) && !path.endsWith(SPEC_FILE_SUFFIX);

const sourceFiles = (path: string): string[] => (statSync(path).isDirectory() ? collectFiles(path, isSourceFile) : [path]);

function literalKeys(): string[] {
  const keys = new Set<string>();
  for (const file of SOURCE_PATHS.flatMap(sourceFiles)) {
    for (const match of readFileSync(file, 'utf8').matchAll(LITERAL_KEY_PATTERN)) {
      keys.add(match[1]);
    }
  }
  return [...keys];
}

function prefixed(prefix: string, values: readonly string[]): string[] {
  return values.map((value) => prefix + value);
}

const REQUIRED_KEYS: readonly string[] = [
  ...prefixed(CLIENT_IMPORT_ISSUE_KEY_PREFIX, CLIENT_IMPORT_ISSUE_CODES),
  ...prefixed(CLIENT_IMPORT_FILE_ERROR_KEY_PREFIX, CLIENT_IMPORT_FILE_ERROR_CODES),
  ...prefixed(CLIENT_IMPORT_REQUEST_ERROR_KEY_PREFIX, CLIENT_IMPORT_REQUEST_ERROR_CODES),
  ...Object.entries(CLIENT_IMPORT_ISSUE_REASONS).flatMap(([code, reasons]) =>
    prefixed(`${CLIENT_IMPORT_ISSUE_REASON_KEY_PREFIX}${code}.`, reasons),
  ),
  ...prefixed(CLIENT_IMPORT_TARGET_KEY_PREFIX, CLIENT_IMPORT_TARGETS),
  ...prefixed('clientImport.step.', Object.values(ClientImportStep)),
  ...prefixed('clientImport.status.', Object.values(ClientImportRowStatus)),
  ...prefixed(CLIENT_IMPORT_GENDER_KEY_PREFIX, [...Object.values(ClientImportGender), CLIENT_IMPORT_LEGAL_ENTITY_GENDER]),
  ...prefixed(CLIENT_IMPORT_CLIENT_TYPE_KEY_PREFIX, Object.values(ClientImportClientType)),
  ...prefixed('clientImport.dateFormat.', Object.values(ClientImportDateFormat)),
  ...prefixed('clientImport.nameOrder.', Object.values(ClientImportNameOrder)),
  ...prefixed('clientImport.policy.communication.', [
    ...Object.values(ClientImportEmailType),
    ...Object.values(ClientImportPhoneType),
    ...Object.values(ClientImportMobileType),
  ]),
  ...prefixed('clientImport.policy.formerEmployees.', Object.values(ClientImportFormerEmployeesHandling)),
  ...prefixed('clientImport.policy.duplicates.', Object.values(ClientImportDuplicateHandling)),
];

describe('client import translations', () => {
  const literals = literalKeys();

  it('finds the literal keys of the import page (scanner sanity check)', () => {
    expect(literals).toContain('clientImport.title');
    expect(literals).toContain('clientImport.error.commit');
    expect(literals).toContain('clientImport.error.alreadyCommitted');
    expect(literals).toContain('clientImport.preview.commitBlocked.one');
    expect(literals).toContain('clientImport.preview.commitBlocked.other');
    expect(literals).toContain('clientImport.preview.notesSomeRows');
  });

  it.each(CORE_LANGUAGES)('has a singular and a plural text for every count text in %s', (language) => {
    const translations = load(language);

    const missing = Object.values(CLIENT_IMPORT_COUNT_KEYS)
      .flatMap((keys) => [keys.one, keys.other])
      .filter((key) => !translations[key]?.includes('{{count}}'));

    expect(missing).toEqual([]);
  });

  it.each(CORE_LANGUAGES)('translates every clientImport key in %s', (language) => {
    const translations = load(language);

    const missing = [...REQUIRED_KEYS, ...literals].filter(
      (key) => !translations[key] || translations[key] === key,
    );

    expect(missing).toEqual([]);
  });

  it('uses the same placeholders in every core language', () => {
    const catalogs = CORE_LANGUAGES.map(load);
    const placeholders = (text: string): string => [...text.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort().join();
    const clientImportKeys = Object.keys(catalogs[0]).filter((key) => key.startsWith('clientImport.'));

    const mismatches = clientImportKeys.filter((key) =>
      catalogs.some((catalog) => placeholders(catalog[key] ?? '') !== placeholders(catalogs[0][key])),
    );

    expect(mismatches).toEqual([]);
  });
});
