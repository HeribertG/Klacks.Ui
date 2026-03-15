// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service zur PDF-Generierung der Schedule-Fehlerliste im Report-Format.
 * @param entries - Die zu exportierenden ScheduleErrorEntry-Einträge
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, inject } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TranslateService } from '@ngx-translate/core';
import { ScheduleErrorEntry } from 'src/app/domain/interfaces/schedule-error-entry.interface';

const PDF_MARGIN = 20;
const PDF_TITLE_FONT_SIZE = 16;
const PDF_META_FONT_SIZE = 10;
const PDF_TABLE_FONT_SIZE = 9;
const PDF_PAGE_NUMBER_FONT_SIZE = 8;
const PDF_TITLE_Y = 25;
const PDF_META_Y = 33;
const PDF_TABLE_START_Y = 42;
const TABLE_HEADER_COLOR: [number, number, number] = [66, 66, 66];
const TABLE_HEADER_TEXT_COLOR: [number, number, number] = [255, 255, 255];
const TABLE_FOOTER_COLOR: [number, number, number] = [230, 230, 230];
const TABLE_ALTERNATE_ROW_COLOR: [number, number, number] = [245, 245, 245];
const COLUMN_WIDTH_TYPE = 25;
const COLUMN_WIDTH_DATE = 30;
const COLUMN_WIDTH_CLIENT = 55;

@Injectable({
  providedIn: 'root',
})
export class ScheduleErrorListPdfExportService {
  private translateService = inject(TranslateService);

  exportToPdf(entries: ScheduleErrorEntry[]): void {
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    this.renderHeader(pdf);
    this.renderTable(pdf, entries);
    this.renderPageNumbers(pdf);

    pdf.save(`schedule-error-list-${new Date().getTime()}.pdf`);
  }

  private renderHeader(pdf: jsPDF): void {
    const title = this.translateService.instant('schedule.error-list.pdf.title');
    pdf.setFontSize(PDF_TITLE_FONT_SIZE);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, PDF_MARGIN, PDF_TITLE_Y);

    pdf.setFontSize(PDF_META_FONT_SIZE);
    pdf.setFont('helvetica', 'normal');
    pdf.text(
      `${this.translateService.instant('schedule.error-list.pdf.generated')}: ${new Date().toLocaleDateString()}`,
      PDF_MARGIN,
      PDF_META_Y,
    );
  }

  private renderTable(pdf: jsPDF, entries: ScheduleErrorEntry[]): void {
    const headers = [
      this.translateService.instant('schedule.error-list.pdf.column.type'),
      this.translateService.instant('schedule.error-list.column.date'),
      this.translateService.instant('schedule.error-list.column.client'),
      this.translateService.instant('schedule.error-list.column.comment'),
    ];

    const bodyData = entries.map((entry) => [
      this.translateService.instant(`schedule.error-list.pdf.type.${entry.type}`),
      entry.date,
      entry.clientName,
      this.translateService.instant(entry.comment, entry.commentParams || {}),
    ]);

    const totalLabel = this.translateService.instant('schedule.error-list.pdf.total');
    const foot = [[totalLabel, `${entries.length}`, '', '']];

    autoTable(pdf, {
      head: [headers],
      body: bodyData,
      foot,
      startY: PDF_TABLE_START_Y,
      margin: { left: PDF_MARGIN, right: PDF_MARGIN },
      theme: 'grid',
      headStyles: {
        fillColor: TABLE_HEADER_COLOR,
        textColor: TABLE_HEADER_TEXT_COLOR,
        fontSize: PDF_TABLE_FONT_SIZE,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: PDF_TABLE_FONT_SIZE,
      },
      footStyles: {
        fillColor: TABLE_FOOTER_COLOR,
        textColor: [0, 0, 0],
        fontSize: PDF_TABLE_FONT_SIZE,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: TABLE_ALTERNATE_ROW_COLOR,
      },
      columnStyles: {
        0: { cellWidth: COLUMN_WIDTH_TYPE },
        1: { cellWidth: COLUMN_WIDTH_DATE },
        2: { cellWidth: COLUMN_WIDTH_CLIENT },
        3: { cellWidth: 'auto' },
      },
    });
  }

  private renderPageNumbers(pdf: jsPDF): void {
    const pageCount = (pdf as any).internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(PDF_PAGE_NUMBER_FONT_SIZE);
      pdf.setFont('helvetica', 'normal');
      pdf.text(
        `${i} / ${pageCount}`,
        pdf.internal.pageSize.width - PDF_MARGIN - 5,
        pdf.internal.pageSize.height - 10,
      );
    }
  }
}
