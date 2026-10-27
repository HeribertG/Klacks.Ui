// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Draws the footer section of a report page (separator line, labelled totals, formulas, signature lines) and the
 * page numbers written on every page once all pages exist.
 * @param ctx - Render context with the document, the template, the provider and the content geometry
 * @param section - Footer section of the template
 * @param rows - Rows of the last rendered table section, used for the totals
 * @param yPos - Vertical position below the last table in millimetres
 */

import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { jsPDF } from 'jspdf';

import { ReportTemplate } from '../../models/report/report-template.model';
import { ReportSection } from '../../models/report/report-section.model';
import { ReportSectionType } from '../../models/report/report-section-type.enum';
import { ReportField } from '../../models/report/report-field.model';
import { ReportFieldType } from '../../models/report/report-field-type.enum';
import { resolveReportFieldLabel } from '../../helpers/report-field-label.helper';
import { buildParameterVariables } from '../../helpers/report-parameter.helper';
import { resolveReportHalign, toJsPdfFontStyle } from '../../helpers/report-pdf-style.helper';
import { applyTextColor, drawUnderline, isDocumentRtl } from '../shared/report-pdf-drawing.helper';
import { ReportRow } from './report-row.type';
import { PdfRenderContext } from './pdf-render-context.interface';
import { FormulaEvaluationService } from './formula-evaluation.service';
import { ReportFontService } from './report-font.service';

const DEFAULT_PDF_FONT = 'helvetica';
const FORMULA_ERROR = '#ERR';
const SEPARATOR_GAP_ABOVE_MM = 3;
const SEPARATOR_GAP_BELOW_MM = 5;
const SEPARATOR_GRAY = 100;
const TEXT_HEIGHT_FACTOR = 0.5;
const LINE_GAP_MM = 2;
const SIGNATURE_DEFAULT_WIDTH_MM = 60;
const SIGNATURE_LINE_OFFSET_MM = 4;
const SIGNATURE_LINE_WIDTH_MM = 0.2;
const SIGNATURE_LINE_GRAY = 0;
const SIGNATURE_CAPTION_FACTOR = 0.45;
const PAGE_NUMBER_BASELINE_MM = 6;
const PAGE_PLACEHOLDER = '{{page}}';
const PAGES_PLACEHOLDER = '{{pages}}';

@Injectable({ providedIn: 'root' })
export class ReportPdfFooterRendererService {
  private translate = inject(TranslateService);
  private formulaService = inject(FormulaEvaluationService);
  private fontService = inject(ReportFontService);

  renderFooter(ctx: PdfRenderContext, section: ReportSection, rows: ReportRow[], yPos: number): void {
    yPos += SEPARATOR_GAP_ABOVE_MM;
    ctx.doc.setDrawColor(SEPARATOR_GRAY);
    ctx.doc.line(ctx.marginLeft, yPos, ctx.marginLeft + ctx.contentWidth, yPos);
    yPos += SEPARATOR_GAP_BELOW_MM;

    const sectionFooterFormulaVars = ctx.provider.buildFooterFormulaVariables
      ? {
          ...ctx.provider.buildFooterFormulaVariables(rows),
          ...buildParameterVariables(ctx.parameterContext?.parameters, ctx.parameterContext?.values),
        }
      : undefined;

    section.fields
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .filter(field => field.type !== ReportFieldType.PageNumber)
      .forEach(field => {
        if (field.type === ReportFieldType.Signature) {
          yPos = this.renderSignature(ctx, field, yPos);
          return;
        }

        let value: string;
        if (field.type === ReportFieldType.Formula && field.formula) {
          try {
            value = this.formulaService.evaluateFormula(field.formula, sectionFooterFormulaVars ?? {});
          } catch {
            value = FORMULA_ERROR;
          }
        } else {
          value = ctx.provider.resolveFooterValue(field, rows);
        }
        const fullText = `${this.translateFieldName(field, ctx.template)}: ${value}`;
        ctx.doc.setFontSize(field.style.fontSize);
        const fontFamily = this.fontService.resolveFontFamily(ctx.doc, fullText, field.style.fontFamily || DEFAULT_PDF_FONT);
        const fontStyle = toJsPdfFontStyle(field.style.bold, field.style.italic);
        ctx.doc.setFont(fontFamily, fontStyle);
        applyTextColor(ctx.doc, field.style.textColor);

        const footerX = isDocumentRtl()
          ? ctx.marginLeft + ctx.contentWidth - ctx.doc.getTextWidth(fullText)
          : ctx.marginLeft;
        ctx.doc.text(fullText, footerX, yPos);

        if (field.style.underline) {
          drawUnderline(ctx.doc, fullText, footerX, yPos, field);
        }

        yPos += field.style.fontSize * TEXT_HEIGHT_FACTOR + LINE_GAP_MM;
      });
  }

  /**
   * Writes the page number on every page after all pages exist.
   * Uses the field format when set, otherwise the translated default pattern.
   */
  renderPageNumbers(doc: jsPDF, template: ReportTemplate): void {
    const footerSection = template.sections.find(s => s.type === ReportSectionType.Footer);
    const field = footerSection?.fields.find(f => f.type === ReportFieldType.PageNumber);
    if (!footerSection?.visible || !field) {
      return;
    }

    const pattern = field.format?.trim() || this.translate.instant('setting.report.field.pageNumberFormat');
    const total = doc.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margins = template.pageSetup.margins;

    for (let page = 1; page <= total; page++) {
      doc.setPage(page);
      const text = pattern
        .replace(PAGE_PLACEHOLDER, String(page))
        .replace(PAGES_PLACEHOLDER, String(total));

      doc.setFontSize(field.style.fontSize);
      doc.setFont(
        this.fontService.resolveFontFamily(doc, text, field.style.fontFamily || DEFAULT_PDF_FONT),
        toJsPdfFontStyle(field.style.bold, field.style.italic)
      );
      applyTextColor(doc, field.style.textColor);

      const textWidth = doc.getTextWidth(text);
      const x = this.resolvePageNumberX(field.style.alignment, margins.left, pageWidth - margins.right, textWidth);
      doc.text(text, x, pageHeight - margins.bottom + PAGE_NUMBER_BASELINE_MM);
    }
  }

  /**
   * Draws a signature line with its caption underneath.
   */
  private renderSignature(ctx: PdfRenderContext, field: ReportField, yPos: number): number {
    const lineWidth = Math.min(ctx.contentWidth, (field.width || SIGNATURE_DEFAULT_WIDTH_MM));
    const lineX = isDocumentRtl() ? ctx.marginLeft + ctx.contentWidth - lineWidth : ctx.marginLeft;
    const lineY = yPos + SIGNATURE_LINE_OFFSET_MM;

    ctx.doc.setDrawColor(SIGNATURE_LINE_GRAY);
    ctx.doc.setLineWidth(SIGNATURE_LINE_WIDTH_MM);
    ctx.doc.line(lineX, lineY, lineX + lineWidth, lineY);

    const caption = field.name?.trim() || this.translate.instant('setting.report.field.signature');
    ctx.doc.setFontSize(field.style.fontSize);
    ctx.doc.setFont(
      this.fontService.resolveFontFamily(ctx.doc, caption, field.style.fontFamily || DEFAULT_PDF_FONT),
      toJsPdfFontStyle(field.style.bold, field.style.italic)
    );
    applyTextColor(ctx.doc, field.style.textColor);
    ctx.doc.text(caption, lineX, lineY + field.style.fontSize * SIGNATURE_CAPTION_FACTOR);

    return lineY + field.style.fontSize * SIGNATURE_CAPTION_FACTOR + SIGNATURE_LINE_OFFSET_MM;
  }

  private resolvePageNumberX(alignment: number, left: number, right: number, textWidth: number): number {
    const effective = resolveReportHalign(alignment, isDocumentRtl());
    if (effective === 'center') {
      return left + (right - left - textWidth) / 2;
    }
    return effective === 'right' ? right - textWidth : left;
  }

  private translateFieldName(field: ReportField, template: ReportTemplate): string {
    return resolveReportFieldLabel(field, template, key => this.translate.instant(key), true);
  }
}
