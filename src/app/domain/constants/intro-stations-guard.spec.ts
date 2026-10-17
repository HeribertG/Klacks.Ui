// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Guards the intro-tour catalog: every station demands exactly the right its route's permissionGuard
 * declares (so the rights filter never offers a page the guard rejects, nor hides one a click would
 * open), a feature flag matches the feature guard of the route, every "More" skill exists and points to
 * the station's page, and every text key exists in the four core languages. The explain skills are
 * checked against skill-seeds.json of the sibling Klacks.Api checkout when it is present; the UI-side
 * list PAGE_EXPLAIN_ROUTES is always checked.
 */

import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { Route } from '@angular/router';
import { routes } from '../../app-routing.module';
import { ROUTE_DATA_REQUIRED_PERMISSION } from '../../presentation/auth/route-data.constants';
import { INTRO_ADMIN_SETUP_HINT_KEY, INTRO_MORE_REQUEST_KEY, INTRO_STATIONS, ONBOARDING_NAV_ICON } from './onboarding-stations';
import { KLACKSY_PAGE_KEYS } from './klacksy-page-keys';
import { PAGE_EXPLAIN_ROUTES } from './page-explain-icons.constants';
import { PERMISSIONS, ROLE_ADMIN, ROLE_AUTHORISED } from './permissions.constants';

const WORKPLACE_ROUTE_PATH = 'workplace';
const WORKPLACE_ROUTE_PREFIX = '/workplace/';
const MAX_INTRO_STATIONS = 7;
const EXPLAIN_LEVEL_PARAM = 'level';
const EXPLAIN_LEVEL_ELEMENTS = 'elements';
const CORE_LANGUAGES = ['de', 'en', 'fr', 'it'] as const;
const SPEC_DIR = dirname(fileURLToPath(import.meta.url));
const I18N_DIR = resolve(SPEC_DIR, '../../../assets/i18n');
const SKILL_SEEDS_PATH = resolve(SPEC_DIR, '../../../../../Klacks.Api/Application/Skills/Definitions/skill-seeds.json');

const KNOWN_RIGHTS: ReadonlySet<string> = new Set<string>([...Object.values(PERMISSIONS), ROLE_ADMIN, ROLE_AUTHORISED]);

function workplaceRoute(stationRoute: string): Route | undefined {
  const workplace = routes.find((route) => route.path === WORKPLACE_ROUTE_PATH);
  const path = stationRoute.slice(WORKPLACE_ROUTE_PREFIX.length);
  return workplace?.children?.find((route) => route.path === path);
}

interface SeedSkill {
  name: string;
  parameters?: { name: string; enumValues?: string[] }[];
}

function loadSkills(): ReadonlyMap<string, SeedSkill> | null {
  if (!existsSync(SKILL_SEEDS_PATH)) {
    return null;
  }
  const seeds: { skills?: SeedSkill[] } = JSON.parse(readFileSync(SKILL_SEEDS_PATH, 'utf8'));
  return new Map((seeds.skills ?? []).map((skill) => [skill.name, skill]));
}

describe('INTRO_STATIONS guard', () => {
  const routedStations = INTRO_STATIONS.filter((station) => station.route);

  it('holds at most seven stations with unique ids', () => {
    expect(INTRO_STATIONS.length).toBeLessThanOrEqual(MAX_INTRO_STATIONS);
    expect(new Set(INTRO_STATIONS.map((station) => station.id)).size).toBe(INTRO_STATIONS.length);
  });

  it.each(routedStations.map((station) => [station.id, station] as const))(
    'station %s demands exactly the right of its route guard',
    (_id, station) => {
      const route = workplaceRoute(station.route!);
      expect(route, `route ${station.route} must exist`).toBeDefined();
      const guardRight = route!.data?.[ROUTE_DATA_REQUIRED_PERMISSION] as string | undefined;
      expect(station.permission).toBe(guardRight);
    },
  );

  it.each(routedStations.map((station) => [station.id, station] as const))(
    'station %s agrees with the Klacksy page-key of its route on right and feature',
    (_id, station) => {
      const pageKey = KLACKSY_PAGE_KEYS.find((entry) => entry.route === station.route);
      expect(pageKey, `page-key for ${station.route}`).toBeDefined();
      expect(station.permission ?? null).toBe(pageKey!.requiredPermission);
      expect(station.featureFlag).toBe(pageKey!.requiredFeature);
    },
  );

  it('names only known rights and main-nav icons', () => {
    const knownIcons = Object.values(ONBOARDING_NAV_ICON) as string[];
    for (const station of INTRO_STATIONS) {
      if (station.permission) {
        expect(KNOWN_RIGHTS.has(station.permission), station.id).toBe(true);
      }
      expect(knownIcons).toContain(station.navIconId);
    }
  });

  it('points every More skill at the page of its station', () => {
    for (const station of INTRO_STATIONS.filter((s) => s.explainSkill)) {
      expect(PAGE_EXPLAIN_ROUTES[station.explainSkill!], station.id).toBe(station.route);
      expect(station.pageNameKey, station.id).toBeTruthy();
    }
  });

  it('names only explain skills that exist in skill-seeds.json and offer level=elements (when the Api checkout is present)', () => {
    const skills = loadSkills();
    if (skills === null) {
      return;
    }
    for (const station of INTRO_STATIONS.filter((s) => s.explainSkill)) {
      const skill = skills.get(station.explainSkill!);
      expect(skill, station.explainSkill).toBeDefined();
      const level = skill!.parameters?.find((parameter) => parameter.name === EXPLAIN_LEVEL_PARAM);
      expect(level?.enumValues, station.explainSkill).toContain(EXPLAIN_LEVEL_ELEMENTS);
    }
  });

  it.each(CORE_LANGUAGES)('translates every intro station key in %s', (language) => {
    const translations: Record<string, string> = JSON.parse(readFileSync(resolve(I18N_DIR, `${language}.json`), 'utf8'));
    const keys = [
      INTRO_ADMIN_SETUP_HINT_KEY,
      INTRO_MORE_REQUEST_KEY,
      ...INTRO_STATIONS.flatMap((station) => [station.explainKey, station.pageNameKey].filter((key): key is string => !!key)),
    ];
    for (const key of keys) {
      expect(translations[key], `${language}: ${key}`).toBeTruthy();
    }
  });
});
