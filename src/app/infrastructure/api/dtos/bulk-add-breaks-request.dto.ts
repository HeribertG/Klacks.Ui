// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { BulkAddBreakItem } from './bulk-break-item.dto';

export interface BulkAddBreaksRequest {
  breaks: BulkAddBreakItem[];
  periodStart: string;
  periodEnd: string;
  paymentInterval?: number;
}
