// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ReportTemplate } from 'src/app/domain/models/report/report-template.model';

export interface ReportTemplateFile {
  format: string;
  version: number;
  template: ReportTemplate;
}
