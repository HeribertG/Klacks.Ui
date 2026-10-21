// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IShiftScheduleFilter } from './shift-schedule-filter.interface';

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
