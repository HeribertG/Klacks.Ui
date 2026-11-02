// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { setCompanyTimeZone } from './calendar-date.helper';
import { hasServiceEnded } from './service-end.helper';
import { CALENDAR_TEST_ZONES, useTimeZone } from 'src/app/shared/testing/time-zone.testing';

const day = (): Date => new Date(2026, 10, 2);

describe('service-end.helper', () => {
  afterEach(() => setCompanyTimeZone(null));

  describe('rule table', () => {
    beforeEach(() => setCompanyTimeZone('UTC'));

    const at = (iso: string): Date => new Date(`${iso}:00Z`);

    it.each([
      ['08:00', '16:00', '2026-11-02T16:00', true],
      ['08:00', '16:00', '2026-11-02T15:59', false],
      ['08:00:00', '16:00:00', '2026-11-02T16:00', true],
      ['22:00', '06:00', '2026-11-02T23:59', false],
      ['22:00', '06:00', '2026-11-03T05:59', false],
      ['22:00', '06:00', '2026-11-03T06:00', true],
      ['07:00', '07:00', '2026-11-03T06:59', false],
      ['07:00', '07:00', '2026-11-03T07:00', true],
      ['22:00', '00:00', '2026-11-02T23:59', false],
      ['22:00', '00:00', '2026-11-03T00:00', true],
    ])('%s-%s at %s ends: %s', (start, end, now, expected) => {
      expect(hasServiceEnded(day(), start, end, at(now))).toBe(expected);
    });

    it('is false for a service of a later day', () => {
      expect(hasServiceEnded(new Date(2026, 10, 5), '08:00', '16:00', at('2026-11-02T23:00'))).toBe(false);
    });

    it('is true for a service of an earlier day', () => {
      expect(hasServiceEnded(new Date(2026, 9, 5), '08:00', '16:00', at('2026-11-02T00:01'))).toBe(true);
    });

    it('does not claim a service open when its times cannot be read', () => {
      expect(hasServiceEnded(day(), '', '', at('2026-11-02T00:01'))).toBe(true);
    });
  });

  describe('company zone, whatever zone the browser is in', () => {
    for (const browserZone of CALENDAR_TEST_ZONES) {
      describe(`browser in ${browserZone}`, () => {
        useTimeZone(browserZone);

        it('measures the end on the company clock', () => {
          setCompanyTimeZone('Asia/Tokyo');

          const instant = new Date('2026-11-02T07:30:00Z');

          expect(hasServiceEnded(day(), '08:00', '16:00', instant)).toBe(true);
        });

        it('keeps the service open while the company clock has not reached its end', () => {
          setCompanyTimeZone('America/Los_Angeles');

          const instant = new Date('2026-11-02T20:00:00Z');

          expect(hasServiceEnded(day(), '08:00', '16:00', instant)).toBe(false);
        });
      });
    }
  });
});
