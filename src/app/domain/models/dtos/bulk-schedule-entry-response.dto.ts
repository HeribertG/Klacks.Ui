// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IPeriodHours } from 'src/app/domain/models/schedule/period-hours.interface';

export interface BulkScheduleEntryResponse {
  successCount: number;
  failedCount: number;
  createdIds: string[];
  deletedIds: string[];
  periodHours?: Record<string, IPeriodHours>;
}
