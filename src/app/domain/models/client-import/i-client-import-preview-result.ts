// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ClientImportTarget } from 'src/app/domain/enums/client-import.enums';
import { IClientImportPreviewRow } from './i-client-import-preview-row';
import { IClientImportPreviewSummary } from './i-client-import-preview-summary';

export interface IClientImportPreviewResult {
  rows: IClientImportPreviewRow[];
  summary: IClientImportPreviewSummary;
  unmappedColumns: number[];
  ignoredTargets: ClientImportTarget[];
}
