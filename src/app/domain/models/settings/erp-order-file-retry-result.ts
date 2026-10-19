// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ErpImportFileStatus } from 'src/app/domain/enums/erp-import-file-status.enum';

export interface IErpOrderFileRetryResult {
  id: string;
  status: ErpImportFileStatus;
  failureReason: string | null;
}
