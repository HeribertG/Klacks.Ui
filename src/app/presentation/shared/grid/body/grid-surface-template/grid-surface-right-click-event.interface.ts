// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IScheduleCell } from 'src/app/domain/models/schedule/schedule-cell.interface';

export interface GridSurfaceRightClickEvent {
  row: number;
  column: number;
  clientX: number;
  clientY: number;
  source: 'canvas' | 'input';
  entry?: IScheduleCell | null;
}
