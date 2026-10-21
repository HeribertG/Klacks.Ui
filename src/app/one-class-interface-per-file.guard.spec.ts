// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { MULTI_DECLARATION_FILES } from './one-class-interface-per-file-allowlist.constants';
import { isScannedSource, scanDeclarationCounts, topLevelClassAndInterfaceNames } from './one-class-interface-per-file.testing';

const APP_ROOT = dirname(fileURLToPath(import.meta.url));
const UI_ROOT = resolve(APP_ROOT, '..', '..');
const MAX_DECLARATIONS_PER_FILE = 1;
const MIN_EXPECTED_FILES = 1000;
const RULE =
  'Every class and every interface lives in its own file (.claude/rules/code-policies.md and frontend-naming.md of the ' +
  'super-repo, owner decision 2026-10-20). Function helpers (*.helper.ts) and constants files may export several ' +
  'functions or constants, but at most one class or interface. Move the extra declaration into a file next to it ' +
  "({name}.interface.ts, {name}.component.ts, {entity}.model.ts, ...) and update the importers.";

describe('one class or interface per file', () => {
  const { files, counts } = scanDeclarationCounts(UI_ROOT);
  const violations = Object.fromEntries(
    Object.entries(counts).filter(([, names]) => names.length > MAX_DECLARATIONS_PER_FILE),
  );

  describe('scanner', () => {
    it('counts top-level classes and interfaces, exported or not, but no type aliases, enums or nested types', () => {
      // Arrange
      const source = [
        'export interface IA { b: { c: string } }',
        'interface IHidden {}',
        'export abstract class A {}',
        'declare class Ambient {}',
        'export default class {}',
        'export type T = string;',
        'export enum E { X }',
        'export function f(): void { class Local {} }',
        "declare module 'x' { interface IAugmented {} }",
      ].join('\n');

      // Act
      const names = topLevelClassAndInterfaceNames('sample.ts', source);

      // Assert
      expect(names).toEqual(['IA', 'IHidden', 'A', 'Ambient', '<default class>']);
    });

    it('leaves specs, declaration files and test support files out of the scan', () => {
      // Arrange / Act / Assert
      expect(isScannedSource('src/app/domain/x.service.spec.ts')).toBe(false);
      expect(isScannedSource('src/app/shared/testing/time-zone.testing.ts')).toBe(false);
      expect(isScannedSource('src/app/testing/mock.ts')).toBe(false);
      expect(isScannedSource('projects/lib/src/typings.d.ts')).toBe(false);
      expect(isScannedSource('projects/lib/src/lib/x.service.ts')).toBe(true);
    });

    it('scans the app and the plugin libraries', () => {
      // Assert
      expect(files.length).toBeGreaterThan(MIN_EXPECTED_FILES);
      expect(files.some((file) => file.startsWith('projects/'))).toBe(true);
    });
  });

  describe('shrink-only allowlist', () => {
    it('adds no file with more than one class or interface and grows no listed file', () => {
      // Act
      const offending = Object.entries(violations)
        .filter(([file, names]) => names.length > (MULTI_DECLARATION_FILES[file] ?? MAX_DECLARATIONS_PER_FILE))
        .map(([file, names]) => `  ${file} -> ${names.length} (${names.join(', ')})`);

      // Assert
      expect(offending, `${RULE}\nFiles with more than one class or interface:\n${offending.join('\n')}`).toEqual([]);
    });

    it('lists no file whose count already dropped, so the allowlist only shrinks', () => {
      // Act
      const stale = Object.entries(MULTI_DECLARATION_FILES)
        .filter(([file, allowed]) => (counts[file]?.length ?? 0) < allowed)
        .map(([file, allowed]) => `  ${file}: listed ${allowed}, actual ${counts[file]?.length ?? 0}`);

      // Assert
      expect(
        stale,
        'These MULTI_DECLARATION_FILES entries are out of date - lower the count or delete the entry:\n' +
          stale.join('\n'),
      ).toEqual([]);
    });

    it('keeps the allowlist sorted and every listed count above one', () => {
      // Arrange
      const keys = Object.keys(MULTI_DECLARATION_FILES);

      // Assert
      expect(keys).toEqual([...keys].sort());
      expect(Object.values(MULTI_DECLARATION_FILES).every((count) => count > MAX_DECLARATIONS_PER_FILE)).toBe(true);
    });
  });
});
