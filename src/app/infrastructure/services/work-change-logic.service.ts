// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable } from '@angular/core';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';
import { WorkChangeValidation, WorkTimeContext } from 'src/app/domain/models/workchange/work-change';

export enum CorrectionMode {
  AtStart = 0,
  AtEnd = 1,
  Within = 2,
}

@Injectable()
export class WorkChangeLogicService {
  private readonly MINUTES_PER_DAY = 24 * 60;

  parseTimeToMinutes(time: string): number {
    if (!time) return 0;
    const parts = time.split(':');
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    return hours * 60 + minutes;
  }

  ownTimeToMinutes(ownTime: OwnTime): number {
    return ownTime.toMinutes();
  }

  minutesToOwnTime(minutes: number, isDuration = false): OwnTime {
    let normalizedMinutes = minutes;
    if (!isDuration) {
      normalizedMinutes = ((minutes % this.MINUTES_PER_DAY) + this.MINUTES_PER_DAY) % this.MINUTES_PER_DAY;
    }
    const hours = Math.floor(Math.abs(normalizedMinutes) / 60);
    const mins = Math.abs(normalizedMinutes) % 60;
    return isDuration
      ? OwnTime.forDuration(hours.toString(), mins.toString())
      : OwnTime.forTime(hours.toString().padStart(2, '0'), mins.toString().padStart(2, '0'));
  }

  ownTimeToString(ownTime: OwnTime): string {
    return ownTime.toString();
  }

  parseTimeString(timeString: string): OwnTime {
    if (!timeString) return OwnTime.forTime('00', '00');
    const parts = timeString.split(':');
    const hours = parts[0] || '00';
    const minutes = parts[1] || '00';
    return OwnTime.forTime(hours.padStart(2, '0'), minutes.padStart(2, '0'));
  }

  detectMidnightCrossing(startTime: string, endTime: string): boolean {
    const startMinutes = this.parseTimeToMinutes(startTime);
    const endMinutes = this.parseTimeToMinutes(endTime);
    return endMinutes < startMinutes;
  }

  createWorkTimeContext(workStartTime: string, workEndTime: string): WorkTimeContext {
    return {
      workStartTime,
      workEndTime,
      crossesMidnight: this.detectMidnightCrossing(workStartTime, workEndTime),
    };
  }

  normalizeToWorkDay(timeMinutes: number, workContext: WorkTimeContext): number {
    const workStartMinutes = this.parseTimeToMinutes(workContext.workStartTime);

    if (!workContext.crossesMidnight) {
      return timeMinutes;
    }

    if (timeMinutes < workStartMinutes) {
      return timeMinutes + this.MINUTES_PER_DAY;
    }
    return timeMinutes;
  }

  getWorkBoundaries(workContext: WorkTimeContext): { start: number; end: number } {
    const workStartMinutes = this.parseTimeToMinutes(workContext.workStartTime);
    let workEndMinutes = this.parseTimeToMinutes(workContext.workEndTime);

    if (workContext.crossesMidnight) {
      workEndMinutes += this.MINUTES_PER_DAY;
    }

    return { start: workStartMinutes, end: workEndMinutes };
  }

  calculateDurationMinutes(
    wcStartTime: OwnTime,
    wcEndTime: OwnTime,
    workContext: WorkTimeContext
  ): number {
    const wcStartMinutes = this.ownTimeToMinutes(wcStartTime);
    const wcEndMinutes = this.ownTimeToMinutes(wcEndTime);

    const normalizedStart = this.normalizeToWorkDay(wcStartMinutes, workContext);
    let normalizedEnd = this.normalizeToWorkDay(wcEndMinutes, workContext);

    if (normalizedEnd < normalizedStart) {
      normalizedEnd += this.MINUTES_PER_DAY;
    }

    return normalizedEnd - normalizedStart;
  }

  validateCorrectionMode(
    wcStartTime: OwnTime,
    wcEndTime: OwnTime,
    workContext: WorkTimeContext,
    mode: CorrectionMode
  ): WorkChangeValidation {
    const { start: workStart, end: workEnd } = this.getWorkBoundaries(workContext);

    const wcStartMinutes = this.ownTimeToMinutes(wcStartTime);
    const wcEndMinutes = this.ownTimeToMinutes(wcEndTime);

    const rawWorkStartMinutes = this.parseTimeToMinutes(workContext.workStartTime);

    if (mode === CorrectionMode.AtStart) {
      let durationMinutes = wcEndMinutes - wcStartMinutes;
      if (durationMinutes < 0) {
        durationMinutes += this.MINUTES_PER_DAY;
      }

      if (durationMinutes <= 0) {
        return { isValid: false, changeTime: 0, errorKey: 'dialog.correction.error.zeroTime' };
      }

      const changeTimeHours = durationMinutes / 60;

      if (wcEndMinutes === rawWorkStartMinutes && wcStartMinutes < rawWorkStartMinutes) {
        return { isValid: true, changeTime: changeTimeHours };
      }
      return { isValid: false, changeTime: 0, errorKey: 'dialog.correction.error.atStartInvalid' };
    }

    const normalizedWcStart = this.normalizeToWorkDay(wcStartMinutes, workContext);
    let normalizedWcEnd = this.normalizeToWorkDay(wcEndMinutes, workContext);

    if (normalizedWcEnd < normalizedWcStart) {
      normalizedWcEnd += this.MINUTES_PER_DAY;
    }

    const durationMinutes = normalizedWcEnd - normalizedWcStart;

    if (durationMinutes <= 0) {
      return { isValid: false, changeTime: 0, errorKey: 'dialog.correction.error.zeroTime' };
    }

    const changeTimeHours = durationMinutes / 60;

    switch (mode) {
      case CorrectionMode.AtEnd:
        if (normalizedWcStart === workEnd && normalizedWcEnd > workEnd) {
          return { isValid: true, changeTime: changeTimeHours };
        }
        return { isValid: false, changeTime: 0, errorKey: 'dialog.correction.error.atEndInvalid' };

      case CorrectionMode.Within:
        if (normalizedWcStart >= workStart && normalizedWcEnd <= workEnd) {
          return { isValid: true, changeTime: -changeTimeHours };
        }
        return { isValid: false, changeTime: 0, errorKey: 'dialog.correction.error.withinInvalid' };

      default:
        return { isValid: false, changeTime: 0 };
    }
  }

  validateReplacement(
    wcStartTime: OwnTime,
    wcEndTime: OwnTime,
    workContext: WorkTimeContext
  ): WorkChangeValidation {
    const { start: workStart, end: workEnd } = this.getWorkBoundaries(workContext);

    const wcStartMinutes = this.ownTimeToMinutes(wcStartTime);
    const wcEndMinutes = this.ownTimeToMinutes(wcEndTime);

    const normalizedWcStart = this.normalizeToWorkDay(wcStartMinutes, workContext);
    let normalizedWcEnd = this.normalizeToWorkDay(wcEndMinutes, workContext);

    if (normalizedWcEnd < normalizedWcStart) {
      normalizedWcEnd += this.MINUTES_PER_DAY;
    }

    const durationMinutes = normalizedWcEnd - normalizedWcStart;

    if (durationMinutes <= 0) {
      return { isValid: false, changeTime: 0, errorKey: 'dialog.replacement.error.zeroTime' };
    }

    const changeTimeHours = durationMinutes / 60;

    if (normalizedWcStart >= workStart && normalizedWcEnd <= workEnd) {
      return { isValid: true, changeTime: changeTimeHours };
    }

    return { isValid: false, changeTime: 0, errorKey: 'dialog.replacement.error.outsideWork' };
  }

  getDefaultTimesForMode(
    mode: CorrectionMode,
    workContext: WorkTimeContext
  ): { startTime: OwnTime; endTime: OwnTime } {
    const workStartMinutes = this.parseTimeToMinutes(workContext.workStartTime);
    const workEndMinutes = this.parseTimeToMinutes(workContext.workEndTime);

    switch (mode) {
      case CorrectionMode.AtStart: {
        const defaultStart = workStartMinutes - 15;
        return {
          startTime: this.minutesToOwnTime(defaultStart),
          endTime: this.minutesToOwnTime(workStartMinutes),
        };
      }

      case CorrectionMode.AtEnd: {
        const endMinutes = workEndMinutes + 15;
        return {
          startTime: this.minutesToOwnTime(workEndMinutes),
          endTime: this.minutesToOwnTime(endMinutes),
        };
      }

      case CorrectionMode.Within: {
        const workDuration = workContext.crossesMidnight
          ? (workEndMinutes + this.MINUTES_PER_DAY) - workStartMinutes
          : workEndMinutes - workStartMinutes;
        const midPoint = workStartMinutes + Math.floor(workDuration / 2);
        return {
          startTime: this.minutesToOwnTime(midPoint - 15),
          endTime: this.minutesToOwnTime(midPoint + 15),
        };
      }

      default:
        return {
          startTime: OwnTime.forTime('00', '00'),
          endTime: OwnTime.forTime('00', '00'),
        };
    }
  }

  getDefaultTimesForReplacementMode(
    mode: CorrectionMode,
    workContext: WorkTimeContext
  ): { startTime: OwnTime; endTime: OwnTime } {
    const workStartMinutes = this.parseTimeToMinutes(workContext.workStartTime);
    const workEndMinutes = this.parseTimeToMinutes(workContext.workEndTime);

    switch (mode) {
      case CorrectionMode.AtStart: {
        return {
          startTime: this.minutesToOwnTime(workStartMinutes),
          endTime: this.minutesToOwnTime(workStartMinutes + 30),
        };
      }

      case CorrectionMode.AtEnd: {
        return {
          startTime: this.minutesToOwnTime(workEndMinutes - 30),
          endTime: this.minutesToOwnTime(workEndMinutes),
        };
      }

      case CorrectionMode.Within: {
        const workDuration = workContext.crossesMidnight
          ? workEndMinutes + this.MINUTES_PER_DAY - workStartMinutes
          : workEndMinutes - workStartMinutes;
        const midPoint = workStartMinutes + Math.floor(workDuration / 2);
        return {
          startTime: this.minutesToOwnTime(midPoint - 15),
          endTime: this.minutesToOwnTime(midPoint + 15),
        };
      }

      default:
        return {
          startTime: OwnTime.forTime('00', '00'),
          endTime: OwnTime.forTime('00', '00'),
        };
    }
  }

  calculateDurationDisplay(
    wcStartTime: OwnTime,
    wcEndTime: OwnTime,
    workContext: WorkTimeContext
  ): OwnTime {
    const durationMinutes = this.calculateDurationMinutes(wcStartTime, wcEndTime, workContext);
    return this.minutesToOwnTime(Math.abs(durationMinutes), true);
  }
}
