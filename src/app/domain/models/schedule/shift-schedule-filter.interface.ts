// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

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
