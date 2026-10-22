// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ExportFormat } from './export-format';

export interface IOrderRangeExportFilter {
  fromDate: string;
  untilDate: string;
  format: ExportFormat;
  language: string;
  currencyCode: string;
}
