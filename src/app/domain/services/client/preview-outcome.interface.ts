// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IClientImportPreviewResult } from 'src/app/domain/models/client-import/i-client-import-preview-result';

export interface PreviewOutcome {
  result: IClientImportPreviewResult | null;
  errorCode?: string | null;
}
