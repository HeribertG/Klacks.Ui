// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ExportFormatResource } from 'src/app/infrastructure/api/period-closing/models/export-format-resource';

export interface FormatFamilyView {
  brand: string;
  orders?: ExportFormatResource;
  payroll?: ExportFormatResource;
  isGroup: boolean;
  single?: ExportFormatResource;
}
