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

/**
 * Converts time string to total minutes since midnight
 *
 * @param time - Time string in format "HH:mm:ss" or "HH:mm"
 * @returns Total minutes since midnight
 *
 * @example
 * timeToMinutes("14:30:00") // 870
 * timeToMinutes("09:05")    // 545
 */
export function timeToMinutes(time: string): number {
  const parsed = parseTime(time);
  if (!parsed) {
    return 0;
  }
  return parsed.hours * 60 + parsed.minutes;
}

/**
 * Calculates duration in minutes between two time strings
 *
 * @param startTime - Start time in format "HH:mm:ss" or "HH:mm"
 * @param endTime - End time in format "HH:mm:ss" or "HH:mm"
 * @returns Duration in minutes
 *
 * @example
 * calculateDurationInMinutes("09:00:00", "10:30:00") // 90
 * calculateDurationInMinutes("14:00", "15:15")       // 75
 */
export function calculateDurationInMinutes(
  startTime: string | undefined,
  endTime: string | undefined
): number {
  if (!startTime || !endTime) {
    return 0;
  }

  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  if (end >= start) {
    return end - start;
  } else {
    return 24 * 60 - start + end;
  }
}

/**
 * Formats minutes since midnight to time string "HH:mm:ss"
 *
 * @param minutes - Total minutes since midnight
 * @returns Time string in format "HH:mm:ss"
 *
 * @example
 * formatTimeFromMinutes(870)  // "14:30:00"
 * formatTimeFromMinutes(545)  // "09:05:00"
 * formatTimeFromMinutes(1500) // "01:00:00" (next day)
 */
export function formatTimeFromMinutes(minutes: number): string {
  const totalMinutes = minutes % (24 * 60);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return timeToString(hours, mins);
}

/**
 * Converts decimal hours to time string in format "HH:mm"
 *
 * @param value - Hours as decimal number
 * @returns Time string in format "HH:mm", or empty string if null/undefined
 *
 * @example
 * hoursToHHMM(8.5)   // "08:30"
 * hoursToHHMM(12.75) // "12:45"
 * hoursToHHMM(0.25)  // "00:15"
 * hoursToHHMM(-2.5)  // "-02:30"
 * hoursToHHMM(null)  // ""
 */
export function hoursToHHMM(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  const hours = Math.floor(absValue);
  const minutes = Math.round((absValue - hours) * 60);
  const hh = hours.toString().padStart(2, '0');
  const mm = minutes.toString().padStart(2, '0');
  return isNegative ? `-${hh}:${mm}` : `${hh}:${mm}`;
}
