// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for PDF generation of the period-closing issues card in report format.
 * Mirrors layout when document.documentElement.dir === 'rtl' so right-to-left languages
 * see headers, columns and footers in the expected order (Latin/Cyrillic still render
 * the text itself unchanged; full RTL glyph support would need a custom font).
 * @param issues - Aggregated PeriodIssue entries shown in the card
 * @param periodLabel - Human-readable period label (e.g. "April 2026") rendered under the title
 * @param unstaffedShiftCount - Period-wide total of unfilled shift slots, rendered as a summary line
 * @param unstaffedShiftTruncated - When true the count is rendered with a trailing "+" lower-bound marker
 */
import { Injectable, inject } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TranslateService } from '@ngx-translate/core';
import { PeriodIssue } from 'src/app/infrastructure/api/period-closing/models/period-issue';

const PDF_MARGIN = 20;
const PDF_TITLE_FONT_SIZE = 16;
const PDF_META_FONT_SIZE = 10;
const PDF_TABLE_FONT_SIZE = 9;
const PDF_PAGE_NUMBER_FONT_SIZE = 8;
const PDF_TITLE_Y = 25;
const PDF_PERIOD_Y = 33;
const PDF_META_Y = 40;
const PDF_SUMMARY_Y = 47;
const PDF_TABLE_START_Y = 55;
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
export class PeriodIssuesPdfExportService {
  private translateService = inject(TranslateService);

  private get isRtl(): boolean {
    return document.documentElement.dir === 'rtl';
  }

  exportToPdf(
    issues: PeriodIssue[],
    periodLabel: string,
    unstaffedShiftCount: number,
    unstaffedShiftTruncated: boolean,
  ): void {
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    this.renderHeader(pdf, periodLabel, unstaffedShiftCount, unstaffedShiftTruncated);
    this.renderTable(pdf, issues);
    this.renderPageNumbers(pdf);

    pdf.save(`period-issues-${new Date().getTime()}.pdf`);
  }

  private renderHeader(
    pdf: jsPDF,
    periodLabel: string,
    unstaffedShiftCount: number,
    unstaffedShiftTruncated: boolean,
  ): void {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const align: 'left' | 'right' = this.isRtl ? 'right' : 'left';
    const x = this.isRtl ? pageWidth - PDF_MARGIN : PDF_MARGIN;

    pdf.setFontSize(PDF_TITLE_FONT_SIZE);
    pdf.setFont('helvetica', 'bold');
    pdf.text(
      this.translateService.instant('periodClosing.issues.pdf.title'),
      x,
      PDF_TITLE_Y,
      { align },
    );

    pdf.setFontSize(PDF_META_FONT_SIZE);
    pdf.setFont('helvetica', 'bold');
    if (periodLabel) {
      pdf.text(periodLabel, x, PDF_PERIOD_Y, { align });
    }

    pdf.setFont('helvetica', 'normal');
    pdf.text(
      `${this.translateService.instant('periodClosing.issues.pdf.generated')}: ${new Date().toLocaleDateString()}`,
      x,
      PDF_META_Y,
      { align },
    );

    if (unstaffedShiftCount > 0) {
      const suffix = unstaffedShiftTruncated ? '+' : '';
      pdf.text(
        this.translateService.instant('periodClosing.issues.unstaffedShifts', {
          count: unstaffedShiftCount,
          suffix,
        }),
        x,
        PDF_SUMMARY_Y,
        { align },
      );
    }
  }

  private renderTable(pdf: jsPDF, issues: PeriodIssue[]): void {
    const headers = [
      this.translateService.instant('periodClosing.issues.pdf.column.type'),
      this.translateService.instant('periodClosing.issues.pdf.column.date'),
      this.translateService.instant('periodClosing.issues.pdf.column.client'),
      this.translateService.instant('periodClosing.issues.pdf.column.message'),
    ];

    const bodyData = issues.map((issue) => [
      this.translateService.instant(`periodClosing.issues.severity.${issue.severity}`),
      issue.date,
      issue.clientName,
      this.translateService.instant(issue.messageKey, issue.messageParams || {}),
    ]);

    const totalLabel = this.translateService.instant('periodClosing.issues.pdf.total');
    const foot = [[totalLabel, `${issues.length}`, '', '']];

    const columnStyles: Record<number, { cellWidth: number | 'auto' }> = {
      0: { cellWidth: COLUMN_WIDTH_TYPE },
      1: { cellWidth: COLUMN_WIDTH_DATE },
      2: { cellWidth: COLUMN_WIDTH_CLIENT },
      3: { cellWidth: 'auto' },
    };

    const orderedHeaders = this.isRtl ? [...headers].reverse() : headers;
    const orderedBody = this.isRtl ? bodyData.map((r) => [...r].reverse()) : bodyData;
    const orderedFoot = this.isRtl ? foot.map((r) => [...r].reverse()) : foot;
    const orderedColumnStyles: Record<number, { cellWidth: number | 'auto' }> = this.isRtl
      ? {
          0: columnStyles[3],
          1: columnStyles[2],
          2: columnStyles[1],
          3: columnStyles[0],
        }
      : columnStyles;
    const halign: 'left' | 'right' = this.isRtl ? 'right' : 'left';

    autoTable(pdf, {
      head: [orderedHeaders],
      body: orderedBody,
      foot: orderedFoot,
      startY: PDF_TABLE_START_Y,
      margin: { left: PDF_MARGIN, right: PDF_MARGIN },
      theme: 'grid',
      headStyles: {
        fillColor: TABLE_HEADER_COLOR,
        textColor: TABLE_HEADER_TEXT_COLOR,
        fontSize: PDF_TABLE_FONT_SIZE,
        fontStyle: 'bold',
        halign,
      },
      bodyStyles: {
        fontSize: PDF_TABLE_FONT_SIZE,
        halign,
      },
      footStyles: {
        fillColor: TABLE_FOOTER_COLOR,
        textColor: [0, 0, 0],
        fontSize: PDF_TABLE_FONT_SIZE,
        fontStyle: 'bold',
        halign,
      },
      alternateRowStyles: {
        fillColor: TABLE_ALTERNATE_ROW_COLOR,
      },
      columnStyles: orderedColumnStyles,
    });
  }

  private renderPageNumbers(pdf: jsPDF): void {
    const pageCount = pdf.getNumberOfPages();
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    const x = this.isRtl ? PDF_MARGIN : pageWidth - PDF_MARGIN - 5;
    const align: 'left' | 'right' = this.isRtl ? 'left' : 'right';
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(PDF_PAGE_NUMBER_FONT_SIZE);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${i} / ${pageCount}`, x, pageHeight - 10, { align });
    }
  }
}
