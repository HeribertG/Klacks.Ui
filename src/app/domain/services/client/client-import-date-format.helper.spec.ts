// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { detectClientImportDateFormat } from './client-import-date-format.helper';
import { ClientImportDateFormat } from 'src/app/domain/enums/client-import.enums';

describe('detectClientImportDateFormat', () => {
  it('is unambiguous day-month-year without any date value', () => {
    expect(detectClientImportDateFormat([])).toEqual({ format: ClientImportDateFormat.DayMonthYear, ambiguous: false });
  });

  it('ignores ISO values because they read the same in every order', () => {
    expect(detectClientImportDateFormat(['1990-12-31', '1991-02-03'])).toEqual({
      format: ClientImportDateFormat.DayMonthYear,
      ambiguous: false,
    });
  });

  it('proves day-month-year by a first number above 12', () => {
    expect(detectClientImportDateFormat(['31.12.1990', '01.02.1991'])).toEqual({
      format: ClientImportDateFormat.DayMonthYear,
      ambiguous: false,
    });
  });

  it('proves month-day-year by a second number above 12', () => {
    expect(detectClientImportDateFormat(['12/31/1990', '01/02/1991'])).toEqual({
      format: ClientImportDateFormat.MonthDayYear,
      ambiguous: false,
    });
  });

  it('stays ambiguous without proof and defaults to day-month-year', () => {
    expect(detectClientImportDateFormat(['01.02.1990', '03.04.1991'])).toEqual({
      format: ClientImportDateFormat.DayMonthYear,
      ambiguous: true,
    });
  });

  it('stays ambiguous when the data contradicts itself', () => {
    expect(detectClientImportDateFormat(['31.12.1990', '12/31/1991'])).toEqual({
      format: ClientImportDateFormat.DayMonthYear,
      ambiguous: true,
    });
  });

  it('reads two-digit years, trailing dots and times like the server does', () => {
    expect(detectClientImportDateFormat(['13.02.90.'])).toEqual({
      format: ClientImportDateFormat.DayMonthYear,
      ambiguous: false,
    });
    expect(detectClientImportDateFormat(['02/13/1990 10:30:00'])).toEqual({
      format: ClientImportDateFormat.MonthDayYear,
      ambiguous: false,
    });
  });

  it('skips text that is not a date', () => {
    expect(detectClientImportDateFormat(['n/a', 'unknown'])).toEqual({
      format: ClientImportDateFormat.DayMonthYear,
      ambiguous: false,
    });
  });
});
