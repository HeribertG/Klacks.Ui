// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ExportFormatFamily } from 'src/app/domain/models/settings/export-format-family.type';
import { ExportFormatOverrideOption } from './export-format-override-option.interface';

export interface ExportFormatGroup {
  family: ExportFormatFamily;
  labelKey: string;
  options: ExportFormatOverrideOption[];
}
