/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, inject } from '@angular/core';
import { Shift, ShiftStatus } from 'src/app/domain/models/shift-class';
import { OwnTime } from 'src/app/domain/models/schedule-class';
import { WorkTimeCalculationService } from 'src/app/domain/services/work-time-calculation.service';
import { transformDateToNgbDateStruct, transformNgbDateStructToDate } from 'src/app/shared/helpers/ngb-date.helper';
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
    this.restoreOwnTimeObjects(copiedShift);

    const dayBeforeCut = new Date(cutDate);
    dayBeforeCut.setDate(dayBeforeCut.getDate() - 1);

    selectedShift.untilDate = dayBeforeCut;
    selectedShift.internalUntilDate =
      transformDateToNgbDateStruct(dayBeforeCut);

    this.prepareCutShift(copiedShift, {
      fromDate: cutDate,
      internalFromDate: transformDateToNgbDateStruct(cutDate),
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
    this.restoreOwnTimeObjects(copiedShift);

    const originalEndShift = selectedShift.endShift;
    const originalInternalEndShift = selectedShift.internalEndShift;

    selectedShift.endShift = `${cutTime.hours
      .toString()
      .padStart(2, '0')}:${cutTime.minutes.toString().padStart(2, '0')}:00`;
    selectedShift.internalEndShift = OwnTime.forTime(
      cutTime.hours.toString(),
      cutTime.minutes.toString()
    );

    const cutTimeProps: any = {
      startShift: originalEndShift,
      internalStartShift: originalInternalEndShift,
    };

    const originalStartMinutes = selectedShift.internalStartShift.toMinutes();
    const originalEndMinutes = originalInternalEndShift?.toMinutes() || 0;
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
      cutTimeProps.internalFromDate = transformDateToNgbDateStruct(nextDayDate);
    }

    this.prepareCutShift(copiedShift, cutTimeProps);

    if (copiedShift.cuttingAfterMidnight) {
      this.shiftWeekdaysForward(copiedShift);
    }

    selectedShift.status = ShiftStatus.SplitShift;

    selectedShift.workTime = this.workTimeCalculator.calculateWorkTime(
      selectedShift.internalStartShift,
      selectedShift.internalEndShift
    );
    copiedShift.workTime = this.workTimeCalculator.calculateWorkTime(
      copiedShift.internalStartShift,
      copiedShift.internalEndShift
    );

    return {
      originalShift: selectedShift,
      newShift: copiedShift,
    };
  }

  cutByWeekdays(params: CutByWeekdaysParams): CutResult {
    const { selectedShift, weekdays } = params;

    const copiedShift = this.copyShift(selectedShift);
    this.restoreOwnTimeObjects(copiedShift);

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
    this.restoreOwnTimeObjects(copiedShift);

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
    const value = cloneObject<Shift>(shift);
    if (value) {
      if (value.fromDate) {
        value.internalFromDate = transformDateToNgbDateStruct(value.fromDate);
      }

      if (value.untilDate) {
        value.internalUntilDate = transformDateToNgbDateStruct(value.untilDate);
      }
    }
    return value;
  }

  private restoreOwnTimeObjects(shift: Shift): void {
    if (shift.startShift) {
      shift.internalStartShift = transformStringToOwnTimeStruct(
        shift.startShift
      );
    }

    if (shift.endShift) {
      shift.internalEndShift = transformStringToOwnTimeStruct(shift.endShift);
    }

    if (shift.afterShift) {
      shift.internalAfterShift = transformStringToOwnTimeStruct(
        shift.afterShift
      );
    }

    if (shift.beforeShift) {
      shift.internalBeforeShift = transformStringToOwnTimeStruct(
        shift.beforeShift
      );
    }

    if (shift.travelTimeAfter) {
      shift.internalTravelTimeAfter = transformStringToOwnTimeStruct(
        shift.travelTimeAfter
      );
    }

    if (shift.travelTimeBefore) {
      shift.internalTravelTimeBefore = transformStringToOwnTimeStruct(
        shift.travelTimeBefore
      );
    }

    if (shift.briefingTime) {
      shift.internalBriefingTime = transformStringToOwnTimeStruct(
        shift.briefingTime
      );
    }

    if (shift.debriefingTime) {
      shift.internalDebriefingTime = transformStringToOwnTimeStruct(
        shift.debriefingTime
      );
    }
  }

  private prepareCutShift(copiedShift: Shift, specificProperties?: any): void {
    copiedShift.parentId = copiedShift.id;
    copiedShift.id = newGuid();
    copiedShift.isNew = true;

    if (specificProperties) {
      Object.assign(copiedShift, specificProperties);
    }

    this.ensureDateSync(copiedShift);
  }

  private ensureDateSync(shift: Shift): void {
    if (shift.fromDate && !shift.internalFromDate) {
      shift.internalFromDate = transformDateToNgbDateStruct(shift.fromDate);
    }

    if (shift.internalFromDate && !shift.fromDate) {
      shift.fromDate =
        transformNgbDateStructToDate(shift.internalFromDate) ?? new Date();
    }

    if (shift.untilDate && !shift.internalUntilDate) {
      shift.internalUntilDate = transformDateToNgbDateStruct(shift.untilDate);
    }

    if (shift.internalUntilDate && !shift.untilDate) {
      shift.untilDate = transformNgbDateStructToDate(shift.internalUntilDate);
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
