import { Injectable } from '@angular/core';
import { OwnTime } from 'src/app/domain/models/schedule-class';
import { IShift } from 'src/app/domain/models/shift-class';

@Injectable({
  providedIn: 'root',
})
export class TimeRangeService {
  private readonly MINUTES_PER_HOUR = 60;
  private readonly MINUTES_PER_DAY = 24 * 60;

  toMinutes(time: OwnTime): number {
    return parseInt(time.hours) * 60 + parseInt(time.minutes);
  }

  calculateDuration(from: OwnTime, until: OwnTime): OwnTime {
    const fromMinutes = this.toMinutes(from);
    let untilMinutes = this.toMinutes(until);

    if (untilMinutes <= fromMinutes) {
      untilMinutes += 24 * 60;
    }

    let durationMinutes = untilMinutes - fromMinutes;
    if (durationMinutes < 0) {
      durationMinutes += 24 * 60;
    }

    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    return OwnTime.forTime(
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0')
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
      originalUntilMinutes += 24 * 60;
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
    return hours % 24;
  }

  isCrossingMidnight(from: OwnTime, until: OwnTime): boolean {
    const fromMinutes = this.toMinutes(from);
    const untilMinutes = this.toMinutes(until);
    return untilMinutes <= fromMinutes;
  }

  formatTime(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}`;
  }

  calculateOptimalIncrement(pixelsPerMinute: number): {
    increment: number;
    showHalfHourLabels: boolean;
  } {
    const minPixelsPerLabel = 25;
    const pixelsPerHalfHour = pixelsPerMinute * 30;
    const pixelsPerQuarterHour = pixelsPerMinute * 15;

    if (pixelsPerMinute >= 2) {
      return { increment: 1, showHalfHourLabels: false };
    }

    if (pixelsPerQuarterHour >= 12) {
      return { increment: 15, showHalfHourLabels: false };
    }

    if (pixelsPerHalfHour >= 15) {
      return { increment: 30, showHalfHourLabels: pixelsPerHalfHour >= 35 };
    }

    const hourMultipliers = [1, 2, 3, 4, 6, 12, 24];
    for (const multiplier of hourMultipliers) {
      const pixelsPerInterval = pixelsPerMinute * 60 * multiplier;
      if (pixelsPerInterval >= minPixelsPerLabel) {
        return { increment: 60 * multiplier, showHalfHourLabels: false };
      }
    }

    return { increment: 60 * 24, showHalfHourLabels: false };
  }

  getShiftStartMinutes(shift: IShift): number {
    const timeString = shift.timeRangeStartShift || shift.startShift;
    if (!timeString) return 0;

    const time = this.parseTimeString(timeString);
    if (!time) return 0;

    return time.hours * this.MINUTES_PER_HOUR + time.minutes;
  }

  getShiftEndMinutes(shift: IShift): number {
    const timeString = shift.timeRangeEndShift || shift.endShift;
    if (!timeString) return 0;

    const time = this.parseTimeString(timeString);
    if (!time) return 0;

    let minutes = time.hours * this.MINUTES_PER_HOUR + time.minutes;

    const startMinutes = this.getShiftStartMinutes(shift);
    if (minutes < startMinutes) {
      minutes += this.MINUTES_PER_DAY;
    }

    return minutes;
  }

  parseTimeString(
    timeString: string
  ): { hours: number; minutes: number } | null {
    const parts = timeString.split(':');
    if (parts.length < 2) return null;

    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);

    if (isNaN(hours) || isNaN(minutes)) return null;

    return { hours, minutes };
  }
}
