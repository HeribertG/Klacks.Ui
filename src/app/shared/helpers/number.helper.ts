// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Number Helper
 *
 * Pure functions for number validation and manipulation.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Checks if a value is numeric.
 *
 * @param value - Value to check
 * @returns true if numeric, false otherwise
 */
export function isNumeric(value: any): boolean {
  return !isNaN(parseFloat(value)) && isFinite(value);
}

/**
 * Checks if a value is a semicolon-separated list of numeric parts.
 *
 * @param value - Value to check (e.g. "123;456")
 * @returns true if the value contains a semicolon and every non-empty part is numeric
 */
export function isMultipleNumeric(value: string): boolean {
  if (!value.includes(';')) return false;
  const parts = value.split(';').filter((p) => p.trim() !== '');
  return parts.length > 1 && parts.every((p) => isNumeric(p.trim()));
}

/**
 * Converts a string or number to a number (integer).
 *
 * @param value - Value to convert
 * @returns Converted number
 *
 * @example
 * toNumber("42") // 42
 * toNumber(42) // 42
 * toNumber("42.5") // 42
 */
export function toNumber(value: string | number): number {
  if (typeof value === 'string') {
    return parseInt(value, 10);
  }
  return value;
}

/**
 * Rounds a number to two decimal places (accounting rounding).
 *
 * @param value - Value to round
 * @returns Rounded value as string with 2 decimal places, or empty string if null/undefined
 *
 * @example
 * roundToTwoDecimals(8.345) // "8.35"
 * roundToTwoDecimals(8) // "8.00"
 * roundToTwoDecimals(null) // ""
 */
export function roundToTwoDecimals(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return (Math.round(value * 100) / 100).toFixed(2);
}

