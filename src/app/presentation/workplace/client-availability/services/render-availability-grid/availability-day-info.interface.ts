// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface AvailabilityDayInfo {
  dateString: string;
  startHours: number[];
  endHours: number[];
  isWeekend: boolean;
  isSunday: boolean;
  isHoliday: boolean;
  isOfficialHoliday: boolean;
}
