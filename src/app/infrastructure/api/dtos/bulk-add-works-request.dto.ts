// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { BulkAddWorkItem } from './bulk-work-item.dto';

export interface BulkAddWorksRequest {
  works: BulkAddWorkItem[];
  periodStart: string;
  periodEnd: string;
}
