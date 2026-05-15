// Copyright (c) Heribert Gasparoli Private. All rights reserved.

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
  if (!value) {
    return undefined;
  }
  if (
    typeof value !== 'object' ||
    !value.hasOwnProperty('year') ||
    !value.hasOwnProperty('month') ||
    !value.hasOwnProperty('day')
  ) {
    return undefined;
  }
  if (
    !value.year ||
    !isYearOk(value.year) ||
    !value.month ||
    !isMonthOk(value.month) ||
    !value.day ||
    !isDayOk(value.day)
  ) {
    return undefined;
  }
  return new Date(value.year, value.month - 1, value.day);
}

/**
 * Transforms native Date to NgbDateStruct.
 *
 * @param value - Date to transform
 * @returns NgbDateStruct or undefined if invalid
 */
export function transformDateToNgbDateStruct(
  value: Date | string | undefined
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
  return transformNgbDateStructToDate(event) !== undefined;
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

/**
 * Returns an ISO 8601 date string (yyyy-MM-dd) for the given NgbDateStruct,
 * or null if the struct is empty/invalid. Uses the local-time components so
 * round-tripping with the date picker stays stable across time zones.
 *
 * @param value - NgbDateStruct to convert
 */
export function ngbDateStructToIsoDate(
  value: NgbDateStruct | null | undefined,
): string | null {
  const date = transformNgbDateStructToDate(value ?? undefined);
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * NgbDateStruct for the first day of the month relative to today.
 *
 * @param monthOffset - 0 = current month, -1 = previous, +1 = next
 */
export function firstOfMonth(monthOffset = 0): NgbDateStruct | null {
  const d = new Date();
  return (
    transformDateToNgbDateStruct(
      new Date(d.getFullYear(), d.getMonth() + monthOffset, 1),
    ) ?? null
  );
}

/**
 * NgbDateStruct for the last day of the month relative to today.
 *
 * @param monthOffset - 0 = current month, -1 = previous, +1 = next
 */
export function lastOfMonth(monthOffset = 0): NgbDateStruct | null {
  const d = new Date();
  return (
    transformDateToNgbDateStruct(
      new Date(d.getFullYear(), d.getMonth() + monthOffset + 1, 0),
    ) ?? null
  );
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
