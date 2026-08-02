// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Exports a report as CSV, for further processing in payroll or spreadsheet tools.
 * Uses the same column and value resolution as the PDF renderer, so both outputs agree.
 * @param template - Template that defines the columns
 * @param provider - Data provider that resolves the field values
 * @param data - Rows and clients fetched for the report
 */

import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { ReportTemplate } from 'src/app/domain/models/report/report-template.model';
import { ReportSection, ReportSectionType } from 'src/app/domain/models/report/report-section.model';
import { ReportField, ReportFieldType } from 'src/app/domain/models/report/report-field.model';
import { resolveReportFieldLabel } from 'src/app/domain/helpers/report-field-label.helper';
import { ReportData, ReportDataProvider } from './report-data-provider.service';
import { FormulaEvaluationService } from './formula-evaluation.service';
import { CSV_LINE_BREAK, CSV_UTF8_BOM, buildCsvRow, escapeCsvValue } from 'src/app/domain/helpers/csv.helper';

const LINE_BREAK = CSV_LINE_BREAK;
const UTF8_BOM = CSV_UTF8_BOM;
const CSV_MIME_TYPE = 'text/csv;charset=utf-8';
const FORMULA_ERROR = '#ERR';

type ReportRow = Record<string, unknown>;

@Injectable({ providedIn: 'root' })
export class ReportCsvService {
  private translate = inject(TranslateService);
  private formulaService = inject(FormulaEvaluationService);

  /**
   * Builds one CSV per table section, separated by a blank line when a report has several.
   * The byte order mark makes spreadsheet tools read the file as UTF-8.
   */
  buildCsv(template: ReportTemplate, provider: ReportDataProvider, data: ReportData): string {
    const sections = (template.sections ?? [])
      .filter(s => s.visible && s.fields.length > 0 && this.isTableSection(s))
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const blocks = sections.map(section => this.buildSectionBlock(template, section, provider, data.rows ?? []));
    return UTF8_BOM + blocks.filter(block => block.length > 0).join(LINE_BREAK + LINE_BREAK) + LINE_BREAK;
  }

  buildBlob(content: string): Blob {
    return new Blob([content], { type: CSV_MIME_TYPE });
  }

  buildFileName(template: ReportTemplate): string {
    const base = (template.name || 'report')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `${base || 'report'}.csv`;
  }

  private isTableSection(section: ReportSection): boolean {
    return section.type !== ReportSectionType.Header && section.type !== ReportSectionType.Footer;
  }

  private buildSectionBlock(
    template: ReportTemplate,
    section: ReportSection,
    provider: ReportDataProvider,
    rows: ReportRow[]
  ): string {
    const fields = [...section.fields].sort((a, b) => a.sortOrder - b.sortOrder);
    const lines: string[] = [];

    if (section.title?.trim()) {
      lines.push(escapeCsvValue(section.title.trim()));
    }

    lines.push(buildCsvRow(fields.map(f => this.label(f, template))));

    for (const row of rows) {
      lines.push(buildCsvRow(fields.map(f => this.resolveValue(f, row, provider))));
    }

    return lines.join(LINE_BREAK);
  }

  private label(field: ReportField, template: ReportTemplate): string {
    return resolveReportFieldLabel(field, template, key => this.translate.instant(key), false);
  }

  private resolveValue(field: ReportField, row: ReportRow, provider: ReportDataProvider): string {
    if (field.type === ReportFieldType.Formula && field.formula) {
      const variables = provider.buildFormulaVariables ? provider.buildFormulaVariables(row) : {};
      try {
        return this.formulaService.evaluateFormula(field.formula, variables);
      } catch {
        return FORMULA_ERROR;
      }
    }
    return provider.resolveFieldValue(field, row) ?? '';
  }

}
