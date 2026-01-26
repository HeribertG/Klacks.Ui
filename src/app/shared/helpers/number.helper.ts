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
 * Inverts a hex color to black or white for contrast.
 *
 * @param hex - Hex color code
 * @returns "#000000" or "#FFFFFF" depending on brightness
 *
 * @example
 * invertColor("#FFFFFF") // "#000000"
 * invertColor("#000000") // "#FFFFFF"
 */
export function invertColor(hex: string) {
  if (hex.indexOf('#') === 0) {
    hex = hex.slice(1);
  }

  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  if (hex.length !== 6) {
    throw new Error('Invalid HEX color.');
  }

  const r = parseInt(hex.slice(0, 2), 16),
    g = parseInt(hex.slice(2, 4), 16),
    b = parseInt(hex.slice(4, 6), 16);

  return r * 0.299 + g * 0.587 + b * 0.114 > 186 ? '#000000' : '#FFFFFF';
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

