/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, inject } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TranslateService } from '@ngx-translate/core';
import { IContainerTemplateItem } from 'src/app/domain/models/container-template-class';
import { AddressTypeEnum } from 'src/app/domain/enums/client-enum';

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
      item.shift?.description || '',
      this.formatStartTime(item),
      this.formatEndTime(item),
      this.formatDuration(item),
      this.formatClientWithAddress(item),
    ]);

    const headers = [
      this.translateService.instant('shift.container-template.shift-name'),
      this.translateService.instant('shift.container-template.description'),
      this.translateService.instant('shift.container-template.start-time'),
      this.translateService.instant('shift.container-template.end-time'),
      this.translateService.instant('shift.container-template.duration'),
      this.translateService.instant('shift.container-template.address'),
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
        0: { cellWidth: 60 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 40, halign: 'center' },
        3: { cellWidth: 40, halign: 'center' },
        4: { cellWidth: 40, halign: 'center' },
        5: { cellWidth: 'auto' },
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

  private formatStartTime(item: IContainerTemplateItem): string {
    const timeString = item.shift?.isTimeRange
      ? (item.timeRangeStartShift || item.startShift || '')
      : (item.startShift || '');
    return this.formatTimeToHHMM(timeString);
  }

  private formatEndTime(item: IContainerTemplateItem): string {
    const timeString = item.shift?.isTimeRange
      ? (item.timeRangeEndShift || item.endShift || '')
      : (item.endShift || '');
    return this.formatTimeToHHMM(timeString);
  }

  private formatTimeToHHMM(timeString: string): string {
    if (!timeString) return '';
    const parts = timeString.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`;
    }
    return timeString;
  }

  private formatDuration(item: IContainerTemplateItem): string {
    if (item.shift?.workTime) {
      const hours = Math.floor(item.shift.workTime);
      const minutes = Math.round((item.shift.workTime - hours) * 60);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    return '';
  }

  private formatClientWithAddress(item: IContainerTemplateItem): string {
    const shift = item.shift;

    if (!shift?.client) {
      return '-';
    }

    const client = shift.client;
    const employeeAddress = client.addresses?.find(
      (addr) => addr.type === AddressTypeEnum.customer
    );

    if (!employeeAddress) {
      return client.name || '-';
    }

    const addressParts = [
      employeeAddress.street,
      employeeAddress.zip,
      employeeAddress.city,
    ].filter((part) => part && part.trim() !== '');

    const addressString = addressParts.join(', ');
    return addressString
      ? `${client.name}: ${addressString}`
      : client.name || '-';
  }
}
