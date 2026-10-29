// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { readFileSync, readdirSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';

const APP_ROOT = dirname(fileURLToPath(import.meta.url));
const UI_ROOT = resolve(APP_ROOT, '..', '..');
const SCANNED_ROOTS: readonly string[] = ['src', 'projects'];
const SKIPPED_FOLDERS: readonly string[] = ['node_modules', 'dist', '.angular'];
const TYPESCRIPT_EXTENSION = '.ts';
const SPEC_SUFFIX = '.spec.ts';
const MIN_EXPECTED_FILES = 2000;
const QUOTED_TEXT_TOAST_CALL = /\b\w*toast\w*\s*\.\s*show\w+\(\s*['"]/i;
const BACKTICK_KEY_OR_EMPTY_TOAST_CALL = /\b\w*toast\w*\s*\.\s*show\w+\(\s*`(?:[a-z0-9_-]+(?:\.[a-z0-9_-]+)+)?`/i;
const ALLOWED_FILES: readonly string[] = [];
const RULE =
  'ToastShowService (and PLUGIN_TOAST_SERVICE, which is the same instance) shows its text verbatim, it does not ' +
  "translate. Pass this.translate.instant('<key>') or emit the key through the EventBus (DomainEventHandler " +
  'translates it). A string literal as toast text is a raw i18n key, untranslated English or an empty toast; ' +
  'the second argument of showInfo/showError is only the toast name and is never displayed.';

const toPosix = (value: string): string => value.split('\\').join('/');

function collectProductionFiles(directory: string, found: string[]): string[] {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (SKIPPED_FOLDERS.includes(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) collectProductionFiles(path, found);
    else if (entry.name.endsWith(TYPESCRIPT_EXTENSION) && !entry.name.endsWith(SPEC_SUFFIX)) found.push(path);
  }
  return found;
}

const hasUntranslatedToastText = (source: string): boolean =>
  QUOTED_TEXT_TOAST_CALL.test(source) || BACKTICK_KEY_OR_EMPTY_TOAST_CALL.test(source);

describe('toast text is translated', () => {
  const files = SCANNED_ROOTS.flatMap((root) => collectProductionFiles(join(UI_ROOT, root), []));

  describe('rule', () => {
    it('flags an i18n key passed directly to a toast service, also across line breaks', () => {
      // Arrange / Act / Assert
      expect(hasUntranslatedToastText("this.toastService.showError('setting.branches.error.save');")).toBe(true);
      expect(hasUntranslatedToastText("this.toastShowService.showSuccess(\n  'floor-plan.save.success', 'x');")).toBe(true);
      expect(hasUntranslatedToastText('this.toast.showInfo(`a.b`);')).toBe(true);
    });

    it('flags an empty toast text', () => {
      // Arrange / Act / Assert
      expect(hasUntranslatedToastText("this.toastService.showError('', 'login.oauth2.error');")).toBe(true);
      expect(hasUntranslatedToastText('this.toastService.showInfo(\n  "", "auth.forgot-password.success");')).toBe(true);
      expect(hasUntranslatedToastText('this.toastService.showInfo(``);')).toBe(true);
    });

    it('flags hard-coded text, also when concatenated', () => {
      // Arrange / Act / Assert
      expect(hasUntranslatedToastText("this.toastShowService.showError('Empty response body');")).toBe(true);
      expect(hasUntranslatedToastText("this.toastShowService.showError(\n  'Validation error for ' + key, messages);")).toBe(true);
    });

    it('accepts translated text, composed translations, constants and non-toast wrappers', () => {
      // Arrange / Act / Assert
      expect(hasUntranslatedToastText("this.toastService.showError(this.translate.instant('setting.branches.error.save'));")).toBe(false);
      expect(hasUntranslatedToastText("this.toastService.showError(this.translate.instant(KEY), 'login.oauth2.error');")).toBe(false);
      expect(hasUntranslatedToastText('this.toast.showError(`${this.translate.instant(KEY)}: ${names}`, NAME);')).toBe(false);
      expect(hasUntranslatedToastText('this.toastService.showError(SAVE_ERROR_MESSAGE);')).toBe(false);
      expect(hasUntranslatedToastText("this.showError('setting.report.error.load');")).toBe(false);
    });
  });

  it('scans the app and the plugin projects', () => {
    // Assert
    expect(files.length).toBeGreaterThan(MIN_EXPECTED_FILES);
    expect(files.some((file) => toPosix(relative(UI_ROOT, file)).startsWith('projects/'))).toBe(true);
  });

  it('never passes a string literal as toast text', () => {
    // Act
    const offenders = files
      .map((file) => toPosix(relative(UI_ROOT, file)))
      .filter((file) => !ALLOWED_FILES.includes(file))
      .filter((file) => hasUntranslatedToastText(readFileSync(join(UI_ROOT, file), 'utf8')))
      .sort();

    // Assert
    expect(offenders, RULE).toEqual([]);
  });

  it('keeps the allowlist empty', () => {
    // Assert
    expect(ALLOWED_FILES, 'Fix the file instead of listing it.').toEqual([]);
  });
});
