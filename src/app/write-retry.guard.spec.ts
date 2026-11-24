// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { readFileSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import * as ts from 'typescript';
import { BUILD_OUTPUT_FOLDERS, collectFiles } from './source-files.testing';

const APP_ROOT = dirname(fileURLToPath(import.meta.url));
const UI_ROOT = resolve(APP_ROOT, '..', '..');
const SCANNED_ROOTS: readonly string[] = ['src', 'projects'];
const TYPESCRIPT_EXTENSION = '.ts';
const SPEC_SUFFIX = '.spec.ts';
const MIN_EXPECTED_FILES = 2000;
const RETRY_OPERATOR = 'retry';
const WRITING_HTTP_CALL = /\.(?:post|put|delete|patch)\s*(?:<[^(]*?>)?\s*\(|\.request\s*(?:<[^(]*?>)?\s*\(\s*['"`](?:POST|PUT|DELETE|PATCH)/;
const ALLOWED_FILES: readonly string[] = [];
const RULE =
  'A plain retry(n) repeats a request the server has refused (400, 403, 409) and every error toast with it. ' +
  'PUT, DELETE, PATCH and reading POSTs use retryTransientHttpErrors() from infrastructure/helpers/http-retry.helper; ' +
  'a creating POST gets no retry, unless it sends an Idempotency-Key (idempotentRequestOptions()).';

const toPosix = (value: string): string => value.split('\\').join('/');

const collectProductionFiles = (directory: string): string[] =>
  collectFiles(
    directory,
    (path) => path.endsWith(TYPESCRIPT_EXTENSION) && !path.endsWith(SPEC_SUFFIX),
    BUILD_OUTPUT_FOLDERS,
  );

const isPlainRetry = (node: ts.Node): node is ts.CallExpression => {
  if (!ts.isCallExpression(node) || node.arguments.length === 0 || ts.isObjectLiteralExpression(node.arguments[0])) {
    return false;
  }
  const callee = node.expression;
  return ts.isIdentifier(callee)
    ? callee.text === RETRY_OPERATOR
    : ts.isPropertyAccessExpression(callee) && callee.name.text === RETRY_OPERATOR;
};

const enclosingStatement = (node: ts.Node): ts.Node => {
  let current = node;
  while (current.parent && !ts.isStatement(current)) {
    current = current.parent;
  }
  return current;
};

const hasPlainRetryOnWrite = (source: string): boolean => {
  if (!source.includes(RETRY_OPERATOR)) {
    return false;
  }
  const file = ts.createSourceFile('source.ts', source, ts.ScriptTarget.Latest, true);
  const visit = (node: ts.Node): boolean =>
    (isPlainRetry(node) && WRITING_HTTP_CALL.test(enclosingStatement(node).getText(file))) ||
    ts.forEachChild(node, visit) === true;
  return visit(file);
};

describe('writing requests are not repeated blindly', () => {
  const files = SCANNED_ROOTS.flatMap((root) => collectProductionFiles(join(UI_ROOT, root)));

  describe('rule', () => {
    it('flags a plain retry on PUT, DELETE, PATCH and POST, also across line breaks and inside defer', () => {
      // Arrange / Act / Assert
      expect(hasPlainRetryOnWrite('return this.http.put<X>(url, value).pipe(retry(3));')).toBe(true);
      expect(hasPlainRetryOnWrite('return this.http\n  .delete(url)\n  .pipe(retry(1));')).toBe(true);
      expect(hasPlainRetryOnWrite('return this.http.patch(url, {}).pipe(retry(RETRY_COUNT));')).toBe(true);
      expect(hasPlainRetryOnWrite('return defer(() => this.http\n  .post<X>(url, value)\n  .pipe(retry(3), map(toModel)));')).toBe(true);
    });

    it('flags a retry placed outside the call it repeats', () => {
      // Arrange / Act / Assert
      expect(hasPlainRetryOnWrite('return defer(() => this.http.post(url, value)).pipe(retry(3));')).toBe(true);
      expect(hasPlainRetryOnWrite('return defer(() => {\n  const body = wire(value);\n  return this.http.put(url, body);\n}).pipe(retry(3));')).toBe(true);
      expect(hasPlainRetryOnWrite('return of(1).pipe(switchMap(() => this.http.post(url, value)), retry(3));')).toBe(true);
      expect(hasPlainRetryOnWrite("return this.http.request('POST', url).pipe(rx.retry<X>(3));")).toBe(true);
    });

    it('accepts the transient retry, a write without retry, a tailored retry and a plain retry on GET', () => {
      // Arrange / Act / Assert
      expect(hasPlainRetryOnWrite('return this.http.put<X>(url, value).pipe(retryTransientHttpErrors());')).toBe(false);
      expect(hasPlainRetryOnWrite('return this.http.post<X>(url, value);')).toBe(false);
      expect(hasPlainRetryOnWrite('return this.http.post(url, {}).pipe(retry({ count: 3, delay: skipConflict }));')).toBe(false);
      expect(hasPlainRetryOnWrite('return this.http.get<X>(url).pipe(retry(3));')).toBe(false);
    });

    it('does not carry a retry over from the next statement', () => {
      // Arrange / Act / Assert
      expect(hasPlainRetryOnWrite('this.http.post(url, value);\nreturn this.http.get<X>(url).pipe(retry(3));')).toBe(false);
    });
  });

  it('scans the app and the plugin projects', () => {
    // Assert
    expect(files.length).toBeGreaterThan(MIN_EXPECTED_FILES);
    expect(files.some((file) => toPosix(relative(UI_ROOT, file)).startsWith('projects/'))).toBe(true);
  });

  it('never puts a plain retry on a writing request', () => {
    // Act
    const offenders = files
      .map((file) => toPosix(relative(UI_ROOT, file)))
      .filter((file) => !ALLOWED_FILES.includes(file))
      .filter((file) => hasPlainRetryOnWrite(readFileSync(join(UI_ROOT, file), 'utf8')))
      .sort();

    // Assert
    expect(offenders, RULE).toEqual([]);
  });

  it('keeps the allowlist empty', () => {
    // Assert
    expect(ALLOWED_FILES, 'Fix the file instead of listing it.').toEqual([]);
  });
});
