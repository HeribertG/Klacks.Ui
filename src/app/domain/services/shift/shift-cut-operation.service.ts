// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, inject } from '@angular/core';
import { Shift, ShiftStatus } from 'src/app/domain/models/shift/shift-class';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';
import { WorkTimeCalculationService } from 'src/app/domain/services/work-time-calculation.service';
import { transformStringToOwnTimeStruct } from 'src/app/domain/helpers/own-time.helper';
import { newGuid } from 'src/app/shared/helpers/guid.helper';
import { cloneObject } from 'src/app/shared/helpers/object.helper';

export interface CutByDateParams {
  selectedShift: Shift;
  cutDate: Date;
}

export interface CutByTimeParams {
  selectedShift: Shift;
  cutTime: OwnTime;
}

export interface CutByWeekdaysParams {
  selectedShift: Shift;
  weekdays: {
    isMonday: boolean;
    isTuesday: boolean;
    isWednesday: boolean;
    isThursday: boolean;
    isFriday: boolean;
    isSaturday: boolean;
    isSunday: boolean;
  };
}

export interface CutByStaffParams {
  selectedShift: Shift;
  staffCount: number;
}

export interface CutByTaskParams {
  selectedShift: Shift;
  taskCount: number;
}

export interface CutResult {
  originalShift: Shift;
  newShift: Shift;
}

@Injectable({
  providedIn: 'root',
})
export class ShiftCutOperationService {
  private workTimeCalculator = inject(WorkTimeCalculationService);

  cutByDate(params: CutByDateParams): CutResult {
    const { selectedShift, cutDate } = params;

    const copiedShift = this.copyShift(selectedShift);

    const dayBeforeCut = new Date(cutDate);
    dayBeforeCut.setDate(dayBeforeCut.getDate() - 1);

    selectedShift.untilDate = dayBeforeCut;

    this.prepareCutShift(copiedShift, {
      fromDate: cutDate,
    });

    selectedShift.status = ShiftStatus.SplitShift;

    return {
      originalShift: selectedShift,
      newShift: copiedShift,
    };
  }

  cutByTime(params: CutByTimeParams): CutResult {
    const { selectedShift, cutTime } = params;

    const copiedShift = this.copyShift(selectedShift);

    const originalEndShift = selectedShift.endShift;
    const originalStartTime = transformStringToOwnTimeStruct(selectedShift.startShift);
    const originalEndTime = transformStringToOwnTimeStruct(originalEndShift);

    const cutTimeString = `${cutTime.hours
      .toString()
      .padStart(2, '0')}:${cutTime.minutes.toString().padStart(2, '0')}:00`;

    selectedShift.endShift = cutTimeString;

    const cutTimeProps: any = {
      startShift: originalEndShift,
    };

    const originalStartMinutes = originalStartTime?.toMinutes() || 0;
    const originalEndMinutes = originalEndTime?.toMinutes() || 0;
    const cutStartMinutes = cutTime.toMinutes();

    const crossesMidnight = originalEndMinutes < originalStartMinutes;

    selectedShift.cuttingAfterMidnight =
      crossesMidnight &&
      originalStartMinutes >= 0 &&
      originalStartMinutes < originalEndMinutes;

    cutTimeProps.cuttingAfterMidnight =
      crossesMidnight &&
      cutStartMinutes >= 0 &&
      cutStartMinutes < originalEndMinutes;

    if (cutTimeProps.cuttingAfterMidnight && selectedShift.fromDate) {
      const nextDayDate = new Date(selectedShift.fromDate);
      nextDayDate.setDate(nextDayDate.getDate() + 1);

      cutTimeProps.fromDate = nextDayDate;
    }

    this.prepareCutShift(copiedShift, cutTimeProps);

    if (copiedShift.cuttingAfterMidnight) {
      this.shiftWeekdaysForward(copiedShift);
    }

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

    return {
      originalShift: selectedShift,
      newShift: copiedShift,
    };
  }

  cutByWeekdays(params: CutByWeekdaysParams): CutResult {
    const { selectedShift, weekdays } = params;

    const copiedShift = this.copyShift(selectedShift);

    this.updateOriginalShiftWeekdays(selectedShift, weekdays);
    this.updateCopiedShiftWeekdays(copiedShift, weekdays);

    this.prepareCutShift(copiedShift);

    selectedShift.status = ShiftStatus.SplitShift;

    return {
      originalShift: selectedShift,
      newShift: copiedShift,
    };
  }

  cutByStaff(params: CutByStaffParams): CutResult {
    const { selectedShift, staffCount } = params;

    const copiedShift = this.copyShift(selectedShift);

    const originalStaffCount = selectedShift.sumEmployees - staffCount;
    const copiedStaffCount = staffCount;

    selectedShift.sumEmployees = originalStaffCount;

    this.prepareCutShift(copiedShift, {
      sumEmployees: copiedStaffCount,
    });

    selectedShift.status = ShiftStatus.SplitShift;

    return {
      originalShift: selectedShift,
      newShift: copiedShift,
    };
  }

  cutByTask(params: CutByTaskParams): CutResult {
    const { selectedShift, taskCount } = params;

    const copiedShift = this.copyShift(selectedShift);

    const originalTaskCount = selectedShift.quantity - taskCount;
    const copiedTaskCount = taskCount;

    selectedShift.quantity = originalTaskCount;

    this.prepareCutShift(copiedShift, {
      quantity: copiedTaskCount,
    });

    selectedShift.status = ShiftStatus.SplitShift;

    return {
      originalShift: selectedShift,
      newShift: copiedShift,
    };
  }

  private copyShift(shift: Shift): Shift {
    return cloneObject<Shift>(shift);
  }

  private prepareCutShift(copiedShift: Shift, specificProperties?: any): void {
    copiedShift.parentId = copiedShift.id;
    copiedShift.id = newGuid();
    copiedShift.isNew = true;

    if (specificProperties) {
      Object.assign(copiedShift, specificProperties);
    }
  }

  private updateOriginalShiftWeekdays(
    originalShift: Shift,
    weekdays: {
      isMonday: boolean;
      isTuesday: boolean;
      isWednesday: boolean;
      isThursday: boolean;
      isFriday: boolean;
      isSaturday: boolean;
      isSunday: boolean;
    }
  ): void {
    if (weekdays.isMonday) originalShift.isMonday = false;
    if (weekdays.isTuesday) originalShift.isTuesday = false;
    if (weekdays.isWednesday) originalShift.isWednesday = false;
    if (weekdays.isThursday) originalShift.isThursday = false;
    if (weekdays.isFriday) originalShift.isFriday = false;
    if (weekdays.isSaturday) originalShift.isSaturday = false;
    if (weekdays.isSunday) originalShift.isSunday = false;
  }

  private updateCopiedShiftWeekdays(
    copiedShift: Shift,
    weekdays: {
      isMonday: boolean;
      isTuesday: boolean;
      isWednesday: boolean;
      isThursday: boolean;
      isFriday: boolean;
      isSaturday: boolean;
      isSunday: boolean;
    }
  ): void {
    copiedShift.isMonday = weekdays.isMonday;
    copiedShift.isTuesday = weekdays.isTuesday;
    copiedShift.isWednesday = weekdays.isWednesday;
    copiedShift.isThursday = weekdays.isThursday;
    copiedShift.isFriday = weekdays.isFriday;
    copiedShift.isSaturday = weekdays.isSaturday;
    copiedShift.isSunday = weekdays.isSunday;
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
