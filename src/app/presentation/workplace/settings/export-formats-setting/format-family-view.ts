// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ExportFormatResource } from 'src/app/domain/models/settings/export-format-resource.interface';

export interface FormatFamilyView {
  brand: string;
  orders?: ExportFormatResource;
  payroll?: ExportFormatResource;
  isGroup: boolean;
  single?: ExportFormatResource;
}
