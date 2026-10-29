// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Declaration scanner behind the one-class-or-interface-per-file guard: parses every production source under the given
 * roots with the TypeScript compiler API and counts its top-level class and interface declarations (exported or not,
 * abstract and ambient ones included). Function helpers, constants, type aliases and enums are not counted.
 * Used by one-class-interface-per-file.guard.spec.ts.
 * @param uiRoot - Absolute path of the Klacks.Ui project root; scanned roots and reported keys are relative to it
 */
import { readFileSync } from 'fs';
import { join, relative } from 'path';
import * as ts from 'typescript';
import { collectFiles } from './source-files.testing';

export const SCANNED_ROOTS: readonly string[] = ['src/app', 'projects'];

const SOURCE_EXTENSION = '.ts';
const SPEC_SUFFIX = '.spec.ts';
const TESTING_SUFFIX = '.testing.ts';
const DECLARATION_SUFFIX = '.d.ts';
const TESTING_FOLDER = 'testing';
const SKIPPED_FOLDERS: readonly string[] = ['node_modules', 'dist', TESTING_FOLDER];
const ANONYMOUS_CLASS = '<default class>';

const toPosix = (value: string): string => value.split('\\').join('/');

export function isScannedSource(relativePath: string): boolean {
  const lower = toPosix(relativePath).toLowerCase();
  return (
    lower.endsWith(SOURCE_EXTENSION) &&
    !lower.endsWith(SPEC_SUFFIX) &&
    !lower.endsWith(TESTING_SUFFIX) &&
    !lower.endsWith(DECLARATION_SUFFIX) &&
    !lower.split('/').includes(TESTING_FOLDER)
  );
}

export function topLevelClassAndInterfaceNames(fileName: string, source: string): string[] {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, false);
  const names: string[] = [];
  for (const statement of sourceFile.statements) {
    if (ts.isClassDeclaration(statement)) {
      names.push(statement.name?.text ?? ANONYMOUS_CLASS);
    } else if (ts.isInterfaceDeclaration(statement)) {
      names.push(statement.name.text);
    }
  }
  return names;
}

const listSources = (directory: string, uiRoot: string): string[] =>
  collectFiles(directory, (path) => isScannedSource(relative(uiRoot, path)), SKIPPED_FOLDERS).map((path) =>
    toPosix(relative(uiRoot, path)),
  );

export function scanDeclarationCounts(uiRoot: string): { files: string[]; counts: Record<string, string[]> } {
  const files = SCANNED_ROOTS.flatMap((root) => listSources(join(uiRoot, root), uiRoot)).sort();
  const counts: Record<string, string[]> = {};
  for (const file of files) {
    counts[file] = topLevelClassAndInterfaceNames(file, readFileSync(join(uiRoot, file), 'utf8'));
  }
  return { files, counts };
}
