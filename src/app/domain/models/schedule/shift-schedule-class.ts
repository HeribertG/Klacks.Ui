// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ShiftSporadic } from '../../enums/shift-sporadic.enum';
import { SporadicStatus } from '../../enums/sporadic-status.enum';
import { IScheduleQualification } from './work-schedule-class';

export interface IShiftSchedule {
  shiftId: string;
  date: Date;
  dayOfWeek: number;
  shiftName: string;
  abbreviation: string;
  startShift: string;
  endShift: string;
  workTime: number;
  isSporadic: boolean;
  isTimeRange: boolean;
  shiftType: number;
  isInTemplateContainer: boolean;
  sumEmployees: number;
  quantity: number;
  sporadicScope: ShiftSporadic;
  engaged: number;
  sporadicStatus: SporadicStatus;
  qualifications: IScheduleQualification[];
}

export class ShiftSchedule implements IShiftSchedule {
  shiftId = '';
  date: Date = new Date();
  dayOfWeek = 0;
  shiftName = '';
  abbreviation = '';
  startShift = '';
  endShift = '';
  workTime = 0;
  isSporadic = false;
  isTimeRange = false;
  shiftType = 0;
  isInTemplateContainer = false;
  sumEmployees = 0;
  quantity = 0;
  sporadicScope = ShiftSporadic.Week;
  engaged = 0;
  sporadicStatus = SporadicStatus.None;
  qualifications: IScheduleQualification[] = [];
}

export interface IShiftScheduleFilter {
  startDate: string;
  endDate: string;
  holidayDates?: Date[];
  selectedGroup?: string;
  searchString?: string;
  orderBy?: string;
  sortOrder?: string;
  container: boolean;
  isSporadic: boolean;
  isTimeRange: boolean;
  isStandartShift: boolean;
  showUngroupedShifts: boolean;
  startRow: number;
  rowCount: number;
  analyseToken?: string;
}

export interface IShiftDatePair {
  shiftId: string;
  date: Date;
}

export interface IShiftSchedulePartialFilter {
  shiftDatePairs: IShiftDatePair[];
  analyseToken?: string;
}

export interface IShiftScheduleResponse {
  shifts: IShiftSchedule[];
  totalCount: number;
}

export class ShiftScheduleFilter implements IShiftScheduleFilter {
  startDate = '';
  endDate = '';
  holidayDates?: Date[];
  selectedGroup?: string;
  searchString?: string;
  orderBy?: string;
  sortOrder?: string;
  container = true;
  isSporadic = true;
  isTimeRange = true;
  isStandartShift = true;
  showUngroupedShifts = false;
  startRow = 0;
  rowCount = 100;
  analyseToken?: string;
}
