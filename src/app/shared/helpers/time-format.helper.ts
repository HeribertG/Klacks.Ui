/**
 * Time Format Helper
 *
 * Pure functions for time string formatting.
 * Used across the application for consistent time display and conversion.
 */

/**
 * Formats a time string from "HH:mm:ss" to "HH:mm"
 *
 * @param time - Time string in format "HH:mm:ss" or undefined
 * @returns Formatted time string "HH:mm" or empty string if input is undefined
 *
 * @example
 * formatTime("14:30:00") // "14:30"
 * formatTime("09:05:15") // "09:05"
 * formatTime(undefined)  // ""
 */
export function formatTime(time: string | undefined): string {
  if (!time) {
    return '';
  }
  return time.substring(0, 5);
}

/**
 * Converts hours and minutes to a time string in format "HH:mm:ss"
 *
 * @param hours - Hours (0-23)
 * @param minutes - Minutes (0-59)
 * @returns Time string in format "HH:mm:ss" with leading zeros
 *
 * @example
 * timeToString(14, 30) // "14:30:00"
 * timeToString(9, 5)   // "09:05:00"
 * timeToString(0, 0)   // "00:00:00"
 */
export function timeToString(hours: number, minutes: number): string {
  const h = hours.toString().padStart(2, '0');
  const m = minutes.toString().padStart(2, '0');
  return `${h}:${m}:00`;
}

/**
 * Parses a time string "HH:mm:ss" or "HH:mm" into hours and minutes
 *
 * @param time - Time string in format "HH:mm:ss" or "HH:mm"
 * @returns Object with hours and minutes, or null if invalid
 *
 * @example
 * parseTime("14:30:00") // { hours: 14, minutes: 30 }
 * parseTime("09:05")    // { hours: 9, minutes: 5 }
 * parseTime("invalid")  // null
 */
export function parseTime(time: string | undefined): { hours: number; minutes: number } | null {
  if (!time) {
    return null;
  }

  const parts = time.split(':');
  if (parts.length < 2) {
    return null;
  }

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (isNaN(hours) || isNaN(minutes)) {
    return null;
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return { hours, minutes };
}

/**
 * Validates if a time string is in valid "HH:mm:ss" or "HH:mm" format
 *
 * @param time - Time string to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * isValidTimeString("14:30:00") // true
 * isValidTimeString("09:05")    // true
 * isValidTimeString("25:00:00") // false (invalid hour)
 * isValidTimeString("14:60:00") // false (invalid minute)
 */
export function isValidTimeString(time: string | undefined): boolean {
  return parseTime(time) !== null;
}
