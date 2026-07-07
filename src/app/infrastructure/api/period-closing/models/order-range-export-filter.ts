// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ExportFormat } from './export-format';

export interface IOrderRangeExportFilter {
  fromDate: string;
  untilDate: string;
  format: ExportFormat;
  language: string;
  currencyCode: string;
}
