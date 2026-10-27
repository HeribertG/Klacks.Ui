// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Draws one table section of a report page with jspdf-autotable: title, columns and widths, body, footer row,
 * conditional cell styles and cell borders, mirrored for right-to-left documents.
 * @param ctx - Render context with the document, the template, the provider and the content geometry
 * @param section - Table section of the template
 * @param rows - Rows of the section after the row filter
 * @param yPos - Vertical start position in millimetres
 */

import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import autoTable, { Cell, CellHookData, RowInput } from 'jspdf-autotable';

import { ReportTemplate } from '../../models/report/report-template.model';
import { ReportSection } from '../../models/report/report-section.model';
import { ReportField } from '../../models/report/report-field.model';
import { resolveReportFieldLabel } from '../../helpers/report-field-label.helper';
import { clampWidthPercent, hexToRgbArray, resolveReportHalign, toJsPdfFontStyle } from '../../helpers/report-pdf-style.helper';
import { applyTextColor, drawCellBorders, isDocumentRtl } from '../shared/report-pdf-drawing.helper';
import { ReportDataProvider } from './report-data-provider.interface';
import { ReportRow } from './report-row.type';
import { PdfRenderContext } from './pdf-render-context.interface';
import { ReportParameterContext } from './report-parameter-context.interface';
import { FormulaEvaluationService } from './formula-evaluation.service';
import { ReportFontService } from './report-font.service';
import { ReportRowFilterService } from './report-row-filter.service';
import { ReportPdfTableBodyService } from './report-pdf-table-body.service';
import { PdfColumnStyle } from './pdf-column-style.interface';

const DEFAULT_PDF_FONT = 'helvetica';
const PERCENT = 100;
const SECTION_TITLE_FONT_SIZE = 11;
const SECTION_TITLE_COLOR = '#000000';
const TEXT_BASELINE_FACTOR = 0.35;
const TEXT_HEIGHT_FACTOR = 0.5;
const TITLE_GAP_MM = 2;
const TABLE_FONT_SIZE = 9;
const HEAD_FILL: [number, number, number] = [66, 66, 66];
const HEAD_TEXT: [number, number, number] = [255, 255, 255];
const FOOT_FILL: [number, number, number] = [230, 230, 230];
const FOOT_TEXT: [number, number, number] = [0, 0, 0];
const ALTERNATE_ROW_FILL: [number, number, number] = [245, 245, 245];
const SCHEDULE_SOURCE_ID = 'schedule';
const TRUTHY_CONDITION_RESULTS = ['1', 'true', 'wahr', 'yes'];

@Injectable({ providedIn: 'root' })
export class ReportPdfTableRendererService {
  private translate = inject(TranslateService);
  private formulaService = inject(FormulaEvaluationService);
  private fontService = inject(ReportFontService);
  private rowFilterService = inject(ReportRowFilterService);
  private tableBody = inject(ReportPdfTableBodyService);

  renderTable(ctx: PdfRenderContext, section: ReportSection, rows: ReportRow[], yPos: number): number {
    const widthPercent = clampWidthPercent(section.widthPercent);
    const tableWidth = ctx.contentWidth * (widthPercent / PERCENT);

    if (section.title && section.title.trim().length > 0) {
      yPos = this.renderSectionTitle(ctx, section.title.trim(), tableWidth, yPos);
    }

    const fields = section.fields.sort((a, b) => a.sortOrder - b.sortOrder);
    const columns = this.resolveTableColumns(fields, ctx.template);
    const columnStyles = this.buildColumnStyles(fields, tableWidth);

    const compiledFormulas = this.tableBody.compileTableFormulas(fields);
    const resolvedRows = this.tableBody.resolveTableRows(fields, rows, ctx.provider, compiledFormulas, ctx.parameterContext);
    this.tableBody.sortResolvedRows(fields, resolvedRows);

    const bodyData: RowInput[] = [];
    this.tableBody.buildFreeTextRows(section, fields, 'before', bodyData);

    const sectionShowFullPeriod = section.showFullPeriod ?? ctx.template.showFullPeriod;
    const shouldMerge = (ctx.template.mergeRows || sectionShowFullPeriod) && ctx.template.sourceId === SCHEDULE_SOURCE_ID;
    if (shouldMerge) {
      this.tableBody.buildMergedRows(resolvedRows, fields, bodyData);
    } else if (section.groupBy) {
      this.tableBody.buildGroupedRows(section, fields, resolvedRows, bodyData);
    } else {
      for (const { row } of resolvedRows) {
        bodyData.push(row);
      }
    }

    this.tableBody.buildFreeTextRows(section, fields, 'after', bodyData);
    const foot = this.tableBody.buildTableFooter(section, fields, rows, ctx.provider, ctx.template, ctx.parameterContext);
    const hasBorders = fields.some(f => f.style.cellBorder);

    autoTable(ctx.doc, {
      startY: yPos,
      margin: { left: ctx.marginLeft },
      tableWidth,
      columns,
      body: bodyData,
      foot,
      showFoot: 'lastPage',
      columnStyles: columnStyles as never,
      headStyles: {
        fillColor: HEAD_FILL,
        textColor: HEAD_TEXT,
        fontSize: TABLE_FONT_SIZE,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: TABLE_FONT_SIZE,
      },
      footStyles: {
        fillColor: FOOT_FILL,
        textColor: FOOT_TEXT,
        fontSize: TABLE_FONT_SIZE,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: ALTERNATE_ROW_FILL,
      },
      theme: 'grid',
      didParseCell: (data: CellHookData) => {
        const content = Array.isArray(data.cell.text) ? data.cell.text.join(' ') : String(data.cell.text ?? '');
        data.cell.styles.font = this.fontService.resolveFontFamily(
          ctx.doc,
          content,
          data.cell.styles.font || DEFAULT_PDF_FONT
        );

        if (data.section !== 'body') return;
        // Group captions and subtotal rows are arrays, not resolved data rows.
        if (Array.isArray(data.row.raw)) return;
        const colIndex = data.column.index;
        if (colIndex < 0 || colIndex >= fields.length) return;
        this.applyStyleConditions(fields[colIndex], data.row.raw, data.cell, ctx.provider, ctx.parameterContext);
      },
      didDrawCell: hasBorders ? (data: CellHookData) => {
        if (data.section !== 'body') return;
        const colIndex = data.column.index;
        if (colIndex < 0 || colIndex >= fields.length) return;
        const field = fields[colIndex];
        if (!field.style.cellBorder) return;
        drawCellBorders(ctx.doc, field, data.cell);
      } : undefined,
    });

    return (ctx.doc as never as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  }

  private renderSectionTitle(ctx: PdfRenderContext, title: string, tableWidth: number, yPos: number): number {
    const fontSize = SECTION_TITLE_FONT_SIZE;
    ctx.doc.setFont(this.fontService.resolveFontFamily(ctx.doc, title, DEFAULT_PDF_FONT), 'bold');
    ctx.doc.setFontSize(fontSize);
    applyTextColor(ctx.doc, SECTION_TITLE_COLOR);

    const textY = yPos + fontSize * TEXT_BASELINE_FACTOR;
    const textX = isDocumentRtl() ? ctx.marginLeft + tableWidth - ctx.doc.getTextWidth(title) : ctx.marginLeft;
    ctx.doc.text(title, textX, textY);
    return yPos + fontSize * TEXT_HEIGHT_FACTOR + TITLE_GAP_MM;
  }

  private resolveTableColumns(
    fields: ReportField[],
    template: ReportTemplate
  ): { header: string; dataKey: string }[] {
    const columns = fields.map(f => ({
      header: resolveReportFieldLabel(f, template, key => this.translate.instant(key), false),
      dataKey: f.dataBinding,
    }));
    return isDocumentRtl() ? [...columns].reverse() : columns;
  }

  private buildColumnStyles(fields: ReportField[], contentWidth: number): Record<string, PdfColumnStyle> {
    const totalWidth = fields.reduce((sum, f) => sum + f.width, 0);
    const styles: Record<string, PdfColumnStyle> = {};
    fields.forEach(f => {
      styles[f.dataBinding] = {
        cellWidth: (f.width / totalWidth) * contentWidth,
        halign: resolveReportHalign(f.style.alignment, isDocumentRtl()),
        fontSize: f.style.fontSize,
        fontStyle: toJsPdfFontStyle(f.style.bold, f.style.italic),
      };
    });
    return styles;
  }

  /**
   * Applies conditional formatting to a table cell.
   * Each condition is evaluated with the row values; the first match wins per property.
   */
  private applyStyleConditions(
    field: ReportField,
    row: ReportRow,
    cell: Cell,
    provider: ReportDataProvider,
    parameterContext: ReportParameterContext | undefined
  ): void {
    if (!field.styleConditions?.length) {
      return;
    }

    const variables = this.rowFilterService.buildVariables(row, provider, parameterContext);
    for (const condition of field.styleConditions) {
      if (!condition.expression?.trim() || !this.isConditionTrue(condition.expression, variables)) {
        continue;
      }
      if (condition.textColor) {
        cell.styles.textColor = hexToRgbArray(condition.textColor);
      }
      if (condition.backgroundColor) {
        cell.styles.fillColor = hexToRgbArray(condition.backgroundColor);
      }
      if (condition.bold !== undefined || condition.italic !== undefined) {
        cell.styles.fontStyle = toJsPdfFontStyle(
          condition.bold ?? field.style.bold,
          condition.italic ?? field.style.italic
        );
      }
    }
  }

  private isConditionTrue(expression: string, variables: Record<string, unknown>): boolean {
    try {
      const result = this.formulaService.evaluateFormula(expression, variables).trim().toLowerCase();
      return TRUTHY_CONDITION_RESULTS.includes(result);
    } catch {
      return false;
    }
  }
}
