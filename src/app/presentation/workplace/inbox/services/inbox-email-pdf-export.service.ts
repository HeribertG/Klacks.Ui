// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Exports the currently displayed inbox email as a PDF opened in a new browser tab.
 * @param data - Subject, body (HTML or plain text) and metadata of the email exactly as shown to the user
 */
import { Injectable, inject } from '@angular/core';
import { LocaleService } from 'src/app/application/services/locale.service';
import { companyTimeZone } from 'src/app/shared/helpers/calendar-date.helper';
import { formatCompanyInstant } from 'src/app/shared/pipes/company-date-time/company-date-time.formatter';
import { jsPDF } from 'jspdf';
import { TranslateService } from '@ngx-translate/core';
import { openBlobInNewTab } from 'src/app/shared/helpers/file-download.helper';
import { htmlToPlainText } from 'src/app/shared/helpers/html-sanitizer.helper';

export interface InboxEmailPrintData {
  subject: string;
  bodyHtml: string | null;
  bodyText: string | null;
  fromName: string;
  fromAddress: string;
  toAddress: string;
  receivedDate: string;
  folder: string;
}

const PDF_MARGIN = 20;
const PDF_TITLE_FONT_SIZE = 14;
const PDF_META_FONT_SIZE = 10;
const PDF_BODY_FONT_SIZE = 10;
const PDF_TITLE_Y = 20;
const PDF_TITLE_LINE_HEIGHT = 6;
const PDF_META_LINE_HEIGHT = 6;
const PDF_META_TO_BODY_GAP = 5;

@Injectable({
  providedIn: 'root',
})
export class InboxEmailPdfExportService {
  private translateService = inject(TranslateService);
  private localeService = inject(LocaleService);

  exportEmail(data: InboxEmailPrintData): void {
    const pdf = this.createPdfInstance();

    const bodyStartY = this.renderHeader(pdf, data);
    this.renderBody(pdf, data, bodyStartY);

    const fileName = `email-${new Date().getTime()}.pdf`;
    openBlobInNewTab(pdf.output('blob'), fileName);
  }

  private createPdfInstance(): jsPDF {
    return new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
  }

  private renderHeader(pdf: jsPDF, data: InboxEmailPrintData): number {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const maxWidth = pageWidth - PDF_MARGIN * 2;

    pdf.setFontSize(PDF_TITLE_FONT_SIZE);
    pdf.setFont('helvetica', 'bold');
    const titleLines: string[] = pdf.splitTextToSize(data.subject || '', maxWidth);
    pdf.text(titleLines, PDF_MARGIN, PDF_TITLE_Y);

    let y = PDF_TITLE_Y + titleLines.length * PDF_TITLE_LINE_HEIGHT;

    pdf.setFontSize(PDF_META_FONT_SIZE);
    pdf.setFont('helvetica', 'normal');

    const from = data.fromName ? `${data.fromName} <${data.fromAddress}>` : data.fromAddress;
    const metaLines = [
      `${this.translateService.instant('inbox.detail.from')} ${from}`,
      `${this.translateService.instant('inbox.detail.to')} ${data.toAddress}`,
      `${this.translateService.instant('inbox.detail.date')} ${this.formatDateTime(data.receivedDate)}`,
      `${this.translateService.instant('inbox.detail.folder')} ${data.folder}`,
    ];

    for (const line of metaLines) {
      pdf.text(line, PDF_MARGIN, y);
      y += PDF_META_LINE_HEIGHT;
    }

    pdf.setLineWidth(0.2);
    pdf.line(PDF_MARGIN, y, pageWidth - PDF_MARGIN, y);

    return y + PDF_META_TO_BODY_GAP;
  }

  private renderBody(pdf: jsPDF, data: InboxEmailPrintData, startY: number): void {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const maxWidth = pageWidth - PDF_MARGIN * 2;

    pdf.setFontSize(PDF_BODY_FONT_SIZE);
    pdf.setFont('helvetica', 'normal');
    const lineHeight = pdf.getLineHeight() / pdf.internal.scaleFactor;

    let y = startY;
    for (const paragraph of this.resolvePlainText(data).split('\n')) {
      const lines: string[] = paragraph ? pdf.splitTextToSize(paragraph, maxWidth) : [''];
      for (const line of lines) {
        if (y > pageHeight - PDF_MARGIN) {
          pdf.addPage();
          y = PDF_MARGIN;
        }
        pdf.text(line, PDF_MARGIN, y);
        y += lineHeight;
      }
    }
  }

  private resolvePlainText(data: InboxEmailPrintData): string {
    return data.bodyHtml ? htmlToPlainText(data.bodyHtml) : data.bodyText || '';
  }

  private formatDateTime(dateTimeStr: string): string {
    return (
      formatCompanyInstant(dateTimeStr, 'dateTime', this.localeService.getLocale(), companyTimeZone()) ??
      dateTimeStr
    );
  }
}
