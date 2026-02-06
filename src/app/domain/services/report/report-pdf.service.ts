import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { environment } from 'src/environments/environment';

import { ReportTemplate } from '../../models/report/report-template.model';
import { ReportSection, ReportSectionType } from '../../models/report/report-section.model';
import { ReportField, ReportFieldType, TextAlignment, ALL_AVAILABLE_FIELDS } from '../../models/report/report-field.model';
import { IScheduleCell, IWorkScheduleClient, WorkScheduleEntryType } from '../../models/work-schedule-class';
import { hoursToHHMM } from 'src/app/shared/helpers/time-format.helper';

export interface ReportGenerationContext {
  template: ReportTemplate;
  clients: IWorkScheduleClient[];
  entries: IScheduleCell[];
  groupName: string;
  startDate: string;
  endDate: string;
  imageCache?: Map<string, string>;
}

interface ClientReportData {
  client: IWorkScheduleClient;
  workEntries: IScheduleCell[];
  expenseEntries: IScheduleCell[];
}

@Injectable({
  providedIn: 'root'
})
export class ReportPdfService {
  private translate = inject(TranslateService);
  private http = inject(HttpClient);

  async generatePdf(context: ReportGenerationContext): Promise<Blob> {
    const { template } = context;
    const isLandscape = template.pageSetup.orientation === 1;
    const doc = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imageCache = await this.preloadImages(template, context.imageCache);

    const clientDataList = this.buildClientData(context);

    for (let index = 0; index < clientDataList.length; index++) {
      if (index > 0) {
        doc.addPage();
      }
      this.renderClientReport(doc, template, clientDataList[index], context, imageCache);
    }

    return doc.output('blob');
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

  private buildClientData(context: ReportGenerationContext): ClientReportData[] {
    const { clients, entries } = context;
    const entriesByClient = new Map<string, IScheduleCell[]>();

    entries.forEach(entry => {
      const clientId = entry.clientId;
      if (!entriesByClient.has(clientId)) {
        entriesByClient.set(clientId, []);
      }
      entriesByClient.get(clientId)!.push(entry);
    });

    return clients.map(client => {
      const clientEntries = entriesByClient.get(client.id) ?? [];
      const workEntries = clientEntries
        .filter(e => e.entryType !== WorkScheduleEntryType.Expenses)
        .sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
      const expenseEntries = clientEntries
        .filter(e => e.entryType === WorkScheduleEntryType.Expenses)
        .sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());

      return { client, workEntries, expenseEntries };
    });
  }

  private renderClientReport(
    doc: jsPDF,
    template: ReportTemplate,
    clientData: ClientReportData,
    context: ReportGenerationContext,
    imageCache: Map<string, string>
  ): void {
    let yPos = template.pageSetup.margins.top;
    const marginLeft = template.pageSetup.margins.left;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - marginLeft - template.pageSetup.margins.right;

    const headerSection = template.sections.find(s => s.type === ReportSectionType.Header);
    if (headerSection?.visible && headerSection.fields.length > 0) {
      yPos = this.renderHeader(doc, headerSection, clientData, context, yPos, marginLeft, contentWidth, imageCache);
      yPos += 5;
    }

    const bodySections = template.sections
      .filter(s => s.type === ReportSectionType.WorkTable || s.type === ReportSectionType.ExpensesTable)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    for (const section of bodySections) {
      if (!section.visible || section.fields.length === 0) continue;

      const isExpenses = section.type === ReportSectionType.ExpensesTable;
      const entries = isExpenses ? clientData.expenseEntries : clientData.workEntries;
      const prefix = isExpenses ? 'expense' : 'work';

      if (entries.length > 0) {
        yPos = this.renderTable(doc, section, entries, prefix, yPos, marginLeft, contentWidth);
        yPos += 5;
      }
    }

    const footerSection = template.sections.find(s => s.type === ReportSectionType.Footer);
    if (footerSection?.visible && footerSection.fields.length > 0) {
      this.renderFooter(doc, footerSection, clientData, yPos, marginLeft, contentWidth);
    }
  }

  private renderHeader(
    doc: jsPDF,
    section: ReportSection,
    clientData: ClientReportData,
    context: ReportGenerationContext,
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

        let xOffset = this.getZoneStartX(alignment, marginLeft, contentWidth, zoneFields, doc, clientData, context, imageCache);

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
            const value = this.resolveHeaderValue(field, clientData.client, context);
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
    clientData: ClientReportData,
    context: ReportGenerationContext,
    imageCache: Map<string, string>
  ): number {
    if (alignment === TextAlignment.Left) return marginLeft;

    let totalWidth = 0;
    for (const field of zoneFields) {
      if (field.type === ReportFieldType.Image && field.imageUrl && imageCache.has(field.imageUrl)) {
        totalWidth += (field.width || 30) + 2;
      } else if (field.dataBinding) {
        const value = this.resolveHeaderValue(field, clientData.client, context);
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
    entries: IScheduleCell[],
    prefix: string,
    yPos: number,
    marginLeft: number,
    contentWidth: number
  ): number {
    const fields = section.fields.sort((a, b) => a.sortOrder - b.sortOrder);
    const totalWidth = fields.reduce((sum, f) => sum + f.width, 0);

    const columns = fields.map(f => ({
      header: this.translateFieldName(f),
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

    const rows = entries.map(entry => {
      const row: Record<string, string> = {};
      fields.forEach(f => {
        row[f.dataBinding] = this.resolveEntryValue(f, entry, prefix);
      });
      return row;
    });

    autoTable(doc, {
      startY: yPos,
      margin: { left: marginLeft },
      tableWidth: contentWidth,
      columns,
      body: rows,
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
    clientData: ClientReportData,
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
        const value = this.resolveFooterValue(field, clientData);
        doc.setFontSize(field.style.fontSize);
        const fontFamily = field.style.fontFamily || 'helvetica';
        const fontStyle = this.getJsPdfFontStyle(field.style.bold, field.style.italic);
        doc.setFont(fontFamily, fontStyle);
        this.applyTextColor(doc, field.style.textColor);

        const fullText = `${this.translateFieldName(field)}: ${value}`;
        doc.text(fullText, marginLeft, yPos);

        if (field.style.underline) {
          this.renderUnderline(doc, fullText, marginLeft, yPos, field);
        }

        yPos += field.style.fontSize * 0.5 + 2;
      });
  }

  private translateFieldName(field: ReportField): string {
    const def = ALL_AVAILABLE_FIELDS.find(f => f.key === field.dataBinding);
    if (def) {
      return this.translate.instant(def.i18nKey);
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

  private getAlignedTextX(alignment: TextAlignment, marginLeft: number, contentWidth: number): number {
    if (alignment === TextAlignment.Center) return marginLeft + contentWidth / 2;
    if (alignment === TextAlignment.Right) return marginLeft + contentWidth;
    return marginLeft;
  }

  private getJsPdfAlign(alignment: TextAlignment): 'left' | 'center' | 'right' {
    if (alignment === TextAlignment.Center) return 'center';
    if (alignment === TextAlignment.Right) return 'right';
    return 'left';
  }

  // --- Value Resolvers ---

  private resolveHeaderValue(
    field: ReportField,
    client: IWorkScheduleClient,
    context: ReportGenerationContext
  ): string {
    switch (field.dataBinding) {
      case 'client.name': return client.name ?? '';
      case 'client.firstName': return client.firstName ?? '';
      case 'client.company': return client.company ?? '';
      case 'client.idNumber': return client.idNumber?.toString() ?? '';
      case 'report.period': return `${this.formatDate(context.startDate)} - ${this.formatDate(context.endDate)}`;
      case 'report.date': return this.formatDate(new Date().toISOString());
      case 'report.groupName': return context.groupName;
      case 'report.customText': return field.name ?? '';
      default: return '';
    }
  }

  private resolveEntryValue(field: ReportField, entry: IScheduleCell, prefix: string): string {
    const binding = field.dataBinding;

    if (binding === 'entry.date' || binding === 'expense.date') {
      return this.formatDate(entry.entryDate?.toString() ?? '');
    }
    if (binding === 'entry.weekday') {
      return this.getWeekday(entry.entryDate);
    }
    if (binding === 'entry.startTime') {
      return this.formatTime(entry.startTime);
    }
    if (binding === 'entry.endTime') {
      return this.formatTime(entry.endTime);
    }
    if (binding === 'entry.hours') {
      return hoursToHHMM(entry.changeTime);
    }
    if (binding === 'entry.surcharges') {
      return hoursToHHMM(entry.surcharges);
    }
    if (binding === 'entry.shiftName' || binding === 'expense.shiftName') {
      return entry.entryName ?? '';
    }
    if (binding === 'entry.shiftAbbr') {
      return entry.abbreviation ?? '';
    }
    if (binding === 'entry.type') {
      return this.getEntryTypeLabel(entry.entryType);
    }
    if (binding === 'entry.information') {
      return entry.information ?? '';
    }
    if (binding === 'entry.description' || binding === 'expense.description') {
      if (entry.description) {
        const lang = this.translate.currentLang || 'de';
        return (entry.description as Record<string, string>)[lang] ?? '';
      }
      return '';
    }
    if (binding === 'expense.amount') {
      return entry.amount != null ? entry.amount.toFixed(2) : '';
    }
    if (binding === 'expense.taxable') {
      return entry.taxable != null ? (entry.taxable ? this.translate.instant('general.yes') : this.translate.instant('general.no')) : '';
    }

    return '';
  }

  private resolveFooterValue(field: ReportField, clientData: ClientReportData): string {
    switch (field.dataBinding) {
      case 'sum.hours': {
        const total = clientData.workEntries.reduce((sum, e) => sum + (e.changeTime ?? 0), 0);
        return hoursToHHMM(total);
      }
      case 'sum.surcharges': {
        const total = clientData.workEntries.reduce((sum, e) => sum + (e.surcharges ?? 0), 0);
        return hoursToHHMM(total);
      }
      case 'sum.expenses': {
        const total = clientData.expenseEntries.reduce((sum, e) => sum + (e.amount ?? 0), 0);
        return total.toFixed(2);
      }
      case 'sum.workDays': {
        const uniqueDates = new Set(
          clientData.workEntries
            .filter(e => e.entryType === WorkScheduleEntryType.Work)
            .map(e => new Date(e.entryDate).toDateString())
        );
        return uniqueDates.size.toString();
      }
      default: return '';
    }
  }

  // --- Format Helpers ---

  private formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private formatTime(time: string): string {
    if (!time) return '';
    return time.substring(0, 5);
  }


  private getWeekday(date: Date | string): string {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    return this.translate.instant(days[d.getDay()]);
  }

  private getEntryTypeLabel(type: number): string {
    switch (type) {
      case WorkScheduleEntryType.Work: return this.translate.instant('schedule.entryType.work');
      case WorkScheduleEntryType.WorkChange: return this.translate.instant('schedule.entryType.workChange');
      case WorkScheduleEntryType.Break: return this.translate.instant('schedule.entryType.break');
      case WorkScheduleEntryType.Expenses: return this.translate.instant('schedule.entryType.expenses');
      default: return '';
    }
  }
}
