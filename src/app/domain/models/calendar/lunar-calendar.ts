// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Converts Chinese lunisolar calendar dates to Gregorian using a lookup table (2020-2050).
 * Data sourced from astronomical calculations (Hong Kong Observatory reference).
 * @param MIN_YEAR - Earliest supported Gregorian year (2020)
 * @param MAX_YEAR - Latest supported Gregorian year (2050)
 */

const MIN_YEAR = 2020;
const MAX_YEAR = 2050;

const LUNAR_NEW_YEAR_DATES: Record<number, [number, number]> = {
  2020: [1, 25],
  2021: [2, 12],
  2022: [2, 1],
  2023: [1, 22],
  2024: [2, 10],
  2025: [1, 29],
  2026: [2, 17],
  2027: [2, 6],
  2028: [1, 26],
  2029: [2, 13],
  2030: [2, 3],
  2031: [1, 23],
  2032: [2, 11],
  2033: [1, 31],
  2034: [2, 19],
  2035: [2, 8],
  2036: [1, 28],
  2037: [2, 15],
  2038: [2, 4],
  2039: [1, 24],
  2040: [2, 12],
  2041: [2, 1],
  2042: [1, 22],
  2043: [2, 10],
  2044: [1, 30],
  2045: [2, 17],
  2046: [2, 6],
  2047: [1, 26],
  2048: [2, 14],
  2049: [2, 2],
  2050: [1, 23],
};

const MONTH_LENGTHS: Record<number, number[]> = {
  2020: [29, 30, 30, 30, 29, 29, 30, 29, 30, 29, 30, 30],
  2021: [29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30],
  2022: [29, 30, 29, 29, 30, 29, 30, 30, 29, 30, 30, 29],
  2023: [29, 30, 29, 30, 29, 30, 29, 29, 30, 29, 30, 30],
  2024: [29, 30, 29, 29, 30, 29, 30, 29, 30, 29, 30, 30],
  2025: [30, 29, 30, 29, 30, 30, 29, 30, 29, 30, 29, 29],
  2026: [30, 29, 30, 30, 29, 30, 29, 30, 29, 30, 29, 30],
  2027: [29, 30, 29, 30, 29, 30, 30, 29, 30, 29, 30, 29],
  2028: [30, 29, 29, 30, 29, 30, 30, 29, 30, 30, 29, 30],
  2029: [29, 30, 29, 29, 30, 29, 30, 29, 30, 30, 30, 29],
  2030: [30, 29, 30, 29, 29, 30, 29, 30, 29, 30, 30, 30],
  2031: [29, 30, 29, 30, 29, 29, 30, 29, 29, 30, 30, 30],
  2032: [29, 30, 30, 29, 30, 29, 29, 30, 29, 30, 29, 30],
  2033: [29, 30, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29],
  2034: [30, 29, 30, 30, 29, 30, 29, 30, 29, 30, 29, 29],
  2035: [30, 29, 30, 30, 29, 30, 30, 29, 30, 29, 30, 29],
  2036: [29, 30, 29, 30, 29, 30, 30, 29, 30, 30, 29, 30],
  2037: [29, 29, 30, 29, 30, 29, 30, 29, 30, 30, 30, 29],
  2038: [30, 29, 29, 30, 29, 29, 30, 29, 30, 30, 30, 29],
  2039: [30, 30, 29, 29, 30, 29, 29, 30, 29, 30, 30, 30],
  2040: [29, 30, 29, 30, 29, 30, 29, 29, 30, 29, 30, 30],
  2041: [29, 30, 30, 29, 30, 29, 30, 29, 29, 30, 29, 30],
  2042: [29, 30, 30, 30, 29, 30, 29, 30, 29, 29, 30, 29],
  2043: [30, 29, 30, 30, 29, 30, 30, 29, 30, 29, 29, 30],
  2044: [29, 30, 29, 30, 29, 30, 30, 29, 30, 29, 30, 29],
  2045: [30, 29, 29, 30, 29, 30, 29, 30, 30, 29, 30, 30],
  2046: [29, 30, 29, 29, 30, 29, 29, 30, 30, 29, 30, 30],
  2047: [30, 29, 30, 29, 29, 30, 29, 29, 30, 30, 29, 30],
  2048: [30, 30, 29, 30, 29, 29, 30, 29, 29, 30, 30, 29],
  2049: [30, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 29],
  2050: [30, 29, 30, 30, 29, 30, 29, 30, 29, 30, 29, 30],
};

export function getGregorianDateForLunarInYear(
  lunarDay: number,
  lunarMonth: number,
  gregorianYear: number
): Date {
  if (gregorianYear < MIN_YEAR || gregorianYear > MAX_YEAR) {
    throw new Error(
      `Chinese lunar calendar lookup is only available for years ${MIN_YEAR}-${MAX_YEAR}. Requested: ${gregorianYear}`
    );
  }

  const nyEntry = LUNAR_NEW_YEAR_DATES[gregorianYear];
  if (!nyEntry) {
    throw new Error(`No lunar data for year ${gregorianYear}`);
  }

  const months = MONTH_LENGTHS[gregorianYear];
  if (!months) {
    throw new Error(`No month data for year ${gregorianYear}`);
  }

  let daysToAdd = 0;

  for (let m = 1; m < lunarMonth; m++) {
    if (m - 1 >= months.length) {
      throw new Error(
        `Lunar month ${lunarMonth} exceeds available months for year ${gregorianYear}`
      );
    }
    daysToAdd += months[m - 1];
  }

  daysToAdd += lunarDay - 1;

  const newYearDate = new Date(gregorianYear, nyEntry[0] - 1, nyEntry[1]);
  const result = new Date(newYearDate);
  result.setDate(result.getDate() + daysToAdd);
  return result;
}
