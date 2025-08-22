/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, inject } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { IBreak } from 'src/app/domain/models/break-class';
import { DatePipe } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root',
})
export class PdfExportService {
  private datePipe = new DatePipe('en-US');
  private translateService = inject(TranslateService);

  exportBreaksTableToPdf(
    breaks: IBreak[],
    clientName: string,
    absenceNameResolver: (breakItem: IBreak) => string,
    absenceValueResolver: (breakItem: IBreak) => number | string
  ): void {
    const pdf = new jsPDF('landscape');

    const title = `Absence Report - ${clientName}`;
    pdf.setFontSize(16);
    pdf.text(title, 14, 15);

    pdf.setFontSize(10);
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 25);

    const tableData = breaks.map((breakItem) => [
      this.formatDate(breakItem.from),
      this.formatDate(breakItem.until),
      absenceNameResolver(breakItem),
      absenceValueResolver(breakItem).toString(),
      breakItem.information || '',
    ]);

    const headers = [
      this.translateService.instant(
        'absence-gantt.absence-gantt-mask.absence-gantt-mask.list.from'
      ),
      this.translateService.instant(
        'absence-gantt.absence-gantt-mask.absence-gantt-mask.list.until'
      ),
      this.translateService.instant(
        'absence-gantt.absence-gantt-mask.absence-gantt-mask.list.absence'
      ),
      this.translateService.instant(
        'absence-gantt.absence-gantt-mask.absence-gantt-mask.list.value'
      ),
      this.translateService.instant(
        'absence-gantt.absence-gantt-mask.absence-gantt-mask.list.note'
      ),
    ];

    autoTable(pdf, {
      head: [headers],
      body: tableData,
      startY: 35,
      theme: 'striped',
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontSize: 11,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 'auto', halign: 'center' },
        4: { cellWidth: 'auto' },
      },
    });

    const pageCount = (pdf as any).internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.text(
        `Page ${i} of ${pageCount}`,
        pdf.internal.pageSize.width - 25,
        pdf.internal.pageSize.height - 10
      );
    }

    pdf.save(`absence-report-${clientName}-${new Date().getTime()}.pdf`);
  }

  private formatDate(date: Date | undefined): string {
    if (!date) return '';
    const dateObj = date instanceof Date ? date : new Date(date);
    return this.datePipe.transform(dateObj, 'dd.MM.yyyy') || '';
  }
}
