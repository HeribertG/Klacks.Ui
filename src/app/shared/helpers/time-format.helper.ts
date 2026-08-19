// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Time Format Helper
 *
 * Pure functions for time string formatting.
 * Used across the application for consistent time display and conversion.
 */

const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const MINUTES_PER_DAY = HOURS_PER_DAY * MINUTES_PER_HOUR;

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

  return workingTimeDurationMinutes(
    timeToMinutes(startTime),
    timeToMinutes(endTime)
  );
}

/**
 * Duration of a working-time span in minutes, wrapping past midnight.
 * Equal bounds mean a full day, so a 07:00-07:00 duty is 1440 minutes rather than zero.
 * Use this for duties, shifts and container working time.
 *
 * @param startMinutes - Start of the span in minutes since midnight
 * @param endMinutes - End of the span in minutes since midnight
 * @returns Duration in minutes, always greater than zero
 *
 * @example
 * workingTimeDurationMinutes(420, 420) // 1440
 * workingTimeDurationMinutes(1320, 360) // 480
 */
export function workingTimeDurationMinutes(
  startMinutes: number,
  endMinutes: number
): number {
  if (endMinutes > startMinutes) {
    return endMinutes - startMinutes;
  }
  return MINUTES_PER_DAY - startMinutes + endMinutes;
}

/**
 * Duration of an absence or break recording in minutes, wrapping past midnight.
 * Equal bounds mean no times were recorded and yield zero, per the owner ruling of
 * 2026-08-19. A genuine full-day absence is booked as 00:00-23:59, not 00:00-00:00.
 *
 * @param startMinutes - Start of the span in minutes since midnight
 * @param endMinutes - End of the span in minutes since midnight
 * @returns Duration in minutes, zero when both bounds are equal
 *
 * @example
 * absenceDurationMinutes(720, 720) // 0
 * absenceDurationMinutes(1320, 360) // 480
 */
export function absenceDurationMinutes(
  startMinutes: number,
  endMinutes: number
): number {
  if (isFullDayMarker(startMinutes, endMinutes)) {
    return MINUTES_PER_DAY;
  }
  if (endMinutes >= startMinutes) {
    return endMinutes - startMinutes;
  }
  return MINUTES_PER_DAY - startMinutes + endMinutes;
}

/**
 * Whether a span is the full-day booking marker 00:00-23:59. Absences and breaks covering a
 * whole day are booked in this form, never as 00:00-00:00, which keeps the equal-bounds case
 * free for working time. Replaces the previous "23.9 hours or more counts as a full day",
 * which also swallowed a genuine span starting at 23:54.
 *
 * @param startMinutes - Start of the span in minutes since midnight
 * @param endMinutes - End of the span in minutes since midnight
 * @returns true only for exactly 00:00-23:59
 *
 * @example
 * isFullDayMarker(0, 1439)    // true
 * isFullDayMarker(1434, 1439) // false
 */
export function isFullDayMarker(
  startMinutes: number,
  endMinutes: number
): boolean {
  return startMinutes === 0 && endMinutes === MINUTES_PER_DAY - 1;
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
  const totalMinutes = minutes % MINUTES_PER_DAY;
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
