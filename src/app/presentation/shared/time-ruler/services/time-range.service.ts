// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable } from '@angular/core';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';
import { IShift } from 'src/app/domain/models/shift/shift-class';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-class';
import { timeToMinutes } from 'src/app/shared/helpers/time-format.helper';

@Injectable({
  providedIn: 'root',
})
export class TimeRangeService {
  private readonly MINUTES_PER_HOUR = 60;
  private readonly HOURS_PER_DAY = 24;
  private readonly MINUTES_PER_DAY = this.HOURS_PER_DAY * this.MINUTES_PER_HOUR;
  private readonly MINUTES_PER_HALF_HOUR = 30;
  private readonly MINUTES_PER_QUARTER_HOUR = 15;
  private readonly MIN_PIXELS_PER_LABEL = 25;
  private readonly MIN_PIXELS_PER_MINUTE_FOR_ONE_MINUTE_INCREMENT = 2;
  private readonly MIN_PIXELS_PER_QUARTER_HOUR = 12;
  private readonly MIN_PIXELS_PER_HALF_HOUR = 15;
  private readonly MIN_PIXELS_FOR_HALF_HOUR_LABELS = 35;
  private readonly RADIX_DECIMAL = 10;
  private readonly PADDING_WIDTH = 2;
  private readonly PADDING_CHAR = '0';
  private readonly TIME_SEPARATOR_INDEX = 2;

  toMinutes(time: OwnTime): number {
    return parseInt(time.hours) * this.MINUTES_PER_HOUR + parseInt(time.minutes);
  }

  calculateDuration(from: OwnTime, until: OwnTime): OwnTime {
    const fromMinutes = this.toMinutes(from);
    let untilMinutes = this.toMinutes(until);

    if (untilMinutes <= fromMinutes) {
      untilMinutes += this.MINUTES_PER_DAY;
    }

    let durationMinutes = untilMinutes - fromMinutes;
    if (durationMinutes < 0) {
      durationMinutes += this.MINUTES_PER_DAY;
    }

    const hours = Math.floor(durationMinutes / this.MINUTES_PER_HOUR);
    const minutes = durationMinutes % this.MINUTES_PER_HOUR;

    return OwnTime.forTime(
      hours.toString().padStart(this.PADDING_WIDTH, this.PADDING_CHAR),
      minutes.toString().padStart(this.PADDING_WIDTH, this.PADDING_CHAR)
    );
  }

  calculateDisplayRange(
    from: OwnTime,
    until: OwnTime,
    paddingMinutes: number
  ): {
    originalFromMinutes: number;
    originalUntilMinutes: number;
    displayFromMinutes: number;
    displayUntilMinutes: number;
    totalMinutes: number;
  } {
    const originalFromMinutes = this.toMinutes(from);
    let originalUntilMinutes = this.toMinutes(until);

    if (originalUntilMinutes <= originalFromMinutes) {
      originalUntilMinutes += this.MINUTES_PER_DAY;
    }

    const displayFromMinutes = originalFromMinutes - paddingMinutes;
    const displayUntilMinutes = originalUntilMinutes + paddingMinutes;
    const totalMinutes = displayUntilMinutes - displayFromMinutes;

    return {
      originalFromMinutes,
      originalUntilMinutes,
      displayFromMinutes,
      displayUntilMinutes,
      totalMinutes,
    };
  }

  normalizeHours(hours: number): number {
    return hours % this.HOURS_PER_DAY;
  }

  isCrossingMidnight(from: OwnTime, until: OwnTime): boolean {
    const fromMinutes = this.toMinutes(from);
    const untilMinutes = this.toMinutes(until);
    return untilMinutes <= fromMinutes;
  }

  formatTime(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / this.MINUTES_PER_HOUR) % this.HOURS_PER_DAY;
    const minutes = totalMinutes % this.MINUTES_PER_HOUR;
    return `${hours.toString().padStart(this.PADDING_WIDTH, this.PADDING_CHAR)}:${minutes
      .toString()
      .padStart(this.PADDING_WIDTH, this.PADDING_CHAR)}`;
  }

  calculateOptimalIncrement(pixelsPerMinute: number): {
    increment: number;
    showHalfHourLabels: boolean;
  } {
    const pixelsPerHalfHour = pixelsPerMinute * this.MINUTES_PER_HALF_HOUR;
    const pixelsPerQuarterHour = pixelsPerMinute * this.MINUTES_PER_QUARTER_HOUR;

    if (pixelsPerMinute >= this.MIN_PIXELS_PER_MINUTE_FOR_ONE_MINUTE_INCREMENT) {
      return { increment: 1, showHalfHourLabels: false };
    }

    if (pixelsPerQuarterHour >= this.MIN_PIXELS_PER_QUARTER_HOUR) {
      return { increment: this.MINUTES_PER_QUARTER_HOUR, showHalfHourLabels: false };
    }

    if (pixelsPerHalfHour >= this.MIN_PIXELS_PER_HALF_HOUR) {
      return { increment: this.MINUTES_PER_HALF_HOUR, showHalfHourLabels: pixelsPerHalfHour >= this.MIN_PIXELS_FOR_HALF_HOUR_LABELS };
    }

    const hourMultipliers = [1, 2, 3, 4, 6, 12, this.HOURS_PER_DAY];
    for (const multiplier of hourMultipliers) {
      const pixelsPerInterval = pixelsPerMinute * this.MINUTES_PER_HOUR * multiplier;
      if (pixelsPerInterval >= this.MIN_PIXELS_PER_LABEL) {
        return { increment: this.MINUTES_PER_HOUR * multiplier, showHalfHourLabels: false };
      }
    }

    return { increment: this.MINUTES_PER_DAY, showHalfHourLabels: false };
  }

  private extractStartTimeString(
    item: IShift | IContainerTemplateItem
  ): string | undefined {
    const isContainerItem = 'shiftId' in item;

    if (isContainerItem) {
      return item.absenceId
        ? item.startItem
        : (item.timeRangeStartItem || item.startItem);
    }

    return (item as IShift).startShift;
  }

  private extractEndTimeString(
    item: IShift | IContainerTemplateItem
  ): string | undefined {
    const isContainerItem = 'shiftId' in item;

    if (isContainerItem) {
      return item.absenceId
        ? item.endItem
        : (item.timeRangeEndItem || item.endItem);
    }

    return (item as IShift).endShift;
  }

  /**
   * Whether both bounds are actually set and parseable. Callers must ask this instead of
   * testing for zero minutes: since equal bounds now mean a full day, a start and an end of
   * zero is a valid 00:00-00:00 duty, no longer distinguishable from an unset pair by value.
   */
  hasExplicitTimes(item: IShift | IContainerTemplateItem): boolean {
    const startString = this.extractStartTimeString(item);
    const endString = this.extractEndTimeString(item);

    if (!startString || !endString) {
      return false;
    }

    return (
      this.parseTimeString(startString) !== null &&
      this.parseTimeString(endString) !== null
    );
  }

  getShiftStartMinutes(item: IShift | IContainerTemplateItem): number {
    const timeString = this.extractStartTimeString(item);
    if (!timeString) return 0;

    const time = this.parseTimeString(timeString);
    if (!time) return 0;

    return time.hours * this.MINUTES_PER_HOUR + time.minutes;
  }

  /**
   * End of the span in minutes, wrapping past midnight. An end not greater than the start
   * wraps, so a 07:00-07:00 duty spans the full 1440 minutes instead of collapsing to a
   * zero-height block that can be neither seen nor clicked.
   */
  getShiftEndMinutes(item: IShift | IContainerTemplateItem): number {
    const timeString = this.extractEndTimeString(item);
    if (!timeString) return 0;

    const time = this.parseTimeString(timeString);
    if (!time) return 0;

    let minutes = time.hours * this.MINUTES_PER_HOUR + time.minutes;

    const startMinutes = this.getShiftStartMinutes(item);
    if (minutes <= startMinutes) {
      minutes += this.MINUTES_PER_DAY;
    }

    return minutes;
  }

  parseTimeString(
    timeString: string
  ): { hours: number; minutes: number } | null {
    const parts = timeString.split(':');
    if (parts.length < this.TIME_SEPARATOR_INDEX) return null;

    const hours = parseInt(parts[0], this.RADIX_DECIMAL);
    const minutes = parseInt(parts[1], this.RADIX_DECIMAL);

    if (isNaN(hours) || isNaN(minutes)) return null;

    return { hours, minutes };
  }

  parseTimeToMinutes(timeString: string | undefined): number {
    return timeString ? timeToMinutes(timeString) : 0;
  }

  getEffectiveStartMinutes(item: IContainerTemplateItem): number {
    const shiftStart = this.getShiftStartMinutes(item);
    const travelTimeBefore = this.parseTimeToMinutes(item.travelTimeBefore);
    const briefingTime = this.parseTimeToMinutes(item.briefingTime);
    return shiftStart - travelTimeBefore - briefingTime;
  }

  getEffectiveEndMinutes(item: IContainerTemplateItem): number {
    const shiftEnd = this.getShiftEndMinutes(item);
    const debriefingTime = this.parseTimeToMinutes(item.debriefingTime);
    const travelTimeAfter = this.parseTimeToMinutes(item.travelTimeAfter);
    return shiftEnd + debriefingTime + travelTimeAfter;
  }

  getTotalPreShiftMinutes(item: IContainerTemplateItem): number {
    const travelTimeBefore = this.parseTimeToMinutes(item.travelTimeBefore);
    const briefingTime = this.parseTimeToMinutes(item.briefingTime);
    return travelTimeBefore + briefingTime;
  }

  getTotalPostShiftMinutes(item: IContainerTemplateItem): number {
    const debriefingTime = this.parseTimeToMinutes(item.debriefingTime);
    const travelTimeAfter = this.parseTimeToMinutes(item.travelTimeAfter);
    return debriefingTime + travelTimeAfter;
  }
}
