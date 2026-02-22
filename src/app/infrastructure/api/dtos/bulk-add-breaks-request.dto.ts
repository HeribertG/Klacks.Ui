// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { BulkAddBreakItem } from './bulk-break-item.dto';

export interface BulkAddBreaksRequest {
  breaks: BulkAddBreakItem[];
  periodStart: string;
  periodEnd: string;
}
