// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

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
import { CutDateParams } from './cut-date-params.interface';
import { CutTimeParams } from './cut-time-params.interface';
import { CutWeekdayParams } from './cut-weekday-params.interface';
import { CutStaffParams } from './cut-staff-params.interface';
import { CutTaskParams } from './cut-task-params.interface';
import { CutEnabledFlags } from './cut-enabled-flags.interface';
import { OwnTime } from 'src/app/domain/models/schedule/own-time-class';

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
