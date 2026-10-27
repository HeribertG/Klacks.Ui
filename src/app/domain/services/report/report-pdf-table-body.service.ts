// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Builds the content of a report table: resolved and formula cells, sorting, day merging, grouping with subtotals,
 * free text rows and the table footer row.
 * @param fields - Table columns in display order
 * @param rows - Rows of the section after the row filter
 * @param provider - Data provider that resolves the cell values and the formula variables
 * @param parameterContext - Report parameters and the values entered when executing
 */

import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CellDef, CellInput, RowInput } from 'jspdf-autotable';

import { ReportTemplate } from '../../models/report/report-template.model';
import { ReportSection } from '../../models/report/report-section.model';
import { ReportField } from '../../models/report/report-field.model';
import { ReportFieldType } from '../../models/report/report-field-type.enum';
import { TextAlignment } from '../../models/report/text-alignment.enum';
import { IScheduleCell } from '../../models/schedule/schedule-cell.interface';
import { FOOTER_TO_COLUMN_MAP } from '../../models/report/report-footer-mapping.constants';
import { resolveReportFieldLabel } from '../../helpers/report-field-label.helper';
import { buildParameterVariables } from '../../helpers/report-parameter.helper';
import { hexToRgbArray, resolveReportHalign, toJsPdfFontStyle } from '../../helpers/report-pdf-style.helper';
import { calendarDateKey } from 'src/app/domain/helpers/calendar-date.helper';
import { ICompiledScript } from 'src/app/domain/models/automation/rules/compiled-script.interface';
import { isDocumentRtl } from '../shared/report-pdf-drawing.helper';
import { ReportDataProvider } from './report-data-provider.interface';
import { ReportRow } from './report-row.type';
import { ReportParameterContext } from './report-parameter-context.interface';
import { ResolvedReportRow } from './resolved-report-row.interface';
import { FormulaEvaluationService } from './formula-evaluation.service';

const FORMULA_ERROR = '#ERR';
const DEFAULT_BINDING_SEPARATOR = '\n';
const DATE_PARTS = 3;
const GROUP_HEADER_FILL: [number, number, number] = [222, 230, 238];
const GROUP_FOOTER_FILL: [number, number, number] = [240, 240, 240];
const SUBTOTAL_DECIMALS = 2;
const DAY_HEADER_BINDINGS = new Set(['entry.date', 'entry.weekday', 'expense.date']);

@Injectable({ providedIn: 'root' })
export class ReportPdfTableBodyService {
  private translate = inject(TranslateService);
  private formulaService = inject(FormulaEvaluationService);

  compileTableFormulas(fields: ReportField[]): Map<string, ICompiledScript> {
    const compiledFormulas = new Map<string, ICompiledScript>();
    const formulaFields = fields.filter(f => f.type === ReportFieldType.Formula && f.formula);
    for (const f of formulaFields) {
      compiledFormulas.set(f.dataBinding, this.formulaService.compileFormula(f.formula!));
    }
    return compiledFormulas;
  }

  resolveTableRows(
    fields: ReportField[],
    rows: ReportRow[],
    provider: ReportDataProvider,
    compiledFormulas: Map<string, ICompiledScript>,
    parameterContext: ReportParameterContext | undefined
  ): ResolvedReportRow[] {
    const resolvedRows: ResolvedReportRow[] = [];
    const parameterVars = buildParameterVariables(parameterContext?.parameters, parameterContext?.values);
    for (const entry of rows) {
      const row: Record<string, string> = {};
      const formulaVars = compiledFormulas.size > 0 && provider.buildFormulaVariables
        ? { ...provider.buildFormulaVariables(entry), ...parameterVars } : undefined;

      fields.forEach(f => {
        if (f.type === ReportFieldType.Formula && f.formula) {
          const compiled = compiledFormulas.get(f.dataBinding);
          if (compiled && formulaVars) {
            try {
              row[f.dataBinding] = this.formulaService.executeCompiled(compiled, formulaVars);
            } catch {
              row[f.dataBinding] = FORMULA_ERROR;
            }
          } else {
            row[f.dataBinding] = '';
          }
          return;
        }

        const primary = provider.resolveFieldValue(f, entry);
        if (f.additionalBindings?.length) {
          const separator = f.bindingSeparator ?? DEFAULT_BINDING_SEPARATOR;
          const parts = [primary];
          for (const binding of f.additionalBindings) {
            const tempField: ReportField = { ...f, dataBinding: binding };
            const val = provider.resolveFieldValue(tempField, entry);
            if (val) parts.push(val);
          }
          const unique = [...new Set(parts.filter(p => p))];
          row[f.dataBinding] = unique.join(separator);
        } else {
          row[f.dataBinding] = primary;
        }
      });
      resolvedRows.push({ row, sourceEntry: entry });
    }
    return resolvedRows;
  }

  sortResolvedRows(fields: ReportField[], resolvedRows: ResolvedReportRow[]): void {
    const sortFields = fields
      .filter(f => f.sortDirection === 'asc' || f.sortDirection === 'desc')
      .sort((a, b) => a.sortOrder - b.sortOrder);

    if (sortFields.length === 0) {
      return;
    }

    resolvedRows.sort(({ row: a }, { row: b }) => {
      for (const f of sortFields) {
        const valA = a[f.dataBinding] ?? '';
        const valB = b[f.dataBinding] ?? '';
        let cmp = 0;
        if (f.type === ReportFieldType.Date) {
          cmp = this.parseDMY(valA) - this.parseDMY(valB);
        } else if (f.type === ReportFieldType.Number || f.type === ReportFieldType.Currency) {
          cmp = (parseFloat(valA) || 0) - (parseFloat(valB) || 0);
        } else {
          cmp = valA.localeCompare(valB, undefined, { sensitivity: 'base' });
        }
        if (cmp !== 0) return f.sortDirection === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
  }

  buildMergedRows(resolvedRows: ResolvedReportRow[], fields: ReportField[], bodyData: RowInput[]): void {
    const groups = new Map<string, Record<string, string>[]>();
    const groupOrder: string[] = [];
    for (const { row, sourceEntry } of resolvedRows) {
      const key = calendarDateKey((sourceEntry as IScheduleCell).entryDate);
      if (!groups.has(key)) {
        groups.set(key, []);
        groupOrder.push(key);
      }
      groups.get(key)!.push(row);
    }
    for (const key of groupOrder) {
      const groupRows = groups.get(key)!;
      if (groupRows.length === 1) {
        bodyData.push(groupRows[0]);
      } else {
        const merged: Record<string, string> = {};
        for (const f of fields) {
          const values = groupRows.map(r => r[f.dataBinding]);
          if (DAY_HEADER_BINDINGS.has(f.dataBinding)) {
            const unique = [...new Set(values.filter(v => v))];
            merged[f.dataBinding] = unique[0] ?? '';
          } else {
            merged[f.dataBinding] = values.join('\n');
          }
        }
        bodyData.push(merged);
      }
    }
  }

  /**
   * Emits the rows grouped by the configured column, with a group caption before each
   * block and an optional subtotal row that sums the numeric columns of that block.
   */
  buildGroupedRows(
    section: ReportSection,
    fields: ReportField[],
    resolvedRows: { row: Record<string, string> }[],
    bodyData: RowInput[]
  ): void {
    const groupBinding = section.groupBy!;
    const groupField = fields.find(f => f.dataBinding === groupBinding);
    const groups = new Map<string, Record<string, string>[]>();

    for (const { row } of resolvedRows) {
      const key = String(row[groupBinding] ?? '');
      const bucket = groups.get(key);
      if (bucket) {
        bucket.push(row);
      } else {
        groups.set(key, [row]);
      }
    }

    const numericFields = fields.filter(
      f => f.type === ReportFieldType.Number || f.type === ReportFieldType.Currency
    );

    for (const [key, groupRows] of groups) {
      bodyData.push([{
        content: this.buildGroupCaption(groupField, key, groupRows.length),
        colSpan: fields.length,
        styles: {
          fontStyle: 'bold',
          fillColor: GROUP_HEADER_FILL,
          halign: resolveReportHalign(TextAlignment.Left, isDocumentRtl()),
        },
      }]);

      bodyData.push(...groupRows);

      if (section.groupSubtotals && numericFields.length > 0) {
        bodyData.push(this.buildSubtotalRow(fields, numericFields, groupRows));
      }
    }
  }

  buildFreeTextRows(
    section: ReportSection,
    fields: ReportField[],
    position: 'before' | 'after',
    bodyData: RowInput[]
  ): void {
    const freeRows = (section.freeTextRows ?? []).filter(r => r.position === position);
    for (const freeRow of freeRows) {
      bodyData.push([{
        content: freeRow.text,
        colSpan: fields.length,
        styles: {
          fontStyle: toJsPdfFontStyle(freeRow.style.bold, freeRow.style.italic),
          fontSize: freeRow.style.fontSize,
          textColor: hexToRgbArray(freeRow.style.textColor),
          halign: resolveReportHalign(freeRow.style.alignment, isDocumentRtl()),
        },
      }]);
    }
  }

  buildTableFooter(
    section: ReportSection,
    fields: ReportField[],
    rows: ReportRow[],
    provider: ReportDataProvider,
    template: ReportTemplate,
    parameterContext: ReportParameterContext | undefined
  ): RowInput[] | undefined {
    if (!section.tableFooterFields || section.tableFooterFields.length === 0) return undefined;

    const footRow: CellInput[] = fields.map(() => '');
    const footerFormulaVars = provider.buildFooterFormulaVariables
      ? {
          ...provider.buildFooterFormulaVariables(rows),
          ...buildParameterVariables(parameterContext?.parameters, parameterContext?.values),
        }
      : undefined;

    for (const footerField of section.tableFooterFields) {
      const targetColumn = FOOTER_TO_COLUMN_MAP[footerField.dataBinding];
      const colIndex = targetColumn
        ? fields.findIndex(f => f.dataBinding === targetColumn)
        : footerField.sortOrder;

      let value: string;
      if (footerField.type === ReportFieldType.Formula && footerField.formula) {
        try {
          value = this.formulaService.evaluateFormula(footerField.formula, footerFormulaVars ?? {});
        } catch {
          value = FORMULA_ERROR;
        }
      } else {
        value = provider.resolveFooterValue(footerField, rows);
      }

      if (colIndex >= 0 && colIndex < fields.length) {
        const text = footerField.hideLabel
          ? value
          : `${this.translateFieldName(footerField, template)}: ${value}`;
        const halign = resolveReportHalign(footerField.style.alignment, isDocumentRtl());
        footRow[colIndex] = { content: text, styles: { halign } };
      }
    }
    return [footRow];
  }

  private buildGroupCaption(groupField: ReportField | undefined, key: string, count: number): string {
    const label = groupField?.name?.trim();
    const value = key.length > 0 ? key : this.translate.instant('setting.report.designer.groupEmpty');
    const caption = label ? `${label}: ${value}` : value;
    return `${caption}  (${count})`;
  }

  private buildSubtotalRow(fields: ReportField[], numericFields: ReportField[], groupRows: Record<string, string>[]): RowInput {
    const label = this.translate.instant('setting.report.designer.groupSubtotal');
    const row: CellDef[] = fields.map(() => ({ content: '', styles: { fillColor: GROUP_FOOTER_FILL } }));

    row[0] = {
      content: label,
      styles: { fontStyle: 'bold', fillColor: GROUP_FOOTER_FILL, halign: resolveReportHalign(TextAlignment.Left, isDocumentRtl()) },
    };

    for (const field of numericFields) {
      const index = fields.indexOf(field);
      if (index <= 0) {
        continue;
      }
      const sum = groupRows.reduce((total, row) => total + (parseFloat(row[field.dataBinding]) || 0), 0);
      row[index] = {
        content: sum.toFixed(SUBTOTAL_DECIMALS),
        styles: {
          fontStyle: 'bold',
          fillColor: GROUP_FOOTER_FILL,
          halign: resolveReportHalign(field.style.alignment, isDocumentRtl()),
        },
      };
    }

    return row;
  }

  private translateFieldName(field: ReportField, template: ReportTemplate, withPrefix = true): string {
    return resolveReportFieldLabel(field, template, key => this.translate.instant(key), withPrefix);
  }

  private parseDMY(dmy: string): number {
    const parts = dmy.split('.');
    if (parts.length !== DATE_PARTS) return 0;
    return new Date(+parts[2], +parts[1] - 1, +parts[0]).getTime();
  }
}
