// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Line counter behind the source-file-size guard: walks the production .ts and .html files under src/app and projects/
 * and reports the line count of each, skipping specs, test support files, declaration files and testing folders.
 * Used by source-file-size.guard.spec.ts.
 * @param uiRoot - Absolute path of the Klacks.Ui project root; scanned roots and reported keys are relative to it
 */
import { readdirSync, readFileSync } from 'fs';
import { join, relative } from 'path';

export const SIZE_SCANNED_ROOTS: readonly string[] = ['src/app', 'projects'];

const SCANNED_EXTENSIONS: readonly string[] = ['.ts', '.html'];
const EXCLUDED_SUFFIXES: readonly string[] = ['.spec.ts', '.d.ts'];
const SKIPPED_FOLDERS: readonly string[] = ['node_modules', 'dist', '.angular'];
const LINE_BREAK = /\r\n|\r|\n/;
const TEST_SUPPORT_IMPORT = /\b(?:from|import)\s*\(?\s*['"][^'"]*(?:\.\/|\/)testing\//;

export const TEST_SUPPORT_FOLDER = 'src/app/shared/testing/';

const toPosix = (value: string): string => value.split('\\').join('/');

export function isSizeScannedSource(relativePath: string): boolean {
  const lower = toPosix(relativePath).toLowerCase();
  return (
    SCANNED_EXTENSIONS.some((extension) => lower.endsWith(extension)) &&
    !EXCLUDED_SUFFIXES.some((suffix) => lower.endsWith(suffix)) &&
    !lower.startsWith(TEST_SUPPORT_FOLDER)
  );
}

export function importsTestSupportFolder(source: string): boolean {
  return TEST_SUPPORT_IMPORT.test(source);
}

export function countLines(source: string): number {
  if (source.length === 0) {
    return 0;
  }
  const lines = source.split(LINE_BREAK);
  return lines[lines.length - 1] === '' ? lines.length - 1 : lines.length;
}

function listSources(directory: string, uiRoot: string, found: string[]): string[] {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!SKIPPED_FOLDERS.includes(entry.name.toLowerCase())) {
        listSources(fullPath, uiRoot, found);
      }
    } else if (isSizeScannedSource(relative(uiRoot, fullPath))) {
      found.push(toPosix(relative(uiRoot, fullPath)));
    }
  }
  return found;
}

export function scanFilesImportingTestSupport(uiRoot: string, files: readonly string[]): string[] {
  return files.filter((file) => importsTestSupportFolder(readFileSync(join(uiRoot, file), 'utf8')));
}

export function scanLineCounts(uiRoot: string): Record<string, number> {
  const files = SIZE_SCANNED_ROOTS.flatMap((root) => listSources(join(uiRoot, root), uiRoot, [])).sort();
  const counts: Record<string, number> = {};
  for (const file of files) {
    counts[file] = countLines(readFileSync(join(uiRoot, file), 'utf8'));
  }
  return counts;
}
