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
const RAW_KEY_TOAST_CALL = /\b\w*toast\w*\s*\.\s*show\w+\(\s*(['"`])[a-z0-9_-]+(?:\.[a-z0-9_-]+)+\1/i;
const RAW_KEY_SUCCESS_HEADER =
  /\b\w*toast\w*\s*\.\s*showSuccess\([^;]*?,\s*(['"`])[a-z0-9_-]+(?:\.[a-z0-9_-]+)+\1\s*[,)]/i;
const EMPTY_TEXT_TOAST_CALL = /\b\w*toast\w*\s*\.\s*show\w+\(\s*(['"`])\1/i;
const ALLOWED_FILES: readonly string[] = [];
const RULE =
  'ToastShowService (and PLUGIN_TOAST_SERVICE, which is the same instance) shows its text verbatim, it does not ' +
  "translate. Pass this.translate.instant('<key>') or emit the key through the EventBus (DomainEventHandler " +
  'translates it). A raw i18n key shows the key itself to the user, also as the showSuccess header. An empty ' +
  'text shows an empty toast: the second argument of showInfo/showError is only the toast name, never displayed.';

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

const hasRawKeyToastCall = (source: string): boolean =>
  RAW_KEY_TOAST_CALL.test(source) || RAW_KEY_SUCCESS_HEADER.test(source);
const hasEmptyToastText = (source: string): boolean => EMPTY_TEXT_TOAST_CALL.test(source);
const hasToastTextDefect = (source: string): boolean => hasRawKeyToastCall(source) || hasEmptyToastText(source);

describe('toast text is translated', () => {
  const files = SCANNED_ROOTS.flatMap((root) => collectProductionFiles(join(UI_ROOT, root), []));

  describe('rule', () => {
    it('flags an i18n key passed directly to a toast service, also across line breaks', () => {
      // Arrange / Act / Assert
      expect(hasRawKeyToastCall("this.toastService.showError('setting.branches.error.save');")).toBe(true);
      expect(hasRawKeyToastCall("this.toastShowService.showSuccess(\n  'floor-plan.save.success', 'x');")).toBe(true);
      expect(hasRawKeyToastCall('this.toast.showInfo("a.b");')).toBe(true);
    });

    it('flags an i18n key passed as the showSuccess header', () => {
      // Arrange / Act / Assert
      expect(hasRawKeyToastCall("this.toastService.showSuccess(this.translate.instant('a.b'), 'common.success');")).toBe(true);
      expect(hasRawKeyToastCall("this.toastService.showSuccess(text, 'common.success', extra);")).toBe(true);
    });

    it('flags an empty toast text', () => {
      // Arrange / Act / Assert
      expect(hasEmptyToastText("this.toastService.showError('', 'login.oauth2.error');")).toBe(true);
      expect(hasEmptyToastText('this.toastService.showInfo(\n  "", "auth.forgot-password.success");')).toBe(true);
    });

    it('accepts translated text, constants, plain sentences and non-toast wrappers', () => {
      // Arrange / Act / Assert
      expect(hasRawKeyToastCall("this.toastService.showError(this.translate.instant('setting.branches.error.save'));")).toBe(false);
      expect(hasRawKeyToastCall('this.toastService.showError(SAVE_ERROR_KEY);')).toBe(false);
      expect(hasRawKeyToastCall("this.toastService.showError('Empty response body');")).toBe(false);
      expect(hasRawKeyToastCall("this.showError('setting.report.error.load');")).toBe(false);
    });

    it('accepts an i18n key as the toast name and a translated showSuccess header', () => {
      // Arrange / Act / Assert
      expect(hasToastTextDefect("this.toastService.showError(this.translate.instant(KEY), 'login.oauth2.error');")).toBe(false);
      expect(hasToastTextDefect("this.toastService.showSuccess(text, this.translate.instant('common.success'));")).toBe(false);
    });
  });

  it('scans the app and the plugin projects', () => {
    // Assert
    expect(files.length).toBeGreaterThan(MIN_EXPECTED_FILES);
    expect(files.some((file) => toPosix(relative(UI_ROOT, file)).startsWith('projects/'))).toBe(true);
  });

  it('never passes a raw i18n key or an empty text to a toast service', () => {
    // Act
    const offenders = files
      .map((file) => toPosix(relative(UI_ROOT, file)))
      .filter((file) => !ALLOWED_FILES.includes(file))
      .filter((file) => hasToastTextDefect(readFileSync(join(UI_ROOT, file), 'utf8')))
      .sort();

    // Assert
    expect(offenders, RULE).toEqual([]);
  });

  it('keeps the allowlist empty', () => {
    // Assert
    expect(ALLOWED_FILES, 'Fix the file instead of listing it.').toEqual([]);
  });
});
