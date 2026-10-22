// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ReportClient } from './report-client.interface';
import { ReportMetadata } from './report-metadata.interface';

export interface ReportHeaderContext {
  client?: ReportClient;
  groupName?: string;
  startDate?: string;
  endDate?: string;
  metadata?: ReportMetadata;
}
