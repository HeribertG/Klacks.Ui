// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ReportParameter } from 'src/app/domain/models/report/report-parameter.model';
import { ReportParameterValues } from 'src/app/domain/models/report/report-parameter-values.type';

export interface ReportParameterContext {
  parameters?: ReportParameter[];
  values?: ReportParameterValues;
}
