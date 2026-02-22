// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { environment } from 'src/environments/environment';

import { ReportTemplate, PAGE_SIZE_FORMATS, ReportPageSize } from '../../models/report/report-template.model';
import { ReportSection, ReportSectionType } from '../../models/report/report-section.model';
import { ReportField, ReportFieldType, TextAlignment } from '../../models/report/report-field.model';
import { getAllFieldsForDataSets, getFieldPrefixMap } from '../../models/report/report-data-source.model';
import { ReportDataProvider, ReportHeaderContext, ReportData } from './report-data-provider.service';
import { BorderLineStyle, BORDER_LINE_WIDTHS } from '../../models/report/cell-border-style.model';
import { IScheduleCell } from '../../models/schedule/work-schedule-class';
import { FOOTER_TO_COLUMN_MAP } from '../../models/report/report-footer-mapping.constants';
import { FormulaEvaluationService } from './formula-evaluation.service';
import { CompiledScript } from 'src/app/infrastructure/scripting/compiled-script';

export interface ReportGenerationContext {
  template: ReportTemplate;
  provider: ReportDataProvider;
  data: ReportData;
  groupName: string;
  startDate: string;
  endDate: string;
  imageCache?: Map<string, string>;
}

@Injectable()
export class ReportPdfService {
  private translate = inject(TranslateService);
  private http = inject(HttpClient);
  private formulaService = inject(FormulaEvaluationService);

  async generatePdf(context: ReportGenerationContext): Promise<Blob> {
    const { template, provider, data } = context;
    const isLandscape = template.pageSetup.orientation === 1;
    const pageFormat = PAGE_SIZE_FORMATS[template.pageSetup.size ?? ReportPageSize.A4] ?? 'a4';
    const doc = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: pageFormat
    });

    const imageCache = await this.preloadImages(template, context.imageCache);

    const clients = data.clients ?? [null];
    const allRows = data.rows;

    for (let index = 0; index < clients.length; index++) {
      if (index > 0) {
        doc.addPage();
      }

      const client = clients[index];
      const clientRows = client
        ? allRows.filter((r: any) => r.clientId === client.id)
        : allRows;

      const headerContext: ReportHeaderContext = {
        client,
        groupName: context.groupName,
        startDate: data.metadata?.['startDate'] ?? context.startDate,
        endDate: data.metadata?.['endDate'] ?? context.endDate,
        metadata: data.metadata,
      };

      this.renderPage(doc, template, provider, clientRows, headerContext, imageCache);
    }

    return doc.output('blob');
  }

  private renderPage(
    doc: jsPDF,
    template: ReportTemplate,
    provider: ReportDataProvider,
    rows: any[],
    headerContext: ReportHeaderContext,
    imageCache: Map<string, string>
  ): void {
    let yPos = template.pageSetup.margins.top;
    const marginLeft = template.pageSetup.margins.left;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - marginLeft - template.pageSetup.margins.right;

    const headerSection = template.sections.find(s => s.type === ReportSectionType.Header);
    if (headerSection?.visible && headerSection.fields.length > 0) {
      yPos = this.renderHeader(doc, headerSection, provider, headerContext, yPos, marginLeft, contentWidth, imageCache);
      yPos += 5;
    }

    let effectiveRows = rows;
    if (template.sourceId === 'schedule' && template.showFullPeriod) {
      effectiveRows = this.fillFullPeriod(effectiveRows, headerContext.startDate!, headerContext.endDate!);
    }

    const bodySections = template.sections
      .filter(s => s.type !== ReportSectionType.Header && s.type !== ReportSectionType.Footer)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    for (const section of bodySections) {
      if (!section.visible || section.fields.length === 0) continue;
      if (effectiveRows.length > 0) {
        yPos = this.renderTable(doc, section, effectiveRows, provider, template, yPos, marginLeft, contentWidth);
        yPos += 5;
      }
    }

    const footerSection = template.sections.find(s => s.type === ReportSectionType.Footer);
    if (footerSection?.visible && footerSection.fields.length > 0) {
      this.renderFooter(doc, footerSection, effectiveRows, provider, template, yPos, marginLeft, contentWidth);
    }
  }

  private async preloadImages(template: ReportTemplate, existingCache?: Map<string, string>): Promise<Map<string, string>> {
    const cache = new Map<string, string>();

    if (existingCache) {
      existingCache.forEach((value, key) => cache.set(key, value));
    }

    const imageFields = template.sections
      .flatMap(s => s.fields)
      .filter(f => f.type === ReportFieldType.Image && f.imageUrl && !cache.has(f.imageUrl!));

    const promises = imageFields.map(async (field) => {
      try {
        const blob = await firstValueFrom(
          this.http.get(`${environment.baseUrl}LoadFile/DownLoad?type=${field.imageUrl}`, { responseType: 'blob' })
        );
        if (blob.type !== 'text/plain') {
          const dataUrl = await this.blobToDataUrl(blob);
          cache.set(field.imageUrl!, dataUrl);
        }
      } catch {
        // ignore failed image loads
      }
    });

    await Promise.all(promises);
    return cache;
  }

  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private renderHeader(
    doc: jsPDF,
    section: ReportSection,
    provider: ReportDataProvider,
    headerContext: ReportHeaderContext,
    yPos: number,
    marginLeft: number,
    contentWidth: number,
    imageCache: Map<string, string>
  ): number {
    const rows = this.groupFieldsByRow(section.fields);

    for (const row of rows) {
      let rowHeight = 0;

      for (const alignment of [TextAlignment.Left, TextAlignment.Center, TextAlignment.Right]) {
        const zoneFields = row.fields.filter(f => (f.style?.alignment ?? TextAlignment.Left) === alignment);
        if (zoneFields.length === 0) continue;

        let xOffset = this.getZoneStartX(alignment, marginLeft, contentWidth, zoneFields, doc, provider, headerContext, imageCache);

        for (const field of zoneFields) {
          if (field.type === ReportFieldType.Image && field.imageUrl) {
            const imgData = imageCache.get(field.imageUrl);
            if (imgData) {
              const imgWidth = field.width || 30;
              const imgHeight = field.height || imgWidth * 0.5;
              const imgFormat = imgData.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
              doc.addImage(imgData, imgFormat, xOffset, yPos, imgWidth, imgHeight);
              xOffset += imgWidth + 2;
              rowHeight = Math.max(rowHeight, imgHeight);
            }
          } else if (field.dataBinding) {
            const value = provider.resolveHeaderValue(field, headerContext);
            if (!value) continue;

            doc.setFontSize(field.style.fontSize);
            const fontFamily = field.style.fontFamily || 'helvetica';
            const fontStyle = this.getJsPdfFontStyle(field.style.bold, field.style.italic);
            doc.setFont(fontFamily, fontStyle);
            this.applyTextColor(doc, field.style.textColor);

            if (field.dataBinding === 'report.customText' && value.includes('\n')) {
              const lineHeight = field.style.fontSize * 0.45;
              const lines = value.split('\n');
              let lineY = yPos + field.style.fontSize * 0.35;
              for (const line of lines) {
                doc.text(line, xOffset, lineY);
                lineY += lineHeight;
              }
              const textWidth = Math.max(...lines.map(l => doc.getTextWidth(l)));
              if (field.style.underline) {
                this.renderUnderline(doc, lines[lines.length - 1], xOffset, lineY - lineHeight, field);
              }
              xOffset += textWidth + 2;
              rowHeight = Math.max(rowHeight, lines.length * lineHeight + 2);
            } else {
              const textY = yPos + field.style.fontSize * 0.35;
              doc.text(value, xOffset, textY);

              if (field.style.underline) {
                this.renderUnderline(doc, value, xOffset, textY, field);
              }

              xOffset += doc.getTextWidth(value) + 2;
              rowHeight = Math.max(rowHeight, field.style.fontSize * 0.5 + 2);
            }
          }
        }
      }

      yPos += rowHeight > 0 ? rowHeight : 5;
    }

    return yPos;
  }

  private getZoneStartX(
    alignment: TextAlignment,
    marginLeft: number,
    contentWidth: number,
    zoneFields: ReportField[],
    doc: jsPDF,
    provider: ReportDataProvider,
    headerContext: ReportHeaderContext,
    imageCache: Map<string, string>
  ): number {
    if (alignment === TextAlignment.Left) return marginLeft;

    let totalWidth = 0;
    for (const field of zoneFields) {
      if (field.type === ReportFieldType.Image && field.imageUrl && imageCache.has(field.imageUrl)) {
        totalWidth += (field.width || 30) + 2;
      } else if (field.dataBinding) {
        const value = provider.resolveHeaderValue(field, headerContext);
        if (value) {
          doc.setFontSize(field.style.fontSize);
          doc.setFont(field.style.fontFamily || 'helvetica', this.getJsPdfFontStyle(field.style.bold, field.style.italic));
          totalWidth += doc.getTextWidth(value) + 2;
        }
      }
    }

    if (alignment === TextAlignment.Center) return marginLeft + (contentWidth - totalWidth) / 2;
    return marginLeft + contentWidth - totalWidth;
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

  private renderTable(
    doc: jsPDF,
    section: ReportSection,
    rows: any[],
    provider: ReportDataProvider,
    template: ReportTemplate,
    yPos: number,
    marginLeft: number,
    contentWidth: number
  ): number {
    const fields = section.fields.sort((a, b) => a.sortOrder - b.sortOrder);
    const totalWidth = fields.reduce((sum, f) => sum + f.width, 0);

    const columns = fields.map(f => ({
      header: this.translateFieldName(f, template, false),
      dataKey: f.dataBinding,
    }));

    const columnStyles: Record<string, { cellWidth: number; halign: string; fontSize: number; fontStyle: string }> = {};
    fields.forEach(f => {
      columnStyles[f.dataBinding] = {
        cellWidth: (f.width / totalWidth) * contentWidth,
        halign: f.style.alignment === 0 ? 'left' : f.style.alignment === 1 ? 'center' : 'right',
        fontSize: f.style.fontSize,
        fontStyle: this.getJsPdfFontStyle(f.style.bold, f.style.italic),
      };
    });

    const formulaFields = fields.filter(f => f.type === ReportFieldType.Formula && f.formula);
    const compiledFormulas = new Map<string, CompiledScript>();
    for (const f of formulaFields) {
      compiledFormulas.set(f.dataBinding, this.formulaService.compileFormula(f.formula!));
    }

    const bodyData: any[] = [];

    const beforeRows = (section.freeTextRows ?? []).filter(r => r.position === 'before');
    for (const freeRow of beforeRows) {
      bodyData.push([{
        content: freeRow.text,
        colSpan: fields.length,
        styles: {
          fontStyle: this.getJsPdfFontStyle(freeRow.style.bold, freeRow.style.italic),
          fontSize: freeRow.style.fontSize,
          textColor: this.hexToRgbArray(freeRow.style.textColor),
          halign: freeRow.style.alignment === 0 ? 'left' : freeRow.style.alignment === 1 ? 'center' : 'right',
        },
      }]);
    }

    const resolvedRows: { row: Record<string, string>; sourceEntry: any }[] = [];
    for (const entry of rows) {
      const row: Record<string, string> = {};
      const formulaVars = compiledFormulas.size > 0 && provider.buildFormulaVariables
        ? provider.buildFormulaVariables(entry) : undefined;

      fields.forEach(f => {
        if (f.type === ReportFieldType.Formula && f.formula) {
          const compiled = compiledFormulas.get(f.dataBinding);
          if (compiled && formulaVars) {
            try {
              row[f.dataBinding] = this.formulaService.executeCompiled(compiled, formulaVars);
            } catch {
              row[f.dataBinding] = '#ERR';
            }
          } else {
            row[f.dataBinding] = '';
          }
          return;
        }

        const primary = provider.resolveFieldValue(f, entry);
        if (f.additionalBindings?.length) {
          const separator = f.bindingSeparator ?? '\n';
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

    const shouldMerge = (template.mergeRows || template.showFullPeriod) && template.sourceId === 'schedule';
    if (shouldMerge) {
      const groups = new Map<string, Record<string, string>[]>();
      const groupOrder: string[] = [];
      for (const { row, sourceEntry } of resolvedRows) {
        const key = sourceEntry.entryDate ? new Date(sourceEntry.entryDate).toDateString() : '';
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
            const unique = [...new Set(values.filter(v => v))];
            if (unique.length <= 1) {
              merged[f.dataBinding] = unique[0] ?? '';
            } else {
              merged[f.dataBinding] = values.filter(v => v).join('\n');
            }
          }
          bodyData.push(merged);
        }
      }
    } else {
      for (const { row } of resolvedRows) {
        bodyData.push(row);
      }
    }

    const afterRows = (section.freeTextRows ?? []).filter(r => r.position === 'after');
    for (const freeRow of afterRows) {
      bodyData.push([{
        content: freeRow.text,
        colSpan: fields.length,
        styles: {
          fontStyle: this.getJsPdfFontStyle(freeRow.style.bold, freeRow.style.italic),
          fontSize: freeRow.style.fontSize,
          textColor: this.hexToRgbArray(freeRow.style.textColor),
          halign: freeRow.style.alignment === 0 ? 'left' : freeRow.style.alignment === 1 ? 'center' : 'right',
        },
      }]);
    }

    let foot: any[][] | undefined;
    if (section.tableFooterFields && section.tableFooterFields.length > 0) {
      const footRow: any[] = fields.map(() => '');
      const footerFormulaVars = provider.buildFooterFormulaVariables
        ? provider.buildFooterFormulaVariables(rows) : undefined;

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
            value = '#ERR';
          }
        } else {
          value = provider.resolveFooterValue(footerField, rows);
        }

        if (colIndex >= 0 && colIndex < fields.length) {
          const text = footerField.hideLabel
            ? value
            : `${this.translateFieldName(footerField, template)}: ${value}`;
          const halign = footerField.style.alignment === 0 ? 'left' : footerField.style.alignment === 1 ? 'center' : 'right';
          footRow[colIndex] = { content: text, styles: { halign } };
        }
      }
      foot = [footRow];
    }

    const hasBorders = fields.some(f => f.style.cellBorder);

    autoTable(doc, {
      startY: yPos,
      margin: { left: marginLeft },
      tableWidth: contentWidth,
      columns,
      body: bodyData,
      foot,
      columnStyles: columnStyles as never,
      headStyles: {
        fillColor: [66, 66, 66],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 9,
      },
      footStyles: {
        fillColor: [230, 230, 230],
        textColor: [0, 0, 0],
        fontSize: 9,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      theme: 'grid',
      didDrawCell: hasBorders ? (data: any) => {
        if (data.section !== 'body') return;
        const colIndex = data.column.index;
        if (colIndex < 0 || colIndex >= fields.length) return;
        const field = fields[colIndex];
        if (!field.style.cellBorder) return;
        this.drawCellBorders(doc, field, data.cell);
      } : undefined,
    });

    return (doc as never as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  }

  private drawCellBorders(doc: jsPDF, field: ReportField, cell: any): void {
    const border = field.style.cellBorder!;
    const x = cell.x;
    const y = cell.y;
    const w = cell.width;
    const h = cell.height;

    const sides: { key: 'top' | 'right' | 'bottom' | 'left'; x1: number; y1: number; x2: number; y2: number }[] = [
      { key: 'top', x1: x, y1: y, x2: x + w, y2: y },
      { key: 'right', x1: x + w, y1: y, x2: x + w, y2: y + h },
      { key: 'bottom', x1: x, y1: y + h, x2: x + w, y2: y + h },
      { key: 'left', x1: x, y1: y, x2: x, y2: y + h },
    ];

    for (const side of sides) {
      const sideStyle = border[side.key];
      if (!sideStyle || sideStyle.lineStyle === BorderLineStyle.None) continue;

      const rgb = this.hexToRgb(sideStyle.color);
      doc.setDrawColor(rgb.r, rgb.g, rgb.b);
      const lineWidth = BORDER_LINE_WIDTHS[sideStyle.lineStyle] ?? 0.1;

      if (sideStyle.lineStyle === BorderLineStyle.Dashed) {
        doc.setLineWidth(lineWidth);
        (doc as any).setLineDashPattern([1, 1], 0);
        doc.line(side.x1, side.y1, side.x2, side.y2);
        (doc as any).setLineDashPattern([], 0);
      } else if (sideStyle.lineStyle === BorderLineStyle.Double) {
        doc.setLineWidth(0.1);
        const offset = 0.4;
        if (side.key === 'top' || side.key === 'bottom') {
          doc.line(side.x1, side.y1 - offset, side.x2, side.y2 - offset);
          doc.line(side.x1, side.y1 + offset, side.x2, side.y2 + offset);
        } else {
          doc.line(side.x1 - offset, side.y1, side.x2 - offset, side.y2);
          doc.line(side.x1 + offset, side.y1, side.x2 + offset, side.y2);
        }
      } else {
        doc.setLineWidth(lineWidth);
        doc.line(side.x1, side.y1, side.x2, side.y2);
      }
    }
  }

  private hexToRgbArray(hex: string | undefined): [number, number, number] {
    const rgb = this.hexToRgb(hex || '#000000');
    return [rgb.r, rgb.g, rgb.b];
  }

  private renderFooter(
    doc: jsPDF,
    section: ReportSection,
    rows: any[],
    provider: ReportDataProvider,
    template: ReportTemplate,
    yPos: number,
    marginLeft: number,
    contentWidth: number
  ): void {
    yPos += 3;
    doc.setDrawColor(100);
    doc.line(marginLeft, yPos, marginLeft + contentWidth, yPos);
    yPos += 5;

    const sectionFooterFormulaVars = provider.buildFooterFormulaVariables
      ? provider.buildFooterFormulaVariables(rows) : undefined;

    section.fields
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach(field => {
        let value: string;
        if (field.type === ReportFieldType.Formula && field.formula) {
          try {
            value = this.formulaService.evaluateFormula(field.formula, sectionFooterFormulaVars ?? {});
          } catch {
            value = '#ERR';
          }
        } else {
          value = provider.resolveFooterValue(field, rows);
        }
        doc.setFontSize(field.style.fontSize);
        const fontFamily = field.style.fontFamily || 'helvetica';
        const fontStyle = this.getJsPdfFontStyle(field.style.bold, field.style.italic);
        doc.setFont(fontFamily, fontStyle);
        this.applyTextColor(doc, field.style.textColor);

        const fullText = `${this.translateFieldName(field, template)}: ${value}`;
        doc.text(fullText, marginLeft, yPos);

        if (field.style.underline) {
          this.renderUnderline(doc, fullText, marginLeft, yPos, field);
        }

        yPos += field.style.fontSize * 0.5 + 2;
      });
  }

  private translateFieldName(field: ReportField, template: ReportTemplate, withPrefix = true): string {
    const sourceId = template.sourceId ?? 'schedule';
    const dataSetIds = template.dataSetIds ?? ['work'];
    const allFields = getAllFieldsForDataSets(sourceId, dataSetIds);
    const def = allFields.find(f => f.key === field.dataBinding);
    if (def) {
      const label = this.translate.instant(def.i18nKey);
      if (withPrefix) {
        const prefixMap = getFieldPrefixMap(sourceId, dataSetIds, k => this.translate.instant(k));
        const prefix = prefixMap.get(field.dataBinding);
        return prefix ? `${prefix}.${label}` : label;
      }
      return label;
    }
    return field.name;
  }

  // --- Formatting Helpers ---

  private applyTextColor(doc: jsPDF, hex: string | undefined): void {
    const rgb = this.hexToRgb(hex || '#000000');
    doc.setTextColor(rgb.r, rgb.g, rgb.b);
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  private renderUnderline(doc: jsPDF, text: string, x: number, y: number, field: ReportField): void {
    const textWidth = doc.getTextWidth(text);
    const lineY = y + 0.5;
    const rgb = this.hexToRgb(field.style.textColor ?? '#000000');
    doc.setDrawColor(rgb.r, rgb.g, rgb.b);
    doc.setLineWidth(0.2);
    doc.line(x, lineY, x + textWidth, lineY);
  }

  private getJsPdfFontStyle(bold: boolean, italic: boolean): string {
    if (bold && italic) return 'bolditalic';
    if (bold) return 'bold';
    if (italic) return 'italic';
    return 'normal';
  }

  private fillFullPeriod(rows: any[], startDate: string, endDate: string): any[] {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const rowsByDate = new Map<string, any[]>();

    for (const row of rows) {
      const key = new Date(row.entryDate).toDateString();
      if (!rowsByDate.has(key)) rowsByDate.set(key, []);
      rowsByDate.get(key)!.push(row);
    }

    const result: any[] = [];
    const current = new Date(start);
    while (current <= end) {
      const key = current.toDateString();
      const dayRows = rowsByDate.get(key);
      if (dayRows) {
        result.push(...dayRows);
      } else {
        result.push({
          entryDate: new Date(current),
          startTime: '',
          endTime: '',
          changeTime: null,
          surcharges: null,
          amount: null,
          entryName: null,
          abbreviation: null,
          information: null,
        } as Partial<IScheduleCell>);
      }
      current.setDate(current.getDate() + 1);
    }

    return result;
  }
}
