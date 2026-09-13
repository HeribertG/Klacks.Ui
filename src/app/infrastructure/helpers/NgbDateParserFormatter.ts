// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Parses and formats the text of every ngb datepicker input in the locale layout of the active
 * application language instead of the Swiss dd.MM.yyyy, so an English user may type 12/31/2026 and
 * a Japanese user 2026/12/31. Field order and separators are derived from the same widened CLDR
 * short pattern the rest of the app formats with, so parse and format are symmetric by construction.
 * Any run of non-digits is accepted as a separator, which also covers the bidi marks inside the
 * Arabic pattern. The unambiguous ISO layout yyyy-MM-dd is accepted in every language before the
 * locale pattern is consulted, so a value pasted from the backend or a spreadsheet always lands on
 * the right day. A two-digit year is rejected on purpose (returns null) rather than expanded: the
 * old expansion turned 31.12.26 into the year 26, and guessing a century silently writes wrong data.
 * Digits in the locale order are trusted as typed: 31.12.2026 under English is read as month 31 and
 * yields a struct the datepicker rejects, rather than being silently swapped to 12/31.
 * @param value - Text typed into the datepicker input
 * @param date - Date struct rendered back into the input; incomplete structs render as an empty string
 */

import { Injectable, inject } from '@angular/core';
import {
  NgbDateStruct,
  NgbDateParserFormatter,
} from '@ng-bootstrap/ng-bootstrap';
import { LocaleService } from '../../application/services/locale.service';
import {
  formatCalendarDate,
  localeNumericDatePattern,
} from '../../shared/helpers/locale-date-format.helper';
import { companyToday } from '../../shared/helpers/calendar-date.helper';
import { isNumeric } from '../../shared/helpers/number.helper';

type DateField = 'day' | 'month' | 'year';

const FIELD_BY_PATTERN_TOKEN: Readonly<Record<string, DateField>> = {
  d: 'day',
  M: 'month',
  y: 'year',
};

const DIGIT_GROUPS = /\d+/g;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const YEAR_DIGITS = 4;
const FIRST_MONTH = 1;
const NO_DATE_TEXT = '';
const DAY_ONLY_PART_COUNT = 1;
const DAY_AND_MONTH_PART_COUNT = 2;
const FULL_DATE_PART_COUNT = 3;

@Injectable()
export class NgbDateCustomParserFormatter extends NgbDateParserFormatter {
  private localeService = inject(LocaleService);

  parse(value: string): NgbDateStruct | null {
    if (!value) {
      return null;
    }

    const iso = ISO_DATE.exec(value.trim());
    if (iso) {
      return { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) };
    }

    const parts = value.match(DIGIT_GROUPS) ?? [];
    const order = this.fieldOrder();

    if (parts.length === FULL_DATE_PART_COUNT) {
      return this.buildFullDate(parts, order);
    }

    if (parts.length === DAY_AND_MONTH_PART_COUNT) {
      return this.buildDayAndMonth(parts, order);
    }

    if (parts.length === DAY_ONLY_PART_COUNT) {
      return { day: Number(parts[0]), month: FIRST_MONTH, year: companyToday().getFullYear() };
    }

    return null;
  }

  format(date: NgbDateStruct): string {
    if (!date || !isNumeric(date.day) || !isNumeric(date.month) || !isNumeric(date.year)) {
      return NO_DATE_TEXT;
    }

    const value = new Date(date.year, date.month - 1, date.day);
    value.setFullYear(date.year);

    return formatCalendarDate(value, this.localeService.getLocale()) ?? NO_DATE_TEXT;
  }

  private fieldOrder(): DateField[] {
    const pattern = localeNumericDatePattern(this.localeService.getLocale());
    const order: DateField[] = [];

    for (const character of pattern) {
      const field = FIELD_BY_PATTERN_TOKEN[character];
      if (field && !order.includes(field)) {
        order.push(field);
      }
    }

    return order;
  }

  private buildFullDate(parts: string[], order: DateField[]): NgbDateStruct | null {
    const yearIndex = order.indexOf('year');
    if (yearIndex === -1 || parts[yearIndex].length !== YEAR_DIGITS) {
      return null;
    }

    return {
      day: Number(parts[order.indexOf('day')]),
      month: Number(parts[order.indexOf('month')]),
      year: Number(parts[yearIndex]),
    };
  }

  private buildDayAndMonth(parts: string[], order: DateField[]): NgbDateStruct | null {
    const withoutYear = order.filter((field) => field !== 'year');
    if (withoutYear.length !== DAY_AND_MONTH_PART_COUNT) {
      return null;
    }

    return {
      day: Number(parts[withoutYear.indexOf('day')]),
      month: Number(parts[withoutYear.indexOf('month')]),
      year: companyToday().getFullYear(),
    };
  }
}
