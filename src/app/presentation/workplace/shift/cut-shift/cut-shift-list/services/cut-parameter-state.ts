// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * State object for all cut parameters of the CutShiftListComponent.
 * Completely recreated on reset or shift change.
 * @param date - Parameters for Cut-by-Date (cutDate, resetDate, minDate, maxDate)
 * @param time - Parameters for Cut-by-Time (cutTimeShift, minTimeShift, maxTimeShift, isOverMidnight, is24Hours)
 * @param weekdays - Selected weekdays and their enabled status
 * @param staff - Parameters for Cut-by-Staff (staffCount, minStaffCount, maxStaffCount)
 * @param task - Parameters for Cut-by-Task (taskCount, minTaskCount, maxTaskCount)
 * @param enabledFlags - Enabled status of individual cut strategies
 */
import { NgbDate, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';

export interface CutDateParams {
  cutDate: NgbDateStruct | null;
  resetDate: NgbDateStruct | null;
  minDate: NgbDate | undefined;
  maxDate: NgbDate | undefined;
}

export interface CutTimeParams {
  cutTimeShift: OwnTime;
  minTimeShift: OwnTime | null;
  maxTimeShift: OwnTime | null;
  isOverMidnight: boolean;
  is24Hours: boolean;
}

export interface CutWeekdaySelection {
  isMonday: boolean;
  isTuesday: boolean;
  isWednesday: boolean;
  isThursday: boolean;
  isFriday: boolean;
  isSaturday: boolean;
  isSunday: boolean;
}

export interface CutWeekdayParams {
  weekdays: CutWeekdaySelection;
  isMondayEnabled: boolean;
  isTuesdayEnabled: boolean;
  isWednesdayEnabled: boolean;
  isThursdayEnabled: boolean;
  isFridayEnabled: boolean;
  isSaturdayEnabled: boolean;
  isSundayEnabled: boolean;
}

export interface CutStaffParams {
  staffCount: number;
  minStaffCount: number;
  maxStaffCount: number;
}

export interface CutTaskParams {
  taskCount: number;
  minTaskCount: number;
  maxTaskCount: number;
}

export interface CutEnabledFlags {
  isCutDateEnabled: boolean;
  isCutTimeEnabled: boolean;
  isCutWeekdaysEnabled: boolean;
  isCutStaffEnabled: boolean;
  isCutTaskEnabled: boolean;
  isResetCutsEnabled: boolean;
}

export interface CutParameterState {
  date: CutDateParams;
  time: CutTimeParams;
  weekdays: CutWeekdayParams;
  staff: CutStaffParams;
  task: CutTaskParams;
  enabled: CutEnabledFlags;
}

export function createDefaultCutParameterState(): CutParameterState {
  return {
    date: {
      cutDate: null,
      resetDate: null,
      minDate: undefined,
      maxDate: undefined,
    },
    time: {
      cutTimeShift: OwnTime.forTime(),
      minTimeShift: null,
      maxTimeShift: null,
      isOverMidnight: false,
      is24Hours: false,
    },
    weekdays: {
      weekdays: {
        isMonday: false,
        isTuesday: false,
        isWednesday: false,
        isThursday: false,
        isFriday: false,
        isSaturday: false,
        isSunday: false,
      },
      isMondayEnabled: false,
      isTuesdayEnabled: false,
      isWednesdayEnabled: false,
      isThursdayEnabled: false,
      isFridayEnabled: false,
      isSaturdayEnabled: false,
      isSundayEnabled: false,
    },
    staff: {
      staffCount: 1,
      minStaffCount: 1,
      maxStaffCount: 100,
    },
    task: {
      taskCount: 1,
      minTaskCount: 1,
      maxTaskCount: 50,
    },
    enabled: {
      isCutDateEnabled: false,
      isCutTimeEnabled: false,
      isCutWeekdaysEnabled: false,
      isCutStaffEnabled: false,
      isCutTaskEnabled: false,
      isResetCutsEnabled: false,
    },
  };
}
