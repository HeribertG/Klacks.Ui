// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { DayCapacity } from './day-capacity.interface';

export interface ShiftRowData {
  shiftId: string;
  shiftName: string;
  abbreviation: string;
  startShift: string;
  endShift: string;
  workTime: number;
  activeDays: Map<string, DayCapacity>;
}
