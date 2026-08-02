// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Assembles the spreadsheet request of a report: one sheet per table section, with the same
 * columns, values, row filter and grouping the PDF and the CSV use.
 * @param template - Template that defines the sections and columns
 * @param provider - Data provider that resolves the field values
 * @param data - Rows fetched for the report
 * @param parameterContext - Parameter definitions and the values entered when executing
 */

import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { ReportTemplate } from 'src/app/domain/models/report/report-template.model';
import { ReportSection, ReportSectionType } from 'src/app/domain/models/report/report-section.model';
import { ReportField, ReportFieldType } from 'src/app/domain/models/report/report-field.model';
import { ReportXlsxRequest, ReportXlsxSheet } from 'src/app/domain/models/report/report-xlsx.model';
import { resolveReportFieldLabel } from 'src/app/domain/helpers/report-field-label.helper';
import { selectRowsForSection } from 'src/app/domain/helpers/report-section-rows.helper';
import { buildParameterVariables } from 'src/app/domain/helpers/report-parameter.helper';
import { ReportData, ReportDataProvider } from './report-data-provider.service';
import { FormulaEvaluationService } from './formula-evaluation.service';
import { ReportParameterContext, ReportRowFilterService } from './report-row-filter.service';

const FALLBACK_NAME = 'report';
const FALLBACK_SHEET_NAME = 'Report';
const FORMULA_ERROR = '#ERR';

type ReportRow = Record<string, unknown>;

@Injectable({ providedIn: 'root' })
export class ReportXlsxService {
  private translate = inject(TranslateService);
  private formulaService = inject(FormulaEvaluationService);
  private rowFilterService = inject(ReportRowFilterService);

  buildRequest(
    template: ReportTemplate,
    provider: ReportDataProvider,
    data: ReportData,
    parameterContext?: ReportParameterContext
  ): ReportXlsxRequest {
    const sections = (template.sections ?? [])
      .filter(s => s.visible && s.fields.length > 0 && this.isTableSection(s))
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return {
      fileName: this.buildFileName(template),
      sheets: sections.map((section, index) =>
        this.buildSheet(template, section, provider, data.rows ?? [], parameterContext, index)
      ),
    };
  }

  buildFileName(template: ReportTemplate): string {
    const base = (template.name || FALLBACK_NAME)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return base || FALLBACK_NAME;
  }

  private isTableSection(section: ReportSection): boolean {
    return section.type !== ReportSectionType.Header && section.type !== ReportSectionType.Footer;
  }

  private buildSheet(
    template: ReportTemplate,
    section: ReportSection,
    provider: ReportDataProvider,
    rows: ReportRow[],
    parameterContext: ReportParameterContext | undefined,
    index: number
  ): ReportXlsxSheet {
    const fields = [...section.fields].sort((a, b) => a.sortOrder - b.sortOrder);
    const sectionRows = selectRowsForSection(section, rows, template.sourceId);
    const visibleRows = this.rowFilterService.filterRows(section, sectionRows, provider, parameterContext);
    const groupColumnIndex = section.groupBy
      ? fields.findIndex(f => f.dataBinding === section.groupBy)
      : -1;

    return {
      name: section.title?.trim() || `${FALLBACK_SHEET_NAME} ${index + 1}`,
      columns: fields.map(field => ({
        header: this.label(field, template),
        type: field.type,
      })),
      rows: visibleRows.map(row =>
        fields.map(field => this.resolveValue(field, row, provider, parameterContext))
      ),
      groupColumnIndex: groupColumnIndex >= 0 ? groupColumnIndex : undefined,
      subtotals: !!section.groupSubtotals && groupColumnIndex >= 0,
    };
  }

  private label(field: ReportField, template: ReportTemplate): string {
    return resolveReportFieldLabel(field, template, key => this.translate.instant(key), false);
  }

  private resolveValue(
    field: ReportField,
    row: ReportRow,
    provider: ReportDataProvider,
    parameterContext: ReportParameterContext | undefined
  ): string {
    if (field.type === ReportFieldType.Formula && field.formula) {
      const variables = {
        ...(provider.buildFormulaVariables ? provider.buildFormulaVariables(row) : {}),
        ...buildParameterVariables(parameterContext?.parameters, parameterContext?.values),
      };
      try {
        return this.formulaService.evaluateFormula(field.formula, variables);
      } catch {
        return FORMULA_ERROR;
      }
    }
    return provider.resolveFieldValue(field, row) ?? '';
  }
}
