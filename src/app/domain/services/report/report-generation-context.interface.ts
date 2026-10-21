// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ReportTemplate } from '../../models/report/report-template.model';
import { ReportDataProvider } from './report-data-provider.interface';
import { ReportData } from './report-data.interface';
import { ReportParameterValues } from '../../models/report/report-parameter.model';

export interface ReportGenerationContext {
  template: ReportTemplate;
  provider: ReportDataProvider;
  data: ReportData;
  groupName: string;
  startDate: string;
  endDate: string;
  imageCache?: Map<string, string>;
  parameterValues?: ReportParameterValues;
}
