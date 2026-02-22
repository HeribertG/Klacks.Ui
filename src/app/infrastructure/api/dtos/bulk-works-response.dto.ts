// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { BulkScheduleEntryResponse } from './bulk-schedule-entry-response.dto';
import { ShiftDatePair } from './shift-date-pair.dto';

export interface BulkWorksResponse extends BulkScheduleEntryResponse {
  affectedShifts: ShiftDatePair[];
}
