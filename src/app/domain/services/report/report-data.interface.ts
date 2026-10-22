// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ReportClient } from './report-client.interface';
import { ReportMetadata } from './report-metadata.interface';
import { ReportRow } from './report-row.type';

export interface ReportData<TRow extends ReportRow = ReportRow> {
  rows: TRow[];
  clients?: ReportClient[];
  metadata?: ReportMetadata;
}
