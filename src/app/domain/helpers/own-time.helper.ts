// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * OwnTime Helper (Domain-Specific)
 *
 * Pure functions for OwnTime domain model manipulation.
 * This helper is domain-specific because it works with the OwnTime class from schedule-class.
 */

import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';
import { isNumeric } from 'src/app/shared/helpers/number.helper';

/**
 * Validates if an OwnTime struct is valid.
 *
 * @param event - OwnTime object to validate
 * @returns true if valid, false otherwise
 */
export function isOwnTimeStructOk(event: OwnTime | undefined): boolean {
  if (event) {
    if (
      typeof event === 'object' &&
      event !== null &&
      'hours' in event &&
      'minutes' in event
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Transforms a time string to OwnTime struct.
 *
 * @param value - Time string (e.g., "14:30:00" or "14:30")
 * @param isDuration - Whether this represents a duration (default: false)
 * @returns OwnTime object
 */
export function transformStringToOwnTimeStruct(
  value: string,
  isDuration = false
): OwnTime {
  if (value) {
    let hours = 0;
    let minutes = 0;
    const split = value.split(':');
    if (split.length < 2) return new OwnTime('00', '00', isDuration);

    if (isNumeric(split[0])) {
      hours = parseInt(split[0], 10);
      if (!isDuration && hours > 23) {
        hours = 0;
      }
    }
    if (isNumeric(split[1])) {
      minutes = parseInt(split[1], 10);
      if (minutes > 59) {
        minutes = 0;
      }
    }

    return new OwnTime(hours.toString(), minutes.toString(), isDuration);
  }
  return new OwnTime('00', '00', isDuration);
}

/**
 * Transforms OwnTime to time string.
 *
 * @param value - OwnTime object
 * @returns Time string in format "HH:mm:ss"
 */
export function transformOwnTimeToString(value: OwnTime): string {
  if (value) {
    return +value.hours + ':' + value.minutes + ':00';
  }
  return '00:00:00';
}

/**
 * Transforms OwnTime to decimal number (hours + minutes/60).
 *
 * @param value - OwnTime object
 * @returns Decimal hours (e.g., 14.5 for 14:30)
 */
export function transformOwnTimeToNumber(value: OwnTime): number {
  if (value) {
    return +value.hours + +value.minutes / 60;
  }
  return 0;
}

/**
 * Transforms OwnTime to a nullable decimal number for fields where "empty" is a
 * meaningful state (e.g., inherited contract hours).
 *
 * @param value - OwnTime object, or undefined for the inherited/empty state
 * @returns Decimal hours, or undefined when no value is present
 */
export function transformOwnTimeToNullableNumber(
  value: OwnTime | undefined
): number | undefined {
  if (!value) {
    return undefined;
  }
  return transformOwnTimeToNumber(value);
}

/**
 * Transforms a nullable decimal number to OwnTime, mapping undefined/null to the
 * neutral 00:00 duration so widgets always receive a valid OwnTime instance.
 *
 * @param value - Decimal hours, or undefined/null for the inherited/empty state
 * @param isDuration - Whether this represents a duration (default: false)
 * @returns OwnTime object
 */
export function transformNullableNumberToOwnTime(
  value: number | undefined | null,
  isDuration = false
): OwnTime {
  return transformNumberToOwnTime(value ?? 0, isDuration);
}

/**
 * Transforms decimal number to OwnTime.
 *
 * @param value - Decimal hours (e.g., 14.5)
 * @param isDuration - Whether this represents a duration (default: false)
 * @returns OwnTime object
 */
export function transformNumberToOwnTime(
  value: number,
  isDuration = false
): OwnTime {
  if (value) {
    const hours = Math.floor(value);
    const minutes = Math.round((value - hours) * 60);
    return new OwnTime(hours.toString(), minutes.toString(), isDuration);
  }
  return new OwnTime('00', '00', isDuration);
}
