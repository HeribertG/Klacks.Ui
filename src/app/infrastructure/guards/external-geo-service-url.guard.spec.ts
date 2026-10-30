// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Guards that the browser never talks to a public geo service directly: no production .ts/.html file in
 * Klacks.Ui (src and projects) may name a Nominatim, OSRM, OpenRouteService or public tile host - geocoding
 * and routing go through the backend proxy and tiles come from the configured source. The external map
 * websites a user opens on purpose (OpenStreetMap, Google Street View) may only be named in
 * external-map-link.constants.ts, so hiding them in NoOutbound mode stays in one place. Specs are not
 * scanned because they assert on these hosts by name.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, relative, resolve, sep } from 'path';
import { BUILD_OUTPUT_FOLDERS, collectFiles } from 'src/app/source-files.testing';

const UI_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const SCAN_ROOTS = ['src', 'projects'];
const SCANNED_EXTENSIONS = ['.ts', '.html'];
const EXCLUDED_SUFFIX = '.spec.ts';
const MINIMUM_SCANNED_FILES = 1000;

const FORBIDDEN_HOSTS = [
  'nominatim.openstreetmap.org',
  'router.project-osrm.org',
  'api.openrouteservice.org',
  'api.heigit.org',
  'tile.openstreetmap.org',
  'tile.openstreetmap.de',
  'basemaps.cartocdn.com',
  'opentopomap.org',
];

const EXTERNAL_LINK_HOSTS = ['www.openstreetmap.org', 'google.com/maps'];
const EXTERNAL_LINK_ALLOWLIST = ['src/app/domain/constants/external-map-link.constants.ts'];

const isScanned = (path: string): boolean =>
  SCANNED_EXTENSIONS.some((extension) => path.endsWith(extension)) && !path.endsWith(EXCLUDED_SUFFIX);

const toRepoPath = (path: string): string => relative(UI_ROOT, path).split(sep).join('/');

describe('external geo service url guard', () => {
  const files = SCAN_ROOTS.flatMap((root) => collectFiles(join(UI_ROOT, root), isScanned, BUILD_OUTPUT_FOLDERS));
  const contents = new Map(files.map((file) => [toRepoPath(file), readFileSync(file, 'utf8').toLowerCase()]));

  it('scans the whole UI source tree', () => {
    expect(contents.size).toBeGreaterThan(MINIMUM_SCANNED_FILES);
  });

  it('names no public geocoding, routing or tile host in production code', () => {
    const violations = [...contents.entries()].flatMap(([path, content]) =>
      FORBIDDEN_HOSTS.filter((host) => content.includes(host)).map((host) => `${path}: ${host}`),
    );

    expect(violations).toEqual([]);
  });

  it('names external map websites only in the external map link constants', () => {
    const violations = [...contents.entries()]
      .filter(([path]) => !EXTERNAL_LINK_ALLOWLIST.includes(path))
      .flatMap(([path, content]) =>
        EXTERNAL_LINK_HOSTS.filter((host) => content.includes(host)).map((host) => `${path}: ${host}`),
      );

    expect(violations).toEqual([]);
  });

  it('keeps the allowlist in step with the source', () => {
    EXTERNAL_LINK_ALLOWLIST.forEach((path) => {
      const content = contents.get(path);
      expect(content, path).toBeDefined();
      expect(EXTERNAL_LINK_HOSTS.some((host) => content!.includes(host)), path).toBe(true);
    });
  });
});
