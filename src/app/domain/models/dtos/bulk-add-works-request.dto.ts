// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { BulkAddWorkItem } from './bulk-work-item.dto';

export interface BulkAddWorksRequest {
  works: BulkAddWorkItem[];
  periodStart: string;
  periodEnd: string;
}
