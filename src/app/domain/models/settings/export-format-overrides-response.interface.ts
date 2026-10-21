// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IExportFormatOverrideEntry } from './export-format-override-entry.interface';

export interface IExportFormatOverridesResponse {
  currentVersion: string;
  formats: IExportFormatOverrideEntry[];
}
