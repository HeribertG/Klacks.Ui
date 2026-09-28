// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ExportFormatResource } from 'src/app/infrastructure/api/period-closing/models/export-format-resource';

export interface FormatFamilyView {
  brand: string;
  orders?: ExportFormatResource;
  payroll?: ExportFormatResource;
  isGroup: boolean;
  single?: ExportFormatResource;
}
