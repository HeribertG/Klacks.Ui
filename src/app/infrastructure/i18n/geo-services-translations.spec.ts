// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Guards the geo services texts (map/search/routing notices, route PDF hints, admin status card): every
 * 'geoServices.' key the code uses exists, non-empty, in all four core languages, the core languages carry
 * the same key set, and the removed tile-provider texts of the old map style select stay gone.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { GEO_SERVICE_NOTICE_KEYS } from 'src/app/domain/constants/geo-service-notice.constants';
import { GEO_SERVICES_STATUS_KEYS } from 'src/app/presentation/workplace/settings/geo-services-status/geo-services-status.component';

const CORE_LANGUAGES = ['de', 'en', 'fr', 'it'] as const;
const REFERENCE_LANGUAGE = 'en';
const KEY_PREFIX = 'geoServices.';
const REMOVED_KEY_PREFIX = 'dashboard.locations.tile.';
const REMOVED_MAP_STYLE_KEY = 'dashboard.locations.mapStyle';
const I18N_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../assets/i18n');

const REASONS = ['DisabledByOperator', 'NoOutboundTraffic', 'PublicHostBlocked', 'InvalidConfiguration'];

const KEYS_USED_IN_CODE: readonly string[] = [
  ...Object.values(GEO_SERVICE_NOTICE_KEYS),
  ...Object.values(GEO_SERVICES_STATUS_KEYS),
  ...REASONS.map((reason) => `geoServices.reason.${reason}`),
  'geoServices.search.unavailable',
  'geoServices.routePdf.tilesDisabled',
  'geoServices.routePdf.tilesFailed',
  'geoServices.routePdf.mapFailed',
];

const load = (language: string): Record<string, string> =>
  JSON.parse(readFileSync(resolve(I18N_DIR, `${language}.json`), 'utf8'));

const geoKeysOf = (translations: Record<string, string>): string[] =>
  Object.keys(translations)
    .filter((key) => key.startsWith(KEY_PREFIX))
    .sort();

describe('geo services translations', () => {
  const byLanguage = new Map(CORE_LANGUAGES.map((language) => [language, load(language)]));

  it.each(CORE_LANGUAGES)('translates every geo services key used in code in %s', (language) => {
    const translations = byLanguage.get(language)!;

    KEYS_USED_IN_CODE.forEach((key) => {
      expect(translations[key], `${language}: ${key}`).toBeTruthy();
      expect(translations[key]?.trim(), `${language}: ${key}`).not.toBe('');
    });
  });

  it.each(CORE_LANGUAGES)('has the same geo services keys in %s as in English', (language) => {
    expect(geoKeysOf(byLanguage.get(language)!)).toEqual(geoKeysOf(byLanguage.get(REFERENCE_LANGUAGE)!));
  });

  it.each(CORE_LANGUAGES)('no longer carries the removed map style texts in %s', (language) => {
    const keys = Object.keys(byLanguage.get(language)!);

    expect(keys.filter((key) => key.startsWith(REMOVED_KEY_PREFIX) || key === REMOVED_MAP_STYLE_KEY)).toEqual([]);
  });
});
