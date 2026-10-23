// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { FILE_SIZE_CEILINGS, MAX_CEILING_ENTRIES } from './source-file-size-ceilings.constants';
import { countLines, importsTestSupportFolder, isSizeScannedSource, scanFilesImportingTestSupport, scanLineCounts } from './source-file-size.testing';

const APP_ROOT = dirname(fileURLToPath(import.meta.url));
const UI_ROOT = resolve(APP_ROOT, '..', '..');
const FILE_LINE_LIMIT = 800;
const MIN_EXPECTED_FILES = 1000;
const SHRINK_ONLY_HINT =
  'FILE_SIZE_CEILINGS (source-file-size-ceilings.constants.ts) may only LOSE entries or get lower ceilings. Do not ' +
  'add a file and do not raise a ceiling: split the file instead. If a split is genuinely impossible, the owner ' +
  'decides - not the test.';

describe('source file size', () => {
  const counts = scanLineCounts(UI_ROOT);

  describe('scanner', () => {
    it('counts lines like File.ReadAllLines: a trailing line break adds no line, CRLF and LF count the same', () => {
      // Arrange / Act / Assert
      expect(countLines('')).toBe(0);
      expect(countLines('a')).toBe(1);
      expect(countLines('a\n')).toBe(1);
      expect(countLines('a\nb')).toBe(2);
      expect(countLines('a\r\nb\r\n')).toBe(2);
      expect(countLines('a\n\n')).toBe(2);
    });

    it('scans production .ts and .html but leaves specs, declaration files and the shared/testing folder out', () => {
      // Arrange / Act / Assert
      expect(isSizeScannedSource('src/app/domain/x.service.ts')).toBe(true);
      expect(isSizeScannedSource('src/app/presentation/x/x.component.html')).toBe(true);
      expect(isSizeScannedSource('projects/lib/src/lib/x.service.ts')).toBe(true);
      expect(isSizeScannedSource('src/app/domain/x.service.spec.ts')).toBe(false);
      expect(isSizeScannedSource('src/app/shared/testing/time-zone.testing.ts')).toBe(false);
      expect(isSizeScannedSource('src/app/layer-dependencies.testing.ts')).toBe(true);
      expect(isSizeScannedSource('src/app/testing/mock.ts')).toBe(true);
      expect(isSizeScannedSource('projects/lib/src/testing/mock.ts')).toBe(true);
      expect(isSizeScannedSource('projects/lib/src/typings.d.ts')).toBe(false);
      expect(isSizeScannedSource('src/app/x/styles.scss')).toBe(false);
      expect(isSizeScannedSource('src/assets/i18n/en.json')).toBe(false);
    });

    it('scans the app and the plugin libraries', () => {
      // Arrange
      const files = Object.keys(counts);

      // Assert
      expect(files.length).toBeGreaterThan(MIN_EXPECTED_FILES);
      expect(files.some((file) => file.startsWith('projects/'))).toBe(true);
      expect(files.some((file) => file.endsWith('.html'))).toBe(true);
    });
  });

  describe('excluded test support', () => {
    it('detects imports of the shared/testing folder', () => {
      // Arrange / Act / Assert
      expect(importsTestSupportFolder("import { a } from '../../shared/testing/time-zone.testing';")).toBe(true);
      expect(importsTestSupportFolder("import { a } from './testing/x';")).toBe(true);
      expect(importsTestSupportFolder("const m = await import('src/app/shared/testing/x');")).toBe(true);
      expect(importsTestSupportFolder("import { a } from './layer-dependencies.testing';")).toBe(false);
    });

    it('is not imported by any scanned production file, so excluded files cannot hide production code', () => {
      // Act
      const importers = scanFilesImportingTestSupport(UI_ROOT, Object.keys(counts));

      // Assert
      expect(
        importers,
        `Only specs may import src/app/shared/testing (it is excluded from the size scan):
${importers.join('
')}`,
      ).toEqual([]);
    });
  });

  describe('shrink-only ceilings', () => {
    it('keeps every file within the limit, or within its ceiling when it is listed', () => {
      // Act
      const offenders = Object.entries(counts)
        .map(([file, lines]) => ({ file, lines, ceiling: FILE_SIZE_CEILINGS[file] ?? FILE_LINE_LIMIT }))
        .filter(({ lines, ceiling }) => lines > ceiling)
        .map(({ file, lines, ceiling }) => `  ${file}: ${lines} lines (ceiling ${ceiling})`);

      // Assert
      expect(
        offenders,
        `Files above ${FILE_LINE_LIMIT} lines or above their ceiling:\n${offenders.join('\n')}\n${SHRINK_ONLY_HINT}`,
      ).toEqual([]);
    });

    it('lists no file that is missing, back under the limit, or has a ceiling above its current size', () => {
      // Act
      const stale = Object.entries(FILE_SIZE_CEILINGS).flatMap(([file, ceiling]) => {
        const lines = counts[file];
        if (lines === undefined) {
          return [`  ${file}: listed, but the file is gone or no longer scanned - delete the entry`];
        }
        if (lines <= FILE_LINE_LIMIT) {
          return [`  ${file}: ${lines} lines, within the ${FILE_LINE_LIMIT}-line limit - delete the entry`];
        }
        return lines < ceiling ? [`  ${file}: ${lines} lines, ceiling ${ceiling} - lower the ceiling to ${lines}`] : [];
      });

      // Assert
      expect(
        stale,
        `These FILE_SIZE_CEILINGS entries are out of date - the list may only shrink:\n${stale.join('\n')}`,
      ).toEqual([]);
    });

    it('lists no more entries than MAX_CEILING_ENTRIES, which must equal the entry count so deleting entries lowers the cap', () => {
      // Assert
      expect(
        Object.keys(FILE_SIZE_CEILINGS).length,
        'FILE_SIZE_CEILINGS may not gain entries: lower MAX_CEILING_ENTRIES to the entry count when deleting entries, ' +
          `never raise it. ${SHRINK_ONLY_HINT}`,
      ).toBe(MAX_CEILING_ENTRIES);
    });

    it('keeps the ceilings sorted and every ceiling above the limit', () => {
      // Arrange
      const keys = Object.keys(FILE_SIZE_CEILINGS);

      // Assert
      expect(keys).toEqual([...keys].sort());
      expect(Object.values(FILE_SIZE_CEILINGS).every((ceiling) => ceiling > FILE_LINE_LIMIT)).toBe(true);
    });
  });
});
