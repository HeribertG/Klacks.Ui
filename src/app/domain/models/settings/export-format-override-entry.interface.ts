// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ExportFormatFamily } from './export-format-family.type';
import { IExportFormatOverride } from './export-format-override.interface';

export interface IExportFormatOverrideEntry {
  formatKey: string;
  family: ExportFormatFamily;
  allowedKeys: string[];
  override: IExportFormatOverride | null;
}
