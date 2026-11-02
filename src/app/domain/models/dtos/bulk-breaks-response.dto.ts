// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { BulkScheduleEntryResponse } from './bulk-schedule-entry-response.dto';
import { RemovableWork } from './removable-work.dto';

export interface BulkBreaksResponse extends BulkScheduleEntryResponse {
  takenWorks?: RemovableWork[];
}
