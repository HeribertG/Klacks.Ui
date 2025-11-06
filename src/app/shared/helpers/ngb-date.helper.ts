/**
 * NgBootstrap Date Helper
 *
 * Pure functions for NgBootstrap date struct conversions.
 */

/* eslint-disable no-prototype-builtins */
import { NgbDate, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';

/**
 * Transforms NgbDateStruct to native Date object.
 *
 * @param value - NgbDateStruct to transform
 * @returns Date object or undefined if invalid
 */
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

/**
 * Transforms native Date to NgbDateStruct.
 *
 * @param value - Date to transform
 * @returns NgbDateStruct or undefined if invalid
 */
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

/**
 * Validates if NgbDateStruct is valid.
 *
 * @param event - NgbDateStruct to validate
 * @returns true if valid, false otherwise
 */
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

/**
 * Validates if NgbDateStruct is valid and parseable.
 *
 * @param date - NgbDateStruct to validate
 * @returns true if valid, false otherwise
 */
export function isNgbDateStructValid(date: NgbDateStruct): boolean {
  const result = transformNgbDateStructToDate(date);
  if (result) {
    return !isNaN(result.getTime());
  }
  return false;
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
