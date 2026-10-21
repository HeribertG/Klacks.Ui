// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IScheduleCell } from 'src/app/domain/models/schedule/schedule-cell.interface';

export interface TimelineClientBlock {
  name: string;
  slot1: string;
  slot2: string;
  slot3: string;
  todayEntries: IScheduleCell[][];
  overflowEntries: IScheduleCell[][];
}
