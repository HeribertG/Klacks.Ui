// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { closeSync, openSync, readSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import { BUILD_OUTPUT_FOLDERS, collectFiles } from './source-files.testing';

const APP_ROOT = dirname(fileURLToPath(import.meta.url));
const UI_ROOT = resolve(APP_ROOT, '..', '..');
const HEADER_LINE = '// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only';
const HEADER_BYTES = Buffer.from(HEADER_LINE, 'utf8');
const LINE_FEED = 0x0a;
const CARRIAGE_RETURN = 0x0d;
const SCANNED_ROOTS: readonly string[] = ['src', 'projects'];
const TYPESCRIPT_EXTENSION = '.ts';
const MIN_EXPECTED_FILES = 3000;
const ALLOWED_FILES: readonly string[] = [];
const RULE =
  `Line 1 of every .ts file in src/ and projects/ (production code, specs and test support alike) must be exactly ` +
  `'${HEADER_LINE}' with no byte-order mark before it (.claude/rules/code-policies.md). Add the header, or strip the ` +
  'leading EF BB BF bytes; do not allowlist the file.';

const toPosix = (value: string): string => value.split('\\').join('/');

const collectTypeScriptFiles = (directory: string): string[] =>
  collectFiles(directory, (path) => path.endsWith(TYPESCRIPT_EXTENSION), BUILD_OUTPUT_FOLDERS);

function readLeadingBytes(path: string): Buffer {
  const buffer = Buffer.alloc(HEADER_BYTES.length + 1);
  const descriptor = openSync(path, 'r');
  try {
    const read = readSync(descriptor, buffer, 0, buffer.length, 0);
    return buffer.subarray(0, read);
  } finally {
    closeSync(descriptor);
  }
}

function startsWithHeaderLine(leading: Buffer): boolean {
  if (leading.length < HEADER_BYTES.length || !leading.subarray(0, HEADER_BYTES.length).equals(HEADER_BYTES)) return false;
  if (leading.length === HEADER_BYTES.length) return true;
  const next = leading[HEADER_BYTES.length];
  return next === LINE_FEED || next === CARRIAGE_RETURN;
}

describe('copyright header', () => {
  const files = SCANNED_ROOTS.flatMap((root) => collectTypeScriptFiles(join(UI_ROOT, root)));

  describe('rule', () => {
    it('accepts the exact first line followed by a line break or the end of the file', () => {
      // Arrange / Act / Assert
      expect(startsWithHeaderLine(Buffer.from(HEADER_LINE, 'utf8'))).toBe(true);
      expect(startsWithHeaderLine(Buffer.from(`${HEADER_LINE}\n\nimport x;`, 'utf8'))).toBe(true);
      expect(startsWithHeaderLine(Buffer.from(`${HEADER_LINE}\r\n\r\nimport x;`, 'utf8'))).toBe(true);
    });

    it('rejects a byte-order mark, a missing, shifted or altered header', () => {
      // Arrange / Act / Assert
      expect(startsWithHeaderLine(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(`${HEADER_LINE}\n`, 'utf8')]))).toBe(false);
      expect(startsWithHeaderLine(Buffer.from('', 'utf8'))).toBe(false);
      expect(startsWithHeaderLine(Buffer.from('import x;', 'utf8'))).toBe(false);
      expect(startsWithHeaderLine(Buffer.from(`\n${HEADER_LINE}`, 'utf8'))).toBe(false);
      expect(startsWithHeaderLine(Buffer.from(`${HEADER_LINE} `, 'utf8'))).toBe(false);
      expect(startsWithHeaderLine(Buffer.from(HEADER_LINE.replace('AGPL-3.0-only', 'MIT'), 'utf8'))).toBe(false);
    });
  });

  it('scans the app and the plugin projects', () => {
    // Assert
    expect(files.length).toBeGreaterThan(MIN_EXPECTED_FILES);
    expect(files.some((file) => toPosix(relative(UI_ROOT, file)).startsWith('projects/'))).toBe(true);
  });

  it('starts every TypeScript file with the copyright header and no byte-order mark', () => {
    // Act
    const offenders = files
      .map((file) => toPosix(relative(UI_ROOT, file)))
      .filter((file) => !ALLOWED_FILES.includes(file))
      .filter((file) => !startsWithHeaderLine(readLeadingBytes(join(UI_ROOT, file))))
      .sort();

    // Assert
    expect(offenders, RULE).toEqual([]);
  });

  it('keeps the allowlist empty', () => {
    // Assert
    expect(ALLOWED_FILES, 'Fix the file instead of listing it.').toEqual([]);
  });
});
