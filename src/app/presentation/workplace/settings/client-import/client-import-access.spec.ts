// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Pins the access rule of the employee import: it is admin only. The route demands the Admin role
 * through permissionGuard (not a floor-level right such as CanCreateClients), Klacksy's page key says
 * the same, the Settings card that opens the import is gated by isAdmin in the template, and the employee
 * list no longer offers the import.
 */

import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { Route } from '@angular/router';
import { routes } from 'src/app/app-routing.module';
import { permissionGuard } from 'src/app/presentation/auth/permission.guard';
import { ROUTE_DATA_REQUIRED_PERMISSION } from 'src/app/presentation/auth/route-data.constants';
import { ROLE_ADMIN } from 'src/app/domain/constants/permissions.constants';
import { KLACKSY_PAGE_KEYS } from 'src/app/domain/constants/klacksy-page-keys';
import { CLIENT_IMPORT_ROUTE } from 'src/app/domain/constants/client-import.constants';

const HERE = dirname(fileURLToPath(import.meta.url));
const LIST_TEMPLATE = resolve(
  HERE,
  '../../address/all-address/all-address-list/all-address-list.component.html',
);
const SETTINGS_TEMPLATE = resolve(HERE, '../settings-home/settings-home.component.html');
const IMPORT_ROUTE_PATH = 'settings/client-import';
const IMPORT_CARD_SELECTOR = '<app-client-import-card';
const LEGACY_LIST_BUTTON_ID = 'import-clients-button';
const WORKPLACE_PATH = 'workplace';

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

describe('client import access', () => {
  it('guards the import route with the permission guard and the Admin role', () => {
    const route = findRoute(routes, IMPORT_ROUTE_PATH);

    expect(route).toBeDefined();
    expect(route?.canActivate).toContain(permissionGuard);
    expect(route?.data?.[ROUTE_DATA_REQUIRED_PERMISSION]).toBe(ROLE_ADMIN);
  });

  it('matches the route the UI navigates to', () => {
    expect(CLIENT_IMPORT_ROUTE).toBe(`/${WORKPLACE_PATH}/${IMPORT_ROUTE_PATH}`);
  });

  it('requires the Admin role for the Klacksy page key of the import', () => {
    const entry = KLACKSY_PAGE_KEYS.find((key) => key.route === CLIENT_IMPORT_ROUTE);

    expect(entry?.requiredPermission).toBe(ROLE_ADMIN);
  });

  it('shows the import card in the settings only to admins', () => {
    const template = readFileSync(SETTINGS_TEMPLATE, 'utf8');
    const card = template.indexOf(IMPORT_CARD_SELECTOR);
    const gate = template.lastIndexOf('@if (', card);

    expect(card).toBeGreaterThan(-1);
    expect(template.slice(gate, template.indexOf(')', gate) + 1)).toBe('@if (authorizationService.isAdmin)');
  });

  it('no longer offers the import in the employee list', () => {
    const template = readFileSync(LIST_TEMPLATE, 'utf8');

    expect(template).not.toContain(LEGACY_LIST_BUTTON_ID);
  });
});
