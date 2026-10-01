// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IClientImportPreviewSummary {
  total: number;
  ready: number;
  skipped: number;
  errors: number;
  duplicates: number;
  warnings: number;
}
