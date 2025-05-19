import moment from 'moment';
import { NgbDate, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { MessageLibrary } from './string-constants';
import { OwnTime } from '../core/schedule-class';
import { isNumberLike } from './object-helpers';

export function EqualDate(
  firstDate: Date | string,
  secondDate: Date | string
): number {
  const first = new Date(firstDate);

  const second = new Date(secondDate);

  return first > second ? -1 : first < second ? 1 : 0;
}

export function DateToString(
  date: Date | string,
  locale: string = MessageLibrary.DEFAULT_LANG
): string {
  return formatDate(date, 'dddd DD.MM.yyyy', locale);
}
export function DateToStringShort(
  date: Date | string,
  locale: string = MessageLibrary.DEFAULT_LANG
): string {
  return formatDate(date, 'DD.MM.yyyy', locale);
}

/**
 * Format a date as a string using the given format and locale.
 *
 * @param {Date | string} date - The date to format.
 * @param {string} format - The format string to use.
 * @param {string} locale - The locale to use for formatting. Default is MessageLibrary.DEFAULT_LANG.
 * @returns {string} - The formatted date string.
 */
function formatDate(
  date: Date | string,
  format: string,
  locale: string = MessageLibrary.DEFAULT_LANG
): string {
  return moment(date).clone().locale(locale).format(format);
}

export function dateWithLocalTimeCorrection(
  date: Date | string | undefined
): Date | undefined {
  if (date === null) {
    return undefined;
  }
  const userTimezoneOffset = moment(date).utcOffset();
  const hourDiff = userTimezoneOffset / 60;
  return new Date(
    moment(date).year(),
    moment(date).month(),
    moment(date).date(),
    hourDiff,
    0,
    0
  );
}

export function utcToLocalDate(date: Date | string): Date | undefined {
  if (date === null) {
    return undefined;
  }
  const userTimezoneOffset = moment(date).utcOffset();
  const hourDiff = userTimezoneOffset / 60;
  const d = new Date(date).setHours(moment(date).hour() + hourDiff);
  return new Date(d);
}

export function addMonths(date: Date, value: number): Date {
  const d = new Date(date);
  const n = date.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + value);
  d.setDate(Math.min(n, getDaysInMonth(d.getFullYear(), d.getMonth())));
  return d;

  function isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  function getDaysInMonth(year: number, month: number) {
    return [
      31,
      isLeapYear(year) ? 29 : 28,
      31,
      30,
      31,
      30,
      31,
      31,
      30,
      31,
      30,
      31,
    ][month];
  }
}

export function isNumeric(value: any): boolean {
  return !isNaN(parseFloat(value)) && isFinite(value);
}

export function delay(ms: number): Promise<unknown> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getFileExtension(fileName: string): string {
  return fileName.slice(
    (Math.max(0, fileName.lastIndexOf('.')) || Infinity) + 1
  );
}

export function dateWithUTCCorrection(date: Date | string): Date | undefined {
  if (!date) {
    return undefined;
  }

  let parsedDate: Date;

  if (typeof date === 'string') {
    parsedDate = new Date(date);
  } else {
    parsedDate = date;
  }

  if (isNaN(parsedDate.getTime())) {
    return undefined;
  }

  const d = Date.UTC(
    parsedDate.getFullYear(),
    parsedDate.getMonth(),
    parsedDate.getDate(),
    0,
    0,
    0
  );

  return new Date(d);
}

export function compareDate(a: Date, b: Date): boolean {
  if (a === null && b === null) {
    return true;
  }

  if (a.getFullYear() !== b.getFullYear()) {
    return false;
  }

  if (a.getMonth() !== b.getMonth()) {
    return false;
  }

  if (a.getDate() !== b.getDate()) {
    return false;
  }

  return true;
}

export function equalDate(a: Date | string, b: Date | string) {
  const aa = new Date(a);
  const bb = new Date(b);

  return aa.getTime() - bb.getTime();
}

export function isDateOver(a: Date, b: Date): boolean {
  if (a === null && b === null) {
    return true;
  }

  if (a.getFullYear() < b.getFullYear()) {
    return false;
  }

  if (a.getMonth() < b.getMonth()) {
    return false;
  }

  if (a.getDate() < b.getDate()) {
    return false;
  }

  if (a.getHours() < b.getHours()) {
    return false;
  }

  if (a.getMinutes() < b.getMinutes()) {
    return false;
  }

  if (a.getSeconds() < b.getSeconds()) {
    return false;
  }

  return true;
}

export function addDays(date: Date | string, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function addSecond(date: Date | string, second: number): Date {
  const result = new Date(date);
  result.setDate(result.getSeconds() + second);
  return result;
}

export function newGuid(): string {
 
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
   
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function unformatPhoneNumber(value: string): string {
  if (!value) {
    return '';
  }
  const tmpValue = value.replace(/\D/g, '');

  return tmpValue;
}

export function formatPhoneNumber(value: string): string {
  let hasCross = false;
  if (value) {
    if (value.substring(0, 1) === '+') {
      hasCross = true;
    }

    value = unformatPhoneNumber(value);
    const tmpValue = unformatPhoneNumber(value);
    if (!hasCross) {
      return formatPhoneNumberWithoutCross(tmpValue);
    }
    if (hasCross) {
      return '+' + formatPhoneNumberWithCross(tmpValue);
    }
  }

  return '';
}

export function isDateStringValid(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

export function isNgbDateStructValid(date: NgbDateStruct): boolean {
  const result = transformNgbDateStructToDate(date);
  if (result) {
    return !isNaN(result.getTime());
  }
  return false;
}

function formatPhoneNumberWithoutCross(value: string): string {
  if (value.length === 0) {
    value = '';
  } else if (value.length <= 2) {
    value = value.replace(/^(\d{0,2})/, '$1');
  } else if (value.length <= 5) {
    value = value.replace(/^(\d{0,3})(\d{0,2})/, '$1 $2');
  } else if (value.length === 6) {
    value = value.replace(/^(\d{0,3})(\d{0,2})(\d{0,2})(\d{0,1})/, '$1 $2 $3');
  } else if (value.length === 7) {
    value = value.replace(/^(\d{0,3})(\d{0,2})(\d{0,2})(\d{0,2})/, '$1 $2 $3');
  } else if (value.length <= 9) {
    value = value.replace(
      /^(\d{0,3})(\d{0,2})(\d{0,2})(\d{0,2})/,
      '$1 $2 $3 $4'
    );
  } else if (value.length === 10) {
    value = value.replace(
      /^(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})(\d{0,1})/,
      '$1 $2 $3 $4 $5'
    );
  } else if (value.length <= 11) {
    value = value.replace(
      /^(\d{0,2})(\d{0,3})(\d{0,2})(\d{0,2})(\d{0,2})/,
      '$1 $2 $3 $4 $5'
    );
  } else if (value.length === 12) {
    value = value.replace(
      /^(\d{0,2})(\d{0,3})(\d{0,2})(\d{0,2})(\d{0,2})(\d{0,1})/,
      '$1 $2 $3 $4 $5 $6'
    );
  } else if (value.length <= 13) {
    value = value.replace(
      /^(\d{0,4})(\d{0,2})(\d{0,3})(\d{0,2})(\d{0,2})(\d{0,2})/,
      '$1 $2 $3 $4 $5 $6'
    );
  } else {
    value = value.replace(
      /^(\d{0,2})(\d{0,3})(\d{0,2})(\d{0,2})(\d{0,2})(\d{0,2})/,
      '$1 $2 $3 $4 $5 $6'
    );
  }
  return value;
}

function formatPhoneNumberWithCross(value: string): string {
  if (value.length === 0) {
    value = '';
  } else if (value.length <= 2) {
    value = value.replace(/^(\d{0,2})/, '$1');
  } else if (value.length <= 5) {
    value = value.replace(/^(\d{0,2})(\d{0,2})(\d{0,1})/, '$1 $2 $3');
  } else if (value.length === 6) {
    value = value.replace(/^(\d{0,2})(\d{0,2})(\d{0,3})(\d{0,1})/, '$1 $2 $3');
  } else if (value.length === 7) {
    value = value.replace(/^(\d{0,2})(\d{0,2})(\d{0,3})(\d{0,2})/, '$1 $2 $3');
  } else if (value.length <= 9) {
    value = value.replace(
      /^(\d{0,2})(\d{0,2})(\d{0,3})(\d{0,2})/,
      '$1 $2 $3 $4'
    );
  } else if (value.length === 10) {
    value = value.replace(
      /^(\d{0,2})(\d{0,2})(\d{0,3})(\d{0,2})(\d{0,2})/,
      '$1 $2 $3 $4 $5'
    );
  } else if (value.length <= 11) {
    value = value.replace(
      /^(\d{0,2})(\d{0,2})(\d{0,3})(\d{0,2})(\d{0,2})/,
      '$1 $2 $3 $4 $5'
    );
  } else if (value.length === 12) {
    value = value.replace(
      /^(\d{0,2})(\d{0,2})(\d{0,3})(\d{0,2})(\d{0,2})(\d{0,1})/,
      '$1 $2 $3 $4 $5 $6'
    );
  } else if (value.length <= 13) {
    value = value.replace(
      /^(\d{0,2})(\d{0,2})(\d{0,2})(\d{0,2})(\d{0,2})(\d{0,2})/,
      '$1 $2 $3 $4 $5 $6'
    );
  } else {
    value = value.replace(
      /^(\d{0,2})(\d{0,3})(\d{0,2})(\d{0,2})(\d{0,2})(\d{0,2})/,
      '$1 $2 $3 $4 $5 $6'
    );
  }
  return value;
}

export function transformNgbDateStructToDate(
  value: NgbDateStruct | undefined
): Date | undefined {
  if (value) {
    if (
      typeof value === 'object' &&
      value.hasOwnProperty('year') &&
      value.hasOwnProperty('month') &&
      value.hasOwnProperty('day')
    ) {
      if (
        value.year &&
        isYearOk(value.year) &&
        value.month &&
        isMonthOk(value.month) &&
        value.day &&
        isDayOk(value.day)
      ) {
        return new Date(value.year, value.month - 1, value.day);
      }
    }
  }
  return undefined;
}

export function transformDateToNgbDateStruct(
  value: Date | string
): NgbDateStruct | NgbDate | undefined {
  if (value) {
    const now = new Date(value);
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
    };
  }
  return undefined;
}

export function isNgbDateStructOk(event: NgbDateStruct | undefined): boolean {
  if (event) {
    if (
      typeof event === 'object' &&
      event.hasOwnProperty('year') &&
      event.hasOwnProperty('month') &&
      event.hasOwnProperty('day')
    ) {
      if (
        event.year &&
        isYearOk(event.year) &&
        event.month &&
        isMonthOk(event.month) &&
        event.day &&
        isDayOk(event.day)
      ) {
        return true;
      }
    }
  }

  return false;
}

export function transformStringToOwnTimeStruct(value: string): OwnTime {
  if (value) {
    let hours = 0;
    let minutes = 0;
    const split = value.split(':');
    if (split.length != 2) return new OwnTime('00', '00');

    if (isNumeric(split[0])) {
      hours = parseInt(split[0], 10);
      if (hours > 23) {
        hours = 0;
      }
    }
    if (isNumeric(split[1])) {
      minutes = parseInt(split[1], 10);
      if (minutes > 59) {
        minutes = 0;
      }
    }

    return new OwnTime(hours.toString(), minutes.toString());
  }
  return new OwnTime('00', '00');
}

export function transformOwnTimeToNumber(value: OwnTime): number {
  if (value) {
    return +value.hours + +value.minutes / 60;
  }
  return 0;
}

export function transformNumberToOwnTime(value: number): OwnTime {
  if (value) {
    const hours = Math.floor(value);
    const minutes = Math.round((value - hours) * 60);
    return new OwnTime(hours.toString(), minutes.toString());
  }
  return new OwnTime('00', '00');
}

function isYearOk(value: number): boolean {
  if (value.toString().length < 2 || value.toString().length > 4) {
    return false;
  }
  return true;
}
function isMonthOk(value: number): boolean {
  if (value < 1 || value > 12) {
    return false;
  }
  return true;
}
function isDayOk(value: number): boolean {
  if (value < 1 || value > 31) {
    return false;
  }
  return true;
}

export function replaceUmlaud(value: string): string {
  value = value.toLowerCase();
  return value
    .replace(/[áàâäāăąåæã]/g, 'a')
    .replace(/[úùûüůūŭųů]/g, 'u')
    .replace(/[éèëêȩ]/g, 'e')
    .replace(/[òóôõöōŏœ]/g, 'o')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[çćĉċčċ]/g, 'c')
    .replace(/[śŝşš]/g, 's')
    .replace(/[ŕŗř]/g, 'r')
    .replace(/[źżž]/g, 'z');
}

export function isIdValid(id: string | undefined): boolean {
  if (id) {
    return true;
  }
  return false;
}

export function validateEmail(email: string): boolean {
  const re = /^[^\s@.][^\s@]*@[^\s@.]+(\.[^\s@.]+)+$/;
  return re.test(email);
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function getDaysInMonth(year: number, month: number): number {
  return [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ][month];
}

export function daysBetweenDates(
  a: Date | null | undefined,
  b: Date | null | undefined
): number {
  if (!a || !b) {
    return 0;
  }

  const aa = dateWithUTCCorrection(a) as Date;
  const bb = dateWithUTCCorrection(b) as Date;

  if (!aa || !bb) {
    return 0;
  }

  const Difference_In_Time = bb.getTime() - aa.getTime();
  return Difference_In_Time / (1000 * 60 * 60 * 24);
}

export function invertColor(hex: string) {
  if (hex.indexOf('#') === 0) {
    hex = hex.slice(1);
  }
  // convert 3-digit hex to 6-digits.
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  if (hex.length !== 6) {
    throw new Error('Invalid HEX color.');
  }
  const r = parseInt(hex.slice(0, 2), 16),
    g = parseInt(hex.slice(2, 4), 16),
    b = parseInt(hex.slice(4, 6), 16);

  // https://stackoverflow.com/a/3943023/112731
  return r * 0.299 + g * 0.587 + b * 0.114 > 186 ? '#000000' : '#FFFFFF';
}

export function padZero(str: string, len: number | null) {
  len = len || 2;
  const zeros = new Array(len).join('0');
  return (zeros + str).slice(-len);
}
