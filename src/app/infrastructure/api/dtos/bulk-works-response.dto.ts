// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { BulkScheduleEntryResponse } from './bulk-schedule-entry-response.dto';
import { ShiftDatePair } from './shift-date-pair.dto';

export interface BulkWorksResponse extends BulkScheduleEntryResponse {
  affectedShifts: ShiftDatePair[];
}
