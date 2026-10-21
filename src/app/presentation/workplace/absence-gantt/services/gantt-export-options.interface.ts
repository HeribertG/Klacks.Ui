// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface GanttExportOptions {
  title?: string;
  includeAllRows?: boolean;
  startRow?: number;
  endRow?: number;
  pageOrientation?: 'landscape' | 'portrait';
  pageFormat?: 'a3' | 'a4';
}
