// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ReportFetchParams } from './report-fetch-params.interface';
import { ReportData } from './report-data.interface';
import { ReportField } from '../../models/report/report-field.model';
import { ReportHeaderContext } from './report-header-context.interface';
import { ReportRow } from './report-row.type';

export interface ReportDataProvider<TRow extends ReportRow = ReportRow> {
  fetchData(params: ReportFetchParams): Promise<ReportData<TRow>>;
  resolveFieldValue(field: ReportField, row: TRow): string;
  resolveHeaderValue(field: ReportField, context: ReportHeaderContext): string;
  resolveFooterValue(field: ReportField, rows: TRow[]): string;
  buildFormulaVariables?(row: TRow): Record<string, unknown>;
  buildFooterFormulaVariables?(rows: TRow[]): Record<string, unknown>;
  collectResolvedLabelTexts?(): string[];
}
