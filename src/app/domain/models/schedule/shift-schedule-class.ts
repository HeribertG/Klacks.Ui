// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ShiftSporadic } from '../../enums/shift-sporadic.enum';
import { SporadicStatus } from '../../enums/sporadic-status.enum';
import { IShiftSchedule } from './shift-schedule.interface';
import { IScheduleQualification } from './schedule-qualification.interface';

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
  periodBookedDays = 0;
  qualifications: IScheduleQualification[] = [];
}
