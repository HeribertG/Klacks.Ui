// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Draws the header section of a report page: fields are grouped into rows by their sort order and laid out in a left,
 * center and right zone, mirrored for right-to-left documents.
 * @param ctx - Render context with the document, the provider, the header context and the preloaded images
 * @param section - Header section of the template
 * @param yPos - Vertical start position in millimetres
 */

import { Injectable, inject } from '@angular/core';
import { jsPDF } from 'jspdf';

import { ReportSection } from '../../models/report/report-section.model';
import { ReportField } from '../../models/report/report-field.model';
import { ReportFieldType } from '../../models/report/report-field-type.enum';
import { TextAlignment } from '../../models/report/text-alignment.enum';
import { toJsPdfFontStyle } from '../../helpers/report-pdf-style.helper';
import { applyTextColor, drawUnderline, isDocumentRtl } from '../shared/report-pdf-drawing.helper';
import { ReportDataProvider } from './report-data-provider.interface';
import { ReportHeaderContext } from './report-header-context.interface';
import { PdfRenderContext } from './pdf-render-context.interface';
import { ReportFontService } from './report-font.service';
import { PdfHeaderFieldResult } from './pdf-header-field-result.interface';

const DEFAULT_PDF_FONT = 'helvetica';
const DEFAULT_IMAGE_WIDTH_MM = 30;
const IMAGE_ASPECT_RATIO = 0.5;
const FIELD_GAP_MM = 2;
const EMPTY_ROW_HEIGHT_MM = 5;
const TEXT_BASELINE_FACTOR = 0.35;
const TEXT_HEIGHT_FACTOR = 0.5;
const LINE_HEIGHT_FACTOR = 0.45;
const JPEG_DATA_PREFIX = 'data:image/jpeg';
const IMAGE_DATA_PREFIX = 'data:image';

@Injectable({ providedIn: 'root' })
export class ReportPdfHeaderRendererService {
  private fontService = inject(ReportFontService);

  renderHeader(ctx: PdfRenderContext, section: ReportSection, yPos: number): number {
    const rows = this.groupFieldsByRow(section.fields);

    for (const row of rows) {
      let rowHeight = 0;

      for (const alignment of [TextAlignment.Left, TextAlignment.Center, TextAlignment.Right]) {
        const zoneFields = row.fields.filter(f => (f.style?.alignment ?? TextAlignment.Left) === alignment);
        if (zoneFields.length === 0) continue;

        let xOffset = this.getZoneStartX(ctx, alignment, zoneFields);

        for (const field of zoneFields) {
          const result = this.renderHeaderField(ctx.doc, field, ctx.provider, ctx.headerContext, ctx.imageCache, xOffset, yPos);
          xOffset = result.xOffset;
          rowHeight = Math.max(rowHeight, result.height);
        }
      }

      yPos += rowHeight > 0 ? rowHeight : EMPTY_ROW_HEIGHT_MM;
    }

    return yPos;
  }

  private renderHeaderField(
    doc: jsPDF,
    field: ReportField,
    provider: ReportDataProvider,
    headerContext: ReportHeaderContext,
    imageCache: Map<string, string>,
    xOffset: number,
    yPos: number
  ): PdfHeaderFieldResult {
    if (field.type === ReportFieldType.Image && field.imageUrl) {
      return this.renderHeaderImage(doc, field, imageCache, xOffset, yPos);
    }

    if (field.type === ReportFieldType.Image && field.dataBinding) {
      return this.renderDynamicHeaderImage(doc, field, provider, headerContext, xOffset, yPos);
    }

    if (field.dataBinding) {
      return this.renderHeaderText(doc, field, provider, headerContext, xOffset, yPos);
    }

    return { xOffset, height: 0 };
  }

  private renderHeaderImage(
    doc: jsPDF,
    field: ReportField,
    imageCache: Map<string, string>,
    xOffset: number,
    yPos: number
  ): PdfHeaderFieldResult {
    const imgData = imageCache.get(field.imageUrl!);
    if (!imgData) return { xOffset, height: 0 };
    return this.drawImage(doc, field, imgData, xOffset, yPos);
  }

  /**
   * Renders an Image-type field whose picture comes from the fetched record itself
   * (e.g. a client photo) instead of an admin-uploaded, template-level file.
   */
  private renderDynamicHeaderImage(
    doc: jsPDF,
    field: ReportField,
    provider: ReportDataProvider,
    headerContext: ReportHeaderContext,
    xOffset: number,
    yPos: number
  ): PdfHeaderFieldResult {
    const imgData = provider.resolveHeaderValue(field, headerContext);
    if (!imgData || !imgData.startsWith(IMAGE_DATA_PREFIX)) return { xOffset, height: 0 };
    return this.drawImage(doc, field, imgData, xOffset, yPos);
  }

  private drawImage(doc: jsPDF, field: ReportField, imgData: string, xOffset: number, yPos: number): PdfHeaderFieldResult {
    const imgWidth = field.width || DEFAULT_IMAGE_WIDTH_MM;
    const imgHeight = field.height || imgWidth * IMAGE_ASPECT_RATIO;
    const imgFormat = imgData.startsWith(JPEG_DATA_PREFIX) ? 'JPEG' : 'PNG';
    doc.addImage(imgData, imgFormat, xOffset, yPos, imgWidth, imgHeight);
    return { xOffset: xOffset + imgWidth + FIELD_GAP_MM, height: imgHeight };
  }

  private renderHeaderText(
    doc: jsPDF,
    field: ReportField,
    provider: ReportDataProvider,
    headerContext: ReportHeaderContext,
    xOffset: number,
    yPos: number
  ): PdfHeaderFieldResult {
    const value = provider.resolveHeaderValue(field, headerContext);
    if (!value) return { xOffset, height: 0 };

    doc.setFontSize(field.style.fontSize);
    const fontFamily = this.fontService.resolveFontFamily(doc, value, field.style.fontFamily || DEFAULT_PDF_FONT);
    const fontStyle = toJsPdfFontStyle(field.style.bold, field.style.italic);
    doc.setFont(fontFamily, fontStyle);
    applyTextColor(doc, field.style.textColor);

    if (value.includes('\n')) {
      return this.renderMultilineHeaderText(doc, field, value, xOffset, yPos);
    }

    const textY = yPos + field.style.fontSize * TEXT_BASELINE_FACTOR;
    doc.text(value, xOffset, textY);

    if (field.style.underline) {
      drawUnderline(doc, value, xOffset, textY, field);
    }

    return {
      xOffset: xOffset + doc.getTextWidth(value) + FIELD_GAP_MM,
      height: field.style.fontSize * TEXT_HEIGHT_FACTOR + FIELD_GAP_MM,
    };
  }

  private renderMultilineHeaderText(
    doc: jsPDF,
    field: ReportField,
    value: string,
    xOffset: number,
    yPos: number
  ): PdfHeaderFieldResult {
    const lineHeight = field.style.fontSize * LINE_HEIGHT_FACTOR;
    const lines = value.split('\n');
    let lineY = yPos + field.style.fontSize * TEXT_BASELINE_FACTOR;
    for (const line of lines) {
      doc.text(line, xOffset, lineY);
      lineY += lineHeight;
    }
    const textWidth = Math.max(...lines.map(l => doc.getTextWidth(l)));
    if (field.style.underline) {
      drawUnderline(doc, lines[lines.length - 1], xOffset, lineY - lineHeight, field);
    }
    return {
      xOffset: xOffset + textWidth + FIELD_GAP_MM,
      height: lines.length * lineHeight + FIELD_GAP_MM,
    };
  }

  private getZoneStartX(ctx: PdfRenderContext, alignment: TextAlignment, zoneFields: ReportField[]): number {
    const effectiveAlignment = isDocumentRtl()
      ? (alignment === TextAlignment.Left ? TextAlignment.Right : alignment === TextAlignment.Right ? TextAlignment.Left : alignment)
      : alignment;

    if (effectiveAlignment === TextAlignment.Left) return ctx.marginLeft;

    let totalWidth = 0;
    for (const field of zoneFields) {
      if (field.type === ReportFieldType.Image && field.imageUrl && ctx.imageCache.has(field.imageUrl)) {
        totalWidth += (field.width || DEFAULT_IMAGE_WIDTH_MM) + FIELD_GAP_MM;
      } else if (field.type === ReportFieldType.Image && field.dataBinding) {
        totalWidth += (field.width || DEFAULT_IMAGE_WIDTH_MM) + FIELD_GAP_MM;
      } else if (field.dataBinding) {
        const value = ctx.provider.resolveHeaderValue(field, ctx.headerContext);
        if (value) {
          ctx.doc.setFontSize(field.style.fontSize);
          ctx.doc.setFont(
            this.fontService.resolveFontFamily(ctx.doc, value, field.style.fontFamily || DEFAULT_PDF_FONT),
            toJsPdfFontStyle(field.style.bold, field.style.italic)
          );
          const widestLine = Math.max(...value.split('\n').map(l => ctx.doc.getTextWidth(l)));
          totalWidth += widestLine + FIELD_GAP_MM;
        }
      }
    }

    if (effectiveAlignment === TextAlignment.Center) return ctx.marginLeft + (ctx.contentWidth - totalWidth) / 2;
    return ctx.marginLeft + ctx.contentWidth - totalWidth;
  }

  private groupFieldsByRow(fields: ReportField[]): { rowIndex: number; fields: ReportField[] }[] {
    const rowMap = new Map<number, ReportField[]>();
    for (const field of fields) {
      const rowIndex = field.sortOrder;
      if (!rowMap.has(rowIndex)) {
        rowMap.set(rowIndex, []);
      }
      rowMap.get(rowIndex)!.push(field);
    }

    return Array.from(rowMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([rowIndex, rowFields]) => ({ rowIndex, fields: rowFields }));
  }
}
