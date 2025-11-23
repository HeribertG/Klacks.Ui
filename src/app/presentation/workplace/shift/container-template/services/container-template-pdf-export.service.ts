/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, inject } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TranslateService } from '@ngx-translate/core';
import { IContainerTemplateItem } from 'src/app/domain/models/container-template-class';

@Injectable({
  providedIn: 'root',
})
export class ContainerTemplatePdfExportService {
  private translateService = inject(TranslateService);

  exportContainerTemplateToPdf(
    items: IContainerTemplateItem[],
    containerName: string,
    weekday: string,
    timeFrom: string,
    timeTo: string
  ): void {
    const pdf = new jsPDF('landscape');

    const title = `${containerName} - ${weekday}`;
    pdf.setFontSize(16);
    pdf.text(title, 14, 15);

    pdf.setFontSize(10);
    pdf.text(`${this.translateService.instant('pdf.generated')}: ${new Date().toLocaleDateString()}`, 14, 22);
    pdf.text(`${this.translateService.instant('shift.container-template.time-range')}: ${timeFrom} - ${timeTo}`, 14, 29);

    const tableData = items.map((item) => [
      item.shift?.name || '',
      item.startShift || '',
      item.endShift || '',
      this.formatDuration(item),
      this.formatShiftType(item),
    ]);

    const headers = [
      this.translateService.instant('shift.container-template.shift-name'),
      this.translateService.instant('shift.container-template.start-time'),
      this.translateService.instant('shift.container-template.end-time'),
      this.translateService.instant('shift.container-template.duration'),
      this.translateService.instant('shift.container-template.type'),
    ];

    autoTable(pdf, {
      head: [headers],
      body: tableData,
      startY: 40,
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
        1: { cellWidth: 40, halign: 'center' },
        2: { cellWidth: 40, halign: 'center' },
        3: { cellWidth: 40, halign: 'center' },
        4: { cellWidth: 60, halign: 'center' },
      },
    });

    const pageCount = (pdf as any).internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.text(
        `${this.translateService.instant('pdf.page')} ${i} ${this.translateService.instant('pdf.of')} ${pageCount}`,
        pdf.internal.pageSize.width - 40,
        pdf.internal.pageSize.height - 10
      );
    }

    const timestamp = new Date().getTime();
    const sanitizedName = containerName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    pdf.save(`container-template-${sanitizedName}-${weekday}-${timestamp}.pdf`);
  }

  private formatDuration(item: IContainerTemplateItem): string {
    if (item.shift?.workTime) {
      const hours = Math.floor(item.shift.workTime);
      const minutes = Math.round((item.shift.workTime - hours) * 60);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    return '';
  }

  private formatShiftType(item: IContainerTemplateItem): string {
    if (item.shift?.isTimeRange) {
      return this.translateService.instant('shift.container-template.time-range-shift');
    }
    if (item.shift?.isSporadic) {
      return this.translateService.instant('shift.container-template.sporadic-shift');
    }
    return this.translateService.instant('shift.container-template.fixed-shift');
  }
}
