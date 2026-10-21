// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ScheduleDataService } from './schedule-data.service';
import { IScheduleCell } from 'src/app/domain/models/schedule/schedule-cell.interface';

export interface ContextMenuContext {
  row: number;
  column: number;
  dataService: ScheduleDataService;
  entry?: IScheduleCell | null;
}
