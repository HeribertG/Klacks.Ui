// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IScheduleCell } from 'src/app/domain/models/schedule/schedule-cell.interface';

export interface EntryRect {
  entry: IScheduleCell;
  mainCol: number;
  yStart: number;
  yEnd: number;
}
