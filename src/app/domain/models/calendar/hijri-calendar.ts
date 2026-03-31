// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Converts Hijri (Islamic) calendar dates to Gregorian using the Tabular Islamic Calendar algorithm.
 * Accuracy: ±1-2 days vs. actual observed dates (sufficient for business planning).
 */

const HIJRI_EPOCH_JDN = 1948440;
const DAYS_IN_HIJRI_CYCLE = 10631;
const YEARS_IN_CYCLE = 30;
const LEAP_YEARS_IN_CYCLE = [2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29];

function isHijriLeapYear(yearInCycle: number): boolean {
  return LEAP_YEARS_IN_CYCLE.includes(yearInCycle);
}

function daysInHijriYear(yearInCycle: number): number {
  return isHijriLeapYear(yearInCycle) ? 355 : 354;
}

function daysInHijriMonth(hijriYear: number, month: number): number {
  if (
    month === 12 &&
    isHijriLeapYear(((hijriYear - 1) % YEARS_IN_CYCLE) + 1)
  ) {
    return 30;
  }
  return month % 2 === 1 ? 30 : 29;
}

function hijriToJdn(year: number, month: number, day: number): number {
  const adjustedYear = year - 1;
  const fullCycles = Math.floor(adjustedYear / YEARS_IN_CYCLE);
  const remainingYears = adjustedYear % YEARS_IN_CYCLE;

  let dayCount = fullCycles * DAYS_IN_HIJRI_CYCLE;

  for (let i = 1; i <= remainingYears; i++) {
    dayCount += daysInHijriYear(i);
  }

  for (let m = 1; m < month; m++) {
    dayCount += m % 2 === 1 ? 30 : 29;
  }

  dayCount += day;

  return dayCount + HIJRI_EPOCH_JDN - 1;
}

function jdnToGregorian(jdn: number): Date {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);

  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);

  return new Date(year, month - 1, day);
}

function gregorianToJdn(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;

  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

function jdnToHijri(jdn: number): {
  year: number;
  month: number;
  day: number;
} {
  let daysSinceEpoch = jdn - HIJRI_EPOCH_JDN + 1;

  const fullCycles = Math.floor((daysSinceEpoch - 1) / DAYS_IN_HIJRI_CYCLE);
  daysSinceEpoch -= fullCycles * DAYS_IN_HIJRI_CYCLE;

  let year = fullCycles * YEARS_IN_CYCLE + 1;

  while (
    daysSinceEpoch >
    daysInHijriYear(((year - 1) % YEARS_IN_CYCLE) + 1)
  ) {
    daysSinceEpoch -= daysInHijriYear(((year - 1) % YEARS_IN_CYCLE) + 1);
    year++;
  }

  let month = 1;
  while (true) {
    let daysInCurrentMonth = month % 2 === 1 ? 30 : 29;
    if (
      month === 12 &&
      isHijriLeapYear(((year - 1) % YEARS_IN_CYCLE) + 1)
    ) {
      daysInCurrentMonth = 30;
    }

    if (daysSinceEpoch <= daysInCurrentMonth) {
      break;
    }

    daysSinceEpoch -= daysInCurrentMonth;
    month++;
  }

  return { year, month, day: daysSinceEpoch };
}

export function hijriToGregorian(
  hijriYear: number,
  hijriMonth: number,
  hijriDay: number
): Date {
  const jdn = hijriToJdn(hijriYear, hijriMonth, hijriDay);
  return jdnToGregorian(jdn);
}

export function getGregorianDateForHijriInYear(
  hijriDay: number,
  hijriMonth: number,
  gregorianYear: number
): Date {
  const jan1Jdn = gregorianToJdn(gregorianYear, 1, 1);
  const { year: hijriYearStart } = jdnToHijri(jan1Jdn);

  for (
    let candidateYear = hijriYearStart;
    candidateYear <= hijriYearStart + 2;
    candidateYear++
  ) {
    const dayInMonth = daysInHijriMonth(candidateYear, hijriMonth);
    const clampedDay = Math.min(hijriDay, dayInMonth);
    const candidate = hijriToGregorian(candidateYear, hijriMonth, clampedDay);

    if (candidate.getFullYear() === gregorianYear) {
      return candidate;
    }
  }

  return hijriToGregorian(hijriYearStart + 1, hijriMonth, hijriDay);
}
