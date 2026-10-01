// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Decides the day/month order of the date columns currently mapped in the employee import, with the
 * same rule as the backend ClientImportDateFormatDetector (which only runs once, at parse time, over the
 * columns it detected itself): a first number above 12 proves day-month-year, a second number above 12
 * proves month-day-year, a four-digit first number (ISO, real xlsx date cells) is read the same in every
 * order and proves nothing. Contradicting or missing evidence is ambiguous and keeps the default
 * day-month-year, so the user must choose. Used to re-check the order when the user maps other columns
 * as dates.
 * @param values - Non-empty cell texts of all columns mapped as date (birthdate, entry date, exit date)
 */

import {
  CLIENT_IMPORT_AMBIGUOUS_DATE_FORMAT_DEFAULT,
} from 'src/app/domain/constants/client-import.constants';
import { ClientImportDateFormat } from 'src/app/domain/enums/client-import.enums';

const MAX_MONTH = 12;
const FOUR_DIGIT_YEAR_LENGTH = 4;
const DATE_PATTERN = /^\s*(\d{1,4})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{1,4})\.?(?:[ T]\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?)?\s*$/;

export interface ClientImportDateFormatDetection {
  format: ClientImportDateFormat;
  ambiguous: boolean;
}

export function detectClientImportDateFormat(values: Iterable<string>): ClientImportDateFormatDetection {
  let dayFirst = false;
  let monthFirst = false;
  let sawNonIso = false;

  for (const value of values) {
    const match = DATE_PATTERN.exec(value);
    if (!match || match[1].length === FOUR_DIGIT_YEAR_LENGTH) {
      continue;
    }

    sawNonIso = true;
    dayFirst ||= Number(match[1]) > MAX_MONTH;
    monthFirst ||= Number(match[2]) > MAX_MONTH;
  }

  if (!sawNonIso || dayFirst === monthFirst) {
    return { format: CLIENT_IMPORT_AMBIGUOUS_DATE_FORMAT_DEFAULT, ambiguous: sawNonIso };
  }

  return {
    format: monthFirst ? ClientImportDateFormat.MonthDayYear : ClientImportDateFormat.DayMonthYear,
    ambiguous: false,
  };
}
