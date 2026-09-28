// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface BulkDeleteBreaksRequest {
  breakIds: string[];
  periodStart: string;
  periodEnd: string;
}
