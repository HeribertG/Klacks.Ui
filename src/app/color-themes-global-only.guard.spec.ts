// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { readFileSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import { collectFiles } from './source-files.testing';

const APP_ROOT = dirname(fileURLToPath(import.meta.url));
const UI_ROOT = resolve(APP_ROOT, '..', '..');
const STANDARD_STYLES = 'src/assets/standard-styles';
const GLOBAL_STYLESHEET = 'src/styles.scss';
const GLOBAL_ONLY_PARTIALS: readonly string[] = ['color-themes', 'typography', 'standard-bootstrap-accents'];
const VENDORED_FOLDER = 'src/assets/fontawesome-free-6.1.1-web/';
const LEGACY_ROOT_SELECTOR_FILES: readonly string[] = [
  'src/app/presentation/no-access/no-access.component.scss',
  'src/app/presentation/page-not-found/page-not-found.component.scss',
];
const SCANNED_ROOTS: readonly string[] = ['src', 'projects'];
const SKIPPED_FOLDERS: readonly string[] = ['node_modules', 'dist'];
const STYLESHEET_EXTENSION = '.scss';
const MIN_EXPECTED_STYLESHEETS = 300;
const ROOT_SELECTOR_LINE = /^[ \t]*(?:(?::root|html)(?=[\s,{.[:]|$)|\[data-theme\b)/m;
const RULE =
  'Rules on :root, [data-theme] or html belong to the global stylesheet only. The theme blocks live in ' +
  'color-themes.scss and are emitted once by src/styles.scss; colors.scss holds only variables so that every ' +
  "component stylesheet may @use it. Inside a component stylesheet Angular's emulated encapsulation turns such " +
  'rules into selectors that never match, which once added ~12 MB of dead CSS strings to the production JavaScript.';

const toPosix = (value: string): string => value.split('\\').join('/');
const partialPath = (name: string): string => `${STANDARD_STYLES}/${name}${STYLESHEET_EXTENSION}`;
const moduleUsePattern = (name: string): RegExp => new RegExp(`@(use|forward|import)\\s+["'](?:[^"']*/)?${name}(\\.scss)?["']`);

const collectStylesheets = (directory: string): string[] =>
  collectFiles(directory, (path) => path.endsWith(STYLESHEET_EXTENSION), SKIPPED_FOLDERS).map((path) =>
    toPosix(relative(UI_ROOT, path)),
  );

describe('root and theme rules are emitted by the global stylesheet only', () => {
  const stylesheets = SCANNED_ROOTS.flatMap((root) => collectStylesheets(join(UI_ROOT, root)));
  const source = (file: string): string => readFileSync(join(UI_ROOT, file), 'utf8');
  const exempt = new Set([GLOBAL_STYLESHEET, ...GLOBAL_ONLY_PARTIALS.map(partialPath), ...LEGACY_ROOT_SELECTOR_FILES]);

  it('scans the stylesheets of the app and the plugin projects', () => {
    // Assert
    expect(stylesheets.length).toBeGreaterThan(MIN_EXPECTED_STYLESHEETS);
  });

  it('keeps :root, [data-theme] and html rules out of colors.scss, the shared partials and component stylesheets', () => {
    // Act
    const offenders = stylesheets
      .filter((file) => !exempt.has(file) && !file.startsWith(VENDORED_FOLDER))
      .filter((file) => ROOT_SELECTOR_LINE.test(source(file)));

    // Assert
    expect(offenders, RULE).toEqual([]);
  });

  it('lists only legacy files that still contain such a rule', () => {
    // Act
    const stale = LEGACY_ROOT_SELECTOR_FILES.filter((file) => !ROOT_SELECTOR_LINE.test(source(file)));

    // Assert
    expect(stale, 'Remove the cleaned-up file from LEGACY_ROOT_SELECTOR_FILES.').toEqual([]);
  });

  it.each(GLOBAL_ONLY_PARTIALS)('loads %s.scss from src/styles.scss and from nowhere else', (partial) => {
    // Act
    const users = stylesheets.filter((file) => moduleUsePattern(partial).test(source(file)));

    // Assert
    expect(users, RULE).toEqual([GLOBAL_STYLESHEET]);
  });

  it('recognises the rules and module loads it guards against', () => {
    // Assert
    expect(ROOT_SELECTOR_LINE.test(':root {\n  --a: 1;\n}')).toBe(true);
    expect(ROOT_SELECTOR_LINE.test('.x {}\n[data-theme="dark"] .x {}')).toBe(true);
    expect(ROOT_SELECTOR_LINE.test('html,\nbody {}')).toBe(true);
    expect(ROOT_SELECTOR_LINE.test(':host-context([data-theme="dark"]) .x {}')).toBe(false);
    expect(ROOT_SELECTOR_LINE.test('$standartGreenColor: #1bc5bd;')).toBe(false);
    expect(moduleUsePattern('color-themes').test('@use "../../assets/standard-styles/color-themes.scss";')).toBe(true);
    expect(moduleUsePattern('color-themes').test("@forward 'color-themes';")).toBe(true);
    expect(moduleUsePattern('color-themes').test('@use "colors" as colors;')).toBe(false);
    expect(moduleUsePattern('typography').test('@use "settings-typography";')).toBe(false);
  });
});
