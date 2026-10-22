// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ExportFormatOption } from './export-format-option';

export interface ExportFormatCatalog {
  orderFormats: ExportFormatOption[];
  employeeFormats: ExportFormatOption[];
  payrollFormatKeys: Set<string>;
}
