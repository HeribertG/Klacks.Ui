import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { ReportTemplate } from '../../models/report/report-template.model';
import { ReportSection, ReportSectionType } from '../../models/report/report-section.model';
import { ReportField, ReportFieldType } from '../../models/report/report-field.model';
import { IScheduleCell, IWorkScheduleClient, WorkScheduleEntryType } from '../../models/work-schedule-class';

export interface ReportGenerationContext {
  template: ReportTemplate;
  clients: IWorkScheduleClient[];
  entries: IScheduleCell[];
  groupName: string;
  startDate: string;
  endDate: string;
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

  generatePdf(context: ReportGenerationContext): Blob {
    const { template } = context;
    const isLandscape = template.pageSetup.orientation === 1;
    const doc = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const clientDataList = this.buildClientData(context);

    clientDataList.forEach((clientData, index) => {
      if (index > 0) {
        doc.addPage();
      }
      this.renderClientReport(doc, template, clientData, context);
    });

    return doc.output('blob');
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
    context: ReportGenerationContext
  ): void {
    let yPos = template.pageSetup.margins.top;
    const marginLeft = template.pageSetup.margins.left;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - marginLeft - template.pageSetup.margins.right;

    const headerSection = template.sections.find(s => s.type === ReportSectionType.Header);
    if (headerSection?.visible && headerSection.fields.length > 0) {
      yPos = this.renderHeader(doc, headerSection, clientData, context, yPos, marginLeft, contentWidth);
      yPos += 5;
    }

    const workSection = template.sections.find(s => s.type === ReportSectionType.WorkTable);
    if (workSection?.visible && workSection.fields.length > 0 && clientData.workEntries.length > 0) {
      yPos = this.renderTable(doc, workSection, clientData.workEntries, 'work', yPos, marginLeft, contentWidth);
      yPos += 5;
    }

    const expenseSection = template.sections.find(s => s.type === ReportSectionType.ExpensesTable);
    if (expenseSection?.visible && expenseSection.fields.length > 0 && clientData.expenseEntries.length > 0) {
      yPos = this.renderTable(doc, expenseSection, clientData.expenseEntries, 'expense', yPos, marginLeft, contentWidth);
      yPos += 5;
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
    contentWidth: number
  ): number {
    section.fields
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach(field => {
        const value = this.resolveHeaderValue(field, clientData.client, context);
        doc.setFontSize(field.style.fontSize);
        if (field.style.bold) {
          doc.setFont('helvetica', 'bold');
        } else {
          doc.setFont('helvetica', 'normal');
        }
        doc.text(value, marginLeft, yPos);
        yPos += field.style.fontSize * 0.5 + 2;
      });

    return yPos;
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
      header: f.name,
      dataKey: f.dataBinding,
    }));

    const columnStyles: Record<string, { cellWidth: number; halign: string; fontSize: number; fontStyle: string }> = {};
    fields.forEach(f => {
      columnStyles[f.dataBinding] = {
        cellWidth: (f.width / totalWidth) * contentWidth,
        halign: f.style.alignment === 0 ? 'left' : f.style.alignment === 1 ? 'center' : 'right',
        fontSize: f.style.fontSize,
        fontStyle: f.style.bold ? 'bold' : 'normal',
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
        if (field.style.bold) {
          doc.setFont('helvetica', 'bold');
        } else {
          doc.setFont('helvetica', 'normal');
        }
        doc.text(`${field.name}: ${value}`, marginLeft, yPos);
        yPos += field.style.fontSize * 0.5 + 2;
      });
  }

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
      return entry.changeTime != null ? this.formatHours(entry.changeTime) : '';
    }
    if (binding === 'entry.surcharges') {
      return entry.surcharges != null ? this.formatHours(entry.surcharges) : '';
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
        return this.formatHours(total);
      }
      case 'sum.surcharges': {
        const total = clientData.workEntries.reduce((sum, e) => sum + (e.surcharges ?? 0), 0);
        return this.formatHours(total);
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

  private formatHours(minutes: number): string {
    if (minutes == null) return '';
    const h = Math.floor(Math.abs(minutes) / 60);
    const m = Math.abs(minutes) % 60;
    const sign = minutes < 0 ? '-' : '';
    return `${sign}${h}:${m.toString().padStart(2, '0')}`;
  }

  private getWeekday(date: Date | string): string {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    return days[d.getDay()];
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
