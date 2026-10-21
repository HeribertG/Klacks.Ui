// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import {
  CellValueChangeEvent,
} from 'src/app/presentation/shared/grid/body/grid-surface-template/cell-value-change-event.interface';
import { ScheduleDataService } from './schedule-data.service';
import { IScheduleCell } from 'src/app/domain/models/schedule/schedule-cell.interface';

export interface CellValueContext {
  event: CellValueChangeEvent;
  dataService: ScheduleDataService;
  clientId: string;
  date: Date;
  trimmedValue: string;
  abbreviation: string;
  existingEntry: IScheduleCell | undefined;
}
