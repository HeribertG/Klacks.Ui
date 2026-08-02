// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { jsPDF } from 'jspdf';
import { ReportTemplate } from '../../models/report/report-template.model';
import { ReportDataProvider, ReportHeaderContext } from './report-data-provider.service';
import { ReportParameterContext } from './report-row-filter.service';

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
