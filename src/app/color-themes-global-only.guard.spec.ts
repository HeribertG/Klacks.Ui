// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { readdirSync, readFileSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';

const APP_ROOT = dirname(fileURLToPath(import.meta.url));
const UI_ROOT = resolve(APP_ROOT, '..', '..');
const STANDARD_STYLES = 'src/assets/standard-styles';
const COLORS_MODULE = `${STANDARD_STYLES}/colors.scss`;
const GLOBAL_STYLESHEET = 'src/styles.scss';
const SCANNED_ROOTS: readonly string[] = ['src', 'projects'];
const SKIPPED_FOLDERS: readonly string[] = ['node_modules', 'dist'];
const STYLESHEET_EXTENSION = '.scss';
const MIN_EXPECTED_STYLESHEETS = 300;
const THEME_SELECTOR = /:root|\[data-theme|(^|[\s,}])html[\s,{.[:]/m;
const THEME_MODULE_USE = /@(use|forward|import)\s+["'][^"']*color-themes(\.scss)?["']/;
const RULE =
  'colors.scss is a pure Sass module (variables only) that every component stylesheet may @use. The :root and ' +
  '[data-theme] blocks live in color-themes.scss and are emitted once by src/styles.scss. Inside a component ' +
  "stylesheet Angular's emulated encapsulation turns them into selectors that never match, which once added ~12 MB " +
  'of dead CSS strings to the production JavaScript.';

const toPosix = (value: string): string => value.split('\\').join('/');

function collectStylesheets(directory: string, found: string[]): string[] {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (SKIPPED_FOLDERS.includes(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) collectStylesheets(path, found);
    else if (entry.name.endsWith(STYLESHEET_EXTENSION)) found.push(toPosix(relative(UI_ROOT, path)));
  }
  return found;
}

describe('color themes are emitted by the global stylesheet only', () => {
  const stylesheets = SCANNED_ROOTS.flatMap((root) => collectStylesheets(join(UI_ROOT, root), []));
  const usesThemeModule = (file: string): boolean => THEME_MODULE_USE.test(readFileSync(join(UI_ROOT, file), 'utf8'));

  it('scans the stylesheets of the app and the plugin projects', () => {
    // Assert
    expect(stylesheets.length).toBeGreaterThan(MIN_EXPECTED_STYLESHEETS);
  });

  it('keeps theme selectors out of the colors module', () => {
    // Arrange
    const source = readFileSync(join(UI_ROOT, COLORS_MODULE), 'utf8');

    // Assert
    expect(THEME_SELECTOR.test(source), RULE).toBe(false);
  });

  it('loads color-themes.scss from src/styles.scss and from nowhere else', () => {
    // Act
    const users = stylesheets.filter(usesThemeModule);

    // Assert
    expect(users, RULE).toEqual([GLOBAL_STYLESHEET]);
  });

  it('recognises the theme selectors and module uses it guards against', () => {
    // Assert
    expect(THEME_SELECTOR.test(':root {\n  --a: 1;\n}')).toBe(true);
    expect(THEME_SELECTOR.test('[data-theme="dark"] .x {}')).toBe(true);
    expect(THEME_SELECTOR.test('$standartGreenColor: #1bc5bd;')).toBe(false);
    expect(THEME_MODULE_USE.test('@use "../../assets/standard-styles/color-themes.scss";')).toBe(true);
    expect(THEME_MODULE_USE.test("@use 'color-themes' as themes;")).toBe(true);
    expect(THEME_MODULE_USE.test('@use "colors" as colors;')).toBe(false);
  });
});
