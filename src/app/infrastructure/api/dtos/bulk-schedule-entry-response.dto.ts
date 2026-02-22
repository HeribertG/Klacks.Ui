// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { IPeriodHours } from 'src/app/domain/models/schedule/work-schedule-class';

export interface BulkScheduleEntryResponse {
  successCount: number;
  failedCount: number;
  createdIds: string[];
  deletedIds: string[];
  periodHours?: Record<string, IPeriodHours>;
}
