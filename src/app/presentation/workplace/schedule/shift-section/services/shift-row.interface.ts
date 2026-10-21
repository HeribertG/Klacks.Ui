// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ShiftDayInfo } from './shift-day-info.interface';
import { IScheduleQualification } from 'src/app/domain/models/schedule/schedule-qualification.interface';

export interface ShiftRow {
  shiftId: string;
  shiftName: string;
  abbreviation: string;
  startShift: string;
  endShift: string;
  workTime: number;
  activeDays: Map<string, ShiftDayInfo>;
  isSporadic: boolean;
  isTimeRange: boolean;
  shiftType: number;
  qualifications: IScheduleQualification[];
}
