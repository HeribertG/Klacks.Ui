// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ClientImportRowStatus } from 'src/app/domain/enums/client-import.enums';
import { IClientImportIssue } from './i-client-import-issue';
import { IClientImportPreviewRecord } from './i-client-import-preview-record';

export interface IClientImportPreviewRow {
  rowIndex: number;
  status: ClientImportRowStatus;
  record: IClientImportPreviewRecord;
  issues: IClientImportIssue[];
  duplicateOfClientId: string | null;
  duplicateOfName: string | null;
  duplicateOfRowIndex: number | null;
}
