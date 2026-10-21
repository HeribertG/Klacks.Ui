// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IScheduleCell } from 'src/app/domain/models/schedule/schedule-cell.interface';

export interface TimelineCellEntries {
  todayEntries: IScheduleCell[];
  overflowEntries: IScheduleCell[];
  availabilityRanges: { startMinutes: number; endMinutes: number }[];
}
