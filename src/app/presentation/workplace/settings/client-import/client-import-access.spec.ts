// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Pins the access rule of the employee import: it is admin only and has no route of its own. The Settings card that
 * hosts the import (drop zone, modal with the remaining steps, manual) is gated by isAdmin in the template; every
 * Klacksy marker of the import demands the Admin role explicitly, because the markers resolve to the settings route,
 * whose page key only asks for CanViewSettings. The employee list no longer offers the import.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { Route } from '@angular/router';
import { routes } from 'src/app/app-routing.module';
import { ROLE_ADMIN } from 'src/app/domain/constants/permissions.constants';
import { KLACKSY_PAGE_KEYS } from 'src/app/domain/constants/klacksy-page-keys';

const HERE = dirname(fileURLToPath(import.meta.url));
const LIST_TEMPLATE = resolve(
  HERE,
  '../../address/all-address/all-address-list/all-address-list.component.html',
);
const SETTINGS_TEMPLATE = resolve(HERE, '../settings-home/settings-home.component.html');
const IMPORT_TEMPLATE_DIRS = [HERE, resolve(HERE, '../client-import-card')];
const LEGACY_ROUTE_PATH = 'settings/client-import';
const LEGACY_PAGE_KEY = 'import-employees';
const IMPORT_CARD_SELECTOR = '<app-client-import-card';
const LEGACY_LIST_BUTTON_ID = 'import-clients-button';
const HTML_SUFFIX = '.html';
const MARKER_PATTERN = /<[a-z][^>]*data-klacksy-target="(client-import[^"]*)"[^>]*>/g;
const ADMIN_ATTRIBUTE = `data-klacksy-required-permission="${ROLE_ADMIN}"`;

function findRoute(candidates: Route[], path: string): Route | undefined {
  for (const candidate of candidates) {
    if (candidate.path === path) {
      return candidate;
    }
    const nested = findRoute(candidate.children ?? [], path);
    if (nested) {
      return nested;
    }
  }
  return undefined;
}

function templates(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const child = join(dir, entry);
    if (statSync(child).isDirectory()) {
      return templates(child);
    }
    return entry.endsWith(HTML_SUFFIX) ? [child] : [];
  });
}

function importMarkers(): { target: string; tag: string }[] {
  const sources = [...IMPORT_TEMPLATE_DIRS.flatMap(templates), SETTINGS_TEMPLATE];
  return sources.flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(MARKER_PATTERN)].map((match) => ({ target: match[1], tag: match[0] })),
  );
}

describe('client import access', () => {
  it('has no page route of its own any more', () => {
    expect(findRoute(routes, LEGACY_ROUTE_PATH)).toBeUndefined();
  });

  it('has no Klacksy page key of its own any more', () => {
    expect(KLACKSY_PAGE_KEYS.some((key) => key.pageKey === LEGACY_PAGE_KEY)).toBe(false);
  });

  it('shows the import card in the settings only to admins', () => {
    const template = readFileSync(SETTINGS_TEMPLATE, 'utf8');
    const card = template.indexOf(IMPORT_CARD_SELECTOR);
    const gate = template.lastIndexOf('@if (', card);

    expect(card).toBeGreaterThan(-1);
    expect(template.slice(gate, template.indexOf(')', gate) + 1)).toBe('@if (authorizationService.isAdmin)');
  });

  it('demands the Admin role on every Klacksy marker of the import', () => {
    const markers = importMarkers();

    expect(markers.map((marker) => marker.target)).toContain('client-import');
    expect(markers.map((marker) => marker.target)).toContain('client-import-commit');
    expect(markers.filter((marker) => !marker.tag.includes(ADMIN_ATTRIBUTE)).map((marker) => marker.target)).toEqual([]);
  });

  it('no longer offers the import in the employee list', () => {
    const template = readFileSync(LIST_TEMPLATE, 'utf8');

    expect(template).not.toContain(LEGACY_LIST_BUTTON_ID);
  });
});
