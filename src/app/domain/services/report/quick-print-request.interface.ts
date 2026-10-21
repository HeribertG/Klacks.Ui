// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ReportFetchParams } from './report-fetch-params.interface';

export interface QuickPrintRequest {
  sourceId: string;
  fallbackDataSetIds: string[];
  params: ReportFetchParams;
  groupName?: string;
}
