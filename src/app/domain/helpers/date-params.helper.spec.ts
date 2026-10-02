// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { LocaleDataLoaderService } from 'src/app/application/services/locale-data-loader.service';
import { formatDateParams, hasDateParams } from 'src/app/domain/helpers/date-params.helper';
import { CALENDAR_TEST_ZONES, useTimeZone } from 'src/app/shared/testing/time-zone.testing';

const EXPIRING_SOON_PARAMS = { qualificationId: 'q-1', validUntil: '2026-12-31' };
const ARABIC_INDIC_DIGITS = /[٠-٩]/;

describe('formatDateParams', () => {
  beforeEach(async () => {
    TestBed.configureTestingModule({});
    const loader = TestBed.inject(LocaleDataLoaderService);
    await Promise.all(['de', 'en', 'ja', 'th', 'ar'].map((code) => loader.ensureLoaded(code)));
  });

  it.each([
    ['de', '31.12.2026'],
    ['en', '12/31/2026'],
    ['ja', '2026/12/31'],
    ['th', '31/12/2026'],
  ])('formats the qualification expiry in %s', (locale, expected) => {
    expect(formatDateParams(EXPIRING_SOON_PARAMS, locale)).toEqual({
      qualificationId: 'q-1',
      validUntil: expected,
    });
  });

  it('keeps Latin digits and a Gregorian year for arabic', () => {
    const formatted = formatDateParams(EXPIRING_SOON_PARAMS, 'ar')['validUntil'];

    expect(formatted).toMatch(/2026/);
    expect(formatted).toMatch(/31/);
    expect(formatted).not.toMatch(ARABIC_INDIC_DIGITS);
  });

  it('formats the compensatory-rest dates', () => {
    expect(
      formatDateParams({ shortfallHours: '2.5', triggerDate: '2026-03-01', dueDate: '2026-03-15' }, 'de'),
    ).toEqual({ shortfallHours: '2.5', triggerDate: '01.03.2026', dueDate: '15.03.2026' });
  });

  it('formats the season boundaries as a day and month', () => {
    expect(
      formatDateParams({ seasonFrom: '03-01', seasonTo: '10-31', groupTag: 'Pool' }, 'de'),
    ).toEqual({ seasonFrom: '1. März', seasonTo: '31. Oktober', groupTag: 'Pool' });
  });

  it('leaves date-looking values under other parameter names alone', () => {
    const params = { from: '2026-12-31', note: '2026-12-31', date: '2026-12-31' };

    expect(formatDateParams(params, 'de')).toEqual(params);
  });

  it('keeps an unparsable value as the backend sent it', () => {
    expect(formatDateParams({ validUntil: 'soon', seasonFrom: '2026-03-01' }, 'de')).toEqual({
      validUntil: 'soon',
      seasonFrom: '2026-03-01',
    });
  });

  it('does not touch an already formatted value when applied twice', () => {
    const once = formatDateParams(EXPIRING_SOON_PARAMS, 'de');

    expect(formatDateParams(once, 'de')).toEqual(once);
  });

  it('does not mutate its input', () => {
    const params = { ...EXPIRING_SOON_PARAMS };

    formatDateParams(params, 'de');

    expect(params).toEqual(EXPIRING_SOON_PARAMS);
  });

  it('returns an empty object for missing parameters', () => {
    expect(formatDateParams(undefined, 'de')).toEqual({});
    expect(formatDateParams(null, 'de')).toEqual({});
  });

  describe.each(CALENDAR_TEST_ZONES)('in browser zone %s', (zone) => {
    useTimeZone(zone);

    it.each(['2026-12-31', '2026-12-31T00:00:00Z', '2026-12-31T00:00:00'])(
      'keeps the 31st for the wire value %s',
      (wire) => {
        expect(formatDateParams({ validUntil: wire }, 'de')['validUntil']).toBe('31.12.2026');
      },
    );

    it('keeps the season day', () => {
      expect(formatDateParams({ seasonFrom: '03-01' }, 'de')['seasonFrom']).toBe('1. März');
    });
  });
});

describe('hasDateParams', () => {
  it('detects every known date parameter name', () => {
    for (const key of ['validUntil', 'triggerDate', 'dueDate', 'seasonFrom', 'seasonTo']) {
      expect(hasDateParams({ [key]: 'x' })).toBe(true);
    }
  });

  it('is false for other parameters and missing input', () => {
    expect(hasDateParams({ hours: '11', date: '2026-12-31' })).toBe(false);
    expect(hasDateParams(undefined)).toBe(false);
    expect(hasDateParams(null)).toBe(false);
  });
});
