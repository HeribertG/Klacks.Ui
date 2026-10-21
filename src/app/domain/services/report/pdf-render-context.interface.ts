// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { jsPDF } from 'jspdf';
import { ReportTemplate } from '../../models/report/report-template.model';
import { ReportDataProvider } from './report-data-provider.interface';
import { ReportHeaderContext } from './report-header-context.interface';
import { ReportParameterContext } from './report-parameter-context.interface';

export interface PdfRenderContext {
  doc: jsPDF;
  template: ReportTemplate;
  provider: ReportDataProvider;
  headerContext: ReportHeaderContext;
  imageCache: Map<string, string>;
  marginLeft: number;
  contentWidth: number;
  parameterContext?: ReportParameterContext;
}
