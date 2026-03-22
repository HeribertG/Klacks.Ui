// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for the cut-by-time strategy: analysis, validation, and execution.
 * @param shift - The shift to analyse/cut
 * @param cutTimeParams - Analysis result with min/max times and cut time
 */
import { Injectable, inject } from '@angular/core';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';
import { Shift, ShiftStatus } from 'src/app/domain/models/shift/shift-class';
import { transformStringToOwnTimeStruct } from 'src/app/domain/helpers/own-time.helper';
import { WorkTimeCalculationService } from 'src/app/domain/services/work-time-calculation.service';
import { cloneObject } from 'src/app/shared/helpers/object.helper';
import { newGuid } from 'src/app/shared/helpers/guid.helper';
import { CutTimeParams } from './cut-parameter-state';

@Injectable({
  providedIn: 'root',
})
export class CutByTimeService {
  private workTimeCalculator = inject(WorkTimeCalculationService);

  analyzeCutByTime(shift: Shift): CutTimeParams {
    const result: CutTimeParams = {
      cutTimeShift: OwnTime.forTime(),
      minTimeShift: null,
      maxTimeShift: null,
      isOverMidnight: false,
      is24Hours: false,
    };

    const normalizedStartShift = shift.startShift
      .split(':')
      .slice(0, 2)
      .join(':');
    const normalizedEndShift = shift.endShift.split(':').slice(0, 2).join(':');

    const startTime = transformStringToOwnTimeStruct(normalizedStartShift);
    const endTime = transformStringToOwnTimeStruct(normalizedEndShift);

    if (!startTime || !endTime) {
      return result;
    }

    const startMinutes = startTime.toMinutes();
    const endMinutes = endTime.toMinutes();

    let totalMinutes: number;

    if (startMinutes === endMinutes) {
      totalMinutes = 24 * 60;
      result.is24Hours = true;
      result.isOverMidnight = false;
    } else if (endMinutes < startMinutes) {
      totalMinutes = 24 * 60 - startMinutes + endMinutes;
      result.is24Hours = false;
      result.isOverMidnight = true;
    } else {
      totalMinutes = endMinutes - startMinutes;
      result.is24Hours = false;
      result.isOverMidnight = false;
    }

    if (totalMinutes <= 1) {
      return result;
    }

    result.minTimeShift = startTime;
    result.maxTimeShift = endTime;

    if (result.is24Hours) {
      const defaultCutHour = (Number(startTime.hours) + 1) % 24;
      result.cutTimeShift = OwnTime.forTime(defaultCutHour.toString(), '0');
    } else {
      const midMinutes = startMinutes + Math.floor(totalMinutes / 2);

      if (result.isOverMidnight && midMinutes >= 24 * 60) {
        const adjustedMinutes = midMinutes - 24 * 60;
        result.cutTimeShift = OwnTime.forTime(
          Math.floor(adjustedMinutes / 60).toString(),
          (adjustedMinutes % 60).toString()
        );
      } else {
        result.cutTimeShift = OwnTime.forTime(
          Math.floor(midMinutes / 60).toString(),
          (midMinutes % 60).toString()
        );
      }
    }

    return result;
  }

  validateAndCorrectTime(params: CutTimeParams): void {
    if (!params.minTimeShift || !params.maxTimeShift) {
      return;
    }

    const currentMinutes = params.cutTimeShift.toMinutes();
    const minMinutes = params.minTimeShift.toMinutes();
    const maxMinutes = params.maxTimeShift.toMinutes();

    if (params.is24Hours) {
      if (currentMinutes === minMinutes) {
        const newMinutes = (currentMinutes + 1) % (24 * 60);
        params.cutTimeShift.hours = Math.floor(newMinutes / 60).toString();
        params.cutTimeShift.minutes = (newMinutes % 60).toString();
      }
      return;
    }

    if (params.isOverMidnight) {
      const isInvalidRange =
        currentMinutes > maxMinutes && currentMinutes < minMinutes;

      if (isInvalidRange) {
        const distanceToStart = Math.abs(minMinutes - currentMinutes);
        const distanceToEnd = Math.abs(currentMinutes - maxMinutes);

        if (distanceToStart <= distanceToEnd) {
          params.cutTimeShift.hours = Math.floor(minMinutes / 60).toString();
          params.cutTimeShift.minutes = (minMinutes % 60).toString();
        } else {
          params.cutTimeShift.hours = Math.floor(maxMinutes / 60).toString();
          params.cutTimeShift.minutes = (maxMinutes % 60).toString();
        }
      }
    } else {
      if (currentMinutes <= minMinutes) {
        const newMinutes = minMinutes + 1;
        params.cutTimeShift.hours = Math.floor(newMinutes / 60).toString();
        params.cutTimeShift.minutes = (newMinutes % 60).toString();
      } else if (currentMinutes >= maxMinutes) {
        const newMinutes = maxMinutes - 1;
        params.cutTimeShift.hours = Math.floor(newMinutes / 60).toString();
        params.cutTimeShift.minutes = (newMinutes % 60).toString();
      }
    }
  }

  performCutByTime(
    selectedShift: Shift,
    cutTimeShift: OwnTime,
    is24Hours: boolean
  ): Shift {
    const copiedShift = cloneObject<Shift>(selectedShift);

    const originalStartTime = transformStringToOwnTimeStruct(selectedShift.startShift);
    const originalEndTime = transformStringToOwnTimeStruct(selectedShift.endShift);
    const originalEndShift = selectedShift.endShift;

    const cutTimeString = `${cutTimeShift.hours
      .toString()
      .padStart(2, '0')}:${cutTimeShift.minutes
      .toString()
      .padStart(2, '0')}`;

    selectedShift.endShift = cutTimeString;

    const originalStartMinutes = originalStartTime?.toMinutes() || 0;
    const originalEndMinutes = originalEndTime?.toMinutes() || 0;

    const crossesMidnight = originalEndMinutes < originalStartMinutes;

    selectedShift.cuttingAfterMidnight =
      crossesMidnight &&
      originalStartMinutes >= 0 &&
      originalStartMinutes < originalEndMinutes;

    const cutTimeProps: Record<string, unknown> = {
      startShift: cutTimeString,
    };

    if (is24Hours) {
      cutTimeProps['endShift'] = originalEndShift;
    }

    copiedShift.parentId = selectedShift.id;
    copiedShift.id = newGuid();
    copiedShift.isNew = true;

    if (selectedShift.cuttingAfterMidnight) {
      copiedShift.cuttingAfterMidnight = true;
    }

    Object.assign(copiedShift, cutTimeProps);

    selectedShift.status = ShiftStatus.SplitShift;

    const selectedStartTime = transformStringToOwnTimeStruct(selectedShift.startShift);
    const selectedEndTime = transformStringToOwnTimeStruct(selectedShift.endShift);
    selectedShift.workTime = this.workTimeCalculator.calculateWorkTime(
      selectedStartTime,
      selectedEndTime
    );

    const copiedStartTime = transformStringToOwnTimeStruct(copiedShift.startShift);
    const copiedEndTime = transformStringToOwnTimeStruct(copiedShift.endShift);
    copiedShift.workTime = this.workTimeCalculator.calculateWorkTime(
      copiedStartTime,
      copiedEndTime
    );

    const copiedStartMinutes = copiedStartTime?.toMinutes() || 0;

    copiedShift.cuttingAfterMidnight =
      crossesMidnight &&
      copiedStartMinutes >= 0 &&
      copiedStartMinutes < originalEndMinutes;

    if (copiedShift.cuttingAfterMidnight && copiedShift.fromDate) {
      const adjustedDate = new Date(copiedShift.fromDate);
      adjustedDate.setDate(adjustedDate.getDate() + 1);
      copiedShift.fromDate = adjustedDate;
      this.shiftWeekdaysForward(copiedShift);
    }

    return copiedShift;
  }

  private shiftWeekdaysForward(shift: Shift): void {
    const oldMonday = shift.isMonday;
    const oldTuesday = shift.isTuesday;
    const oldWednesday = shift.isWednesday;
    const oldThursday = shift.isThursday;
    const oldFriday = shift.isFriday;
    const oldSaturday = shift.isSaturday;
    const oldSunday = shift.isSunday;

    shift.isMonday = oldSunday;
    shift.isTuesday = oldMonday;
    shift.isWednesday = oldTuesday;
    shift.isThursday = oldWednesday;
    shift.isFriday = oldThursday;
    shift.isSaturday = oldFriday;
    shift.isSunday = oldSaturday;
  }
}
