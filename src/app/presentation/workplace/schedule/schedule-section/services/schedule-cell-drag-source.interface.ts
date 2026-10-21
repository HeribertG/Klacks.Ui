// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-entry-type.enum';

export interface ScheduleCellDragSource {
  row: number;
  column: number;
  clientId: string;
  date: Date;
  id: string;
  sourceId: string;
  entryId: string;
  entryType: WorkScheduleEntryType;
  abbreviation: string;
  startTime: string;
  endTime: string;
  startX: number;
  startY: number;
  cellWidth: number;
  cellHeight: number;
  snapshotDataUrl: string | null;
}
