// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Maps .NET DayOfWeek name strings (as stored in backend settings) to the
 * JS Date.getDay() numbering (0 = Sunday .. 6 = Saturday), and back.
 */
export const DAY_NAME_TO_JS_DAY: Readonly<Record<string, number>> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const MONDAY_FIRST_ORDER = [1, 2, 3, 4, 5, 6, 0];

/**
 * Sorts DayOfWeek name strings into canonical Monday-first weekly order, so repeated
 * load/save round-trips never produce a false "dirty" state purely from array-order
 * differences.
 * @param dayNames - DayOfWeek names to sort (e.g. ['Sunday', 'Friday'])
 */
export function sortDayNamesMondayFirst(dayNames: string[]): string[] {
  return [...dayNames].sort(
    (a, b) => MONDAY_FIRST_ORDER.indexOf(DAY_NAME_TO_JS_DAY[a]) - MONDAY_FIRST_ORDER.indexOf(DAY_NAME_TO_JS_DAY[b])
  );
}
