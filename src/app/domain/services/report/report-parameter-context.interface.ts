// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ReportParameter, ReportParameterValues } from 'src/app/domain/models/report/report-parameter.model';

export interface ReportParameterContext {
  parameters?: ReportParameter[];
  values?: ReportParameterValues;
}
