// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Guard for the cookie-only session: the access and refresh tokens live in HttpOnly cookies, so production code in
 * src/app and projects/ never reads an access token from storage, never sets an Authorization header, never hands a
 * token to a SignalR hub or puts one into a URL, and builds every hub connection with the shared cookie options.
 * Only SessionStore may touch the key that older builds stored the access token under (to migrate and drop it), and
 * storage-keys.ts declares it. Specs and testing helpers are not scanned.
 */

import { readFileSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import { BUILD_OUTPUT_FOLDERS, collectFiles } from './source-files.testing';

const APP_ROOT = dirname(fileURLToPath(import.meta.url));
const UI_ROOT = resolve(APP_ROOT, '..', '..');
const SCANNED_ROOTS: readonly string[] = ['src/app', 'projects'];
const MIN_EXPECTED_FILES = 1000;
const LEGACY_KEY_OWNERS: readonly string[] = [
  'src/app/domain/constants/storage-keys.ts',
  'src/app/infrastructure/storage/session-store.service.ts',
];
const HUB_BUILDER = 'HubConnectionBuilder';
const HUB_COOKIE_OPTIONS = 'HUB_SESSION_COOKIE_OPTIONS';
const HUB_COOKIE_OPTIONS_SOURCE = 'src/app/infrastructure/signalr/signalr-hub-request.constants.ts';

const LEGACY_KEY_PATTERNS: readonly RegExp[] = [/LEGACY_ACCESS_TOKEN/, /['"`]JWT_TOKEN['"`]/];
const FORBIDDEN_PATTERNS: readonly { name: string; pattern: RegExp }[] = [
  { name: 'Authorization header', pattern: /['"`]Authorization['"`]\s*[:,)]|\bAuthorization\s*:/ },
  { name: 'Bearer scheme', pattern: /['"`]Bearer\s/ },
  { name: 'SignalR access token factory', pattern: /accessTokenFactory/ },
  { name: 'access token in a URL', pattern: /access_token=/ },
];

const toPosix = (value: string): string => value.split('\\').join('/');

const isProductionTypeScript = (path: string): boolean =>
  path.endsWith('.ts') && !path.endsWith('.spec.ts') && !path.endsWith('.testing.ts') && !path.endsWith('.d.ts') &&
  !toPosix(path).includes('/testing/');

function findForbidden(source: string): string[] {
  return FORBIDDEN_PATTERNS.filter(({ pattern }) => pattern.test(source)).map(({ name }) => name);
}

describe('cookie-only session guard', () => {
  const files = SCANNED_ROOTS.flatMap((root) =>
    collectFiles(join(UI_ROOT, root), isProductionTypeScript, BUILD_OUTPUT_FOLDERS)
  ).map((file) => ({ path: toPosix(relative(UI_ROOT, file)), source: readFileSync(file, 'utf8') }));

  describe('rule', () => {
    it('flags a bearer header, a token factory and a token in a URL', () => {
      expect(findForbidden("headers: { Authorization: `Bearer ${token}` }")).toEqual(['Authorization header', 'Bearer scheme']);
      expect(findForbidden("headers.set('Authorization', value)")).toEqual(['Authorization header']);
      expect(findForbidden('accessTokenFactory: () => token')).toEqual(['SignalR access token factory']);
      expect(findForbidden('new WebSocket(`${url}?access_token=${token}`)')).toEqual(['access token in a URL']);
    });

    it('does not flag the authorization service or permission wording', () => {
      expect(findForbidden("import { AuthorizationService } from './authorization.service';")).toEqual([]);
      expect(findForbidden('this.authorizationService.store(permissions);')).toEqual([]);
    });
  });

  it('scans the app and the plugin projects', () => {
    expect(files.length).toBeGreaterThan(MIN_EXPECTED_FILES);
    expect(files.some((file) => file.path.startsWith('projects/'))).toBe(true);
  });

  it('touches the legacy access-token key only in SessionStore and the key declaration', () => {
    const offenders = files
      .filter((file) => !LEGACY_KEY_OWNERS.includes(file.path))
      .filter((file) => LEGACY_KEY_PATTERNS.some((pattern) => pattern.test(file.source)))
      .map((file) => file.path);

    expect(offenders).toEqual([]);
  });

  it('never sets an Authorization header, a token factory or a token in a URL', () => {
    const offenders = files
      .map((file) => ({ path: file.path, found: findForbidden(file.source) }))
      .filter((file) => file.found.length > 0)
      .map((file) => `${file.path}: ${file.found.join(', ')}`);

    expect(offenders).toEqual([]);
  });

  it('builds every hub connection with the shared cookie options', () => {
    const builders = files.filter((file) => file.source.includes(`new signalR.${HUB_BUILDER}`));
    const offenders = builders.filter((file) => !file.source.includes(HUB_COOKIE_OPTIONS)).map((file) => file.path);

    expect(builders.length).toBeGreaterThanOrEqual(5);
    expect(offenders).toEqual([]);
    expect(files.some((file) => file.path === HUB_COOKIE_OPTIONS_SOURCE)).toBe(true);
  });
});
