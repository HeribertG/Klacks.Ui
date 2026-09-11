// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Spec-only helpers that run a describe block under a foreign browser time zone by switching
 * process.env.TZ in-process (ng test does not load a global TZ setup) and restoring it afterwards.
 * @param zone - IANA time zone id to activate for every test of the enclosing describe block
 */

export const CALENDAR_TEST_ZONES = [
  'Europe/Zurich',
  'America/New_York',
  'Asia/Kolkata',
  'Pacific/Auckland',
] as const;

export type CalendarTestZone = (typeof CALENDAR_TEST_ZONES)[number];

const JANUARY_OFFSET_MINUTES: Record<CalendarTestZone, number> = {
  'Europe/Zurich': -60,
  'America/New_York': 300,
  'Asia/Kolkata': -330,
  'Pacific/Auckland': -780,
};

const TZ_VARIABLE = 'TZ';
const PROBE_YEAR = 2026;
const PROBE_MONTH = 0;
const PROBE_DAY = 15;

export function useTimeZone(zone: CalendarTestZone): void {
  let restoreZone: string;

  beforeEach(() => {
    restoreZone = currentTimeZone();
    process.env[TZ_VARIABLE] = zone;
  });

  afterEach(() => {
    process.env[TZ_VARIABLE] = restoreZone;
  });
}

/**
 * Deleting process.env.TZ does not reset Node's cached zone (verified on Node 24), so a restore
 * must assign the previously active IANA zone explicitly instead of deleting the variable.
 */
export function currentTimeZone(): string {
  return process.env[TZ_VARIABLE] ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function activeJanuaryOffsetMinutes(): number {
  return new Date(PROBE_YEAR, PROBE_MONTH, PROBE_DAY).getTimezoneOffset();
}

export function expectedJanuaryOffsetMinutes(zone: CalendarTestZone): number {
  return JANUARY_OFFSET_MINUTES[zone];
}
