// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Clock time or duration value with hour/minute normalisation and conversion to and from minutes.
 * @param hours - Hours as text (clock hours: 24 becomes 0, above is clamped to 23; duration hours are capped at 999)
 * @param minutes - Minutes as text
 * @param isDuration - True for a duration, false for a clock time
 */

import { IOwnTime } from './own-time.interface';

const HOURS_PER_DAY = 24;
const LAST_CLOCK_HOUR = HOURS_PER_DAY - 1;
const MAX_DURATION_HOURS = 999;

export class OwnTime implements IOwnTime {
  private pHours = '00';
  private pMinutes = '00';
  private pIsDuration = false;

  constructor(hours: string, minutes: string, isDuration = false) {
    this.pIsDuration = isDuration;
    this.hours = hours;
    this.minutes = minutes;
  }

  get hours(): string {
    return this.pHours;
  }

  set hours(hours: string) {
    this.pHours = this.formatHours(hours);
  }

  get minutes(): string {
    return this.pMinutes;
  }

  set minutes(minutes: string) {
    this.pMinutes = this.formatMinutes(minutes);
  }

  get isDuration(): boolean {
    return this.pIsDuration;
  }

  set isDuration(value: boolean) {
    this.pIsDuration = value;
    if (!value && parseInt(this.pHours) > LAST_CLOCK_HOUR) {
      this.pHours = this.formatHours(this.pHours);
    }
  }

  /**
   * Maps an entered hour onto the 0-23 clock. Entering 24 means midnight and normalises to 0,
   * so a duty meant as 06:00-24:00 is stored as 06:00-00:00 and measures 18 hours under the
   * equal-bounds-wrap rule, instead of being silently clamped to 23:00 and losing an hour.
   */
  private normaliseClockHours(value: number): number {
    if (value === HOURS_PER_DAY) {
      return 0;
    }
    return Math.min(value, LAST_CLOCK_HOUR);
  }

  public toString(): string {
    return this.pHours + ':' + this.pMinutes + ':00';
  }

  private formatHours(value: string): string {
    value = value.replace(/\D/g, '');

    if (value.length === 0) {
      return '00';
    }

    const numValue = parseInt(value) || 0;

    const clampedValue = this.pIsDuration
      ? Math.min(numValue, MAX_DURATION_HOURS)
      : this.normaliseClockHours(numValue);

    if (!this.pIsDuration) {
      return clampedValue.toString().padStart(2, '0');
    } else {
      if (clampedValue < 10) {
        return clampedValue.toString().padStart(2, '0');
      } else if (clampedValue < 100) {
        return clampedValue.toString();
      } else {
        return clampedValue.toString();
      }
    }
  }

  private formatMinutes(value: string): string {
    value = value.replace(/\D/g, '');

    if (value.length === 0) {
      value = '00';
    } else if (value.length >= 2) {
      value = value.slice(-2);
      if (+value > 59) {
        value = '59';
      }
    } else if (value.length === 1) {
      value = '0' + value;
    }

    return value;
  }

  public toMinutes(): number {
    const hours = parseInt(this.pHours) || 0;
    const minutes = parseInt(this.pMinutes) || 0;
    return hours * 60 + minutes;
  }

  public fromMinutes(totalMinutes: number): void {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    this.hours = hours.toString();
    this.minutes = minutes.toString();
  }

  static forTime(hours = '00', minutes = '00'): OwnTime {
    return new OwnTime(hours, minutes, false);
  }

  static forDuration(hours = '00', minutes = '00'): OwnTime {
    return new OwnTime(hours, minutes, true);
  }
}
