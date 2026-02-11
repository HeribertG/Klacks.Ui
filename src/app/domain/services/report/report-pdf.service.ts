import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { environment } from 'src/environments/environment';

import { ReportTemplate } from '../../models/report/report-template.model';
import { ReportSection, ReportSectionType } from '../../models/report/report-section.model';
import { ReportField, ReportFieldType, TextAlignment } from '../../models/report/report-field.model';
import { getAllFieldsForDataSets, getFieldPrefixMap } from '../../models/report/report-data-source.model';
import { ReportDataProvider, ReportHeaderContext, ReportData } from './report-data-provider.service';

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

  async generatePdf(context: ReportGenerationContext): Promise<Blob> {
    const { template, provider, data } = context;
    const isLandscape = template.pageSetup.orientation === 1;
    const doc = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4'
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

    const bodySections = template.sections
      .filter(s => s.type !== ReportSectionType.Header && s.type !== ReportSectionType.Footer)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    for (const section of bodySections) {
      if (!section.visible || section.fields.length === 0) continue;
      if (rows.length > 0) {
        yPos = this.renderTable(doc, section, rows, provider, template, yPos, marginLeft, contentWidth);
        yPos += 5;
      }
    }

    const footerSection = template.sections.find(s => s.type === ReportSectionType.Footer);
    if (footerSection?.visible && footerSection.fields.length > 0) {
      this.renderFooter(doc, footerSection, rows, provider, template, yPos, marginLeft, contentWidth);
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
      header: this.translateFieldName(f, template),
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

    const tableRows = rows.map(entry => {
      const row: Record<string, string> = {};
      fields.forEach(f => {
        row[f.dataBinding] = provider.resolveFieldValue(f, entry);
      });
      return row;
    });

    autoTable(doc, {
      startY: yPos,
      margin: { left: marginLeft },
      tableWidth: contentWidth,
      columns,
      body: tableRows,
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
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      theme: 'grid',
    });

    return (doc as never as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
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

    section.fields
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach(field => {
        const value = provider.resolveFooterValue(field, rows);
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

  private translateFieldName(field: ReportField, template: ReportTemplate): string {
    const sourceId = template.sourceId ?? 'schedule';
    const dataSetIds = template.dataSetIds ?? ['work'];
    const allFields = getAllFieldsForDataSets(sourceId, dataSetIds);
    const def = allFields.find(f => f.key === field.dataBinding);
    if (def) {
      const label = this.translate.instant(def.i18nKey);
      const prefixMap = getFieldPrefixMap(sourceId, dataSetIds, k => this.translate.instant(k));
      const prefix = prefixMap.get(field.dataBinding);
      return prefix ? `${prefix}.${label}` : label;
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
}
