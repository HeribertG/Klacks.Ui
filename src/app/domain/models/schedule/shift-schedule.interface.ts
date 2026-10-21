// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ShiftSporadic } from '../../enums/shift-sporadic.enum';
import { SporadicStatus } from '../../enums/sporadic-status.enum';
import { IScheduleQualification } from './schedule-qualification.interface';

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
  periodBookedDays: number;
  qualifications: IScheduleQualification[];
}
