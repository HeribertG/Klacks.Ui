// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ReportField } from 'src/app/domain/models/report/report-field.model';

export interface ImageUploadResult {
  field: ReportField;
  success: boolean;
}
