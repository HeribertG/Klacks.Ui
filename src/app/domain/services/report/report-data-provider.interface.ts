// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @typescript-eslint/no-explicit-any */

import { ReportFetchParams } from './report-fetch-params.interface';
import { ReportData } from './report-data.interface';
import { ReportField } from '../../models/report/report-field.model';
import { ReportHeaderContext } from './report-header-context.interface';

export interface ReportDataProvider {
  fetchData(params: ReportFetchParams): Promise<ReportData>;
  resolveFieldValue(field: ReportField, row: any): string;
  resolveHeaderValue(field: ReportField, context: ReportHeaderContext): string;
  resolveFooterValue(field: ReportField, rows: any[]): string;
  buildFormulaVariables?(row: any): Record<string, unknown>;
  buildFooterFormulaVariables?(rows: any[]): Record<string, unknown>;
  collectResolvedLabelTexts?(): string[];
}
