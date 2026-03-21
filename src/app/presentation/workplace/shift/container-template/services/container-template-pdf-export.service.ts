// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Fassade für den PDF-Export von Container-Templates und Routen.
 * Delegiert Template-Export an interne Logik und Routen-Export an RoutePdfExportService.
 * @param items - Container-Template-Items mit Schicht- und Adressdaten
 * @param routeInfo - Routeninformationen für den Routen-PDF-Export
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, inject } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TranslateService } from '@ngx-translate/core';
import {
  IContainerTemplateItem,
  IRouteInfo,
} from 'src/app/domain/models/container/container-template-class';
import { AddressTypeEnum } from 'src/app/domain/enums/client-enum';
import { RoutePdfExportService } from './route-pdf-export.service';

export type { RouteInfo, RouteLocation } from './route-pdf-export.service';

const PDF_MARGIN = 14;
const PDF_TITLE_Y = 15;
const PDF_GENERATED_Y = 22;
const PDF_TIME_RANGE_Y = 29;
const PDF_SUMMARY_START_Y = 40;
const PDF_PAGE_NUMBER_OFFSET_X = 40;
const PDF_PAGE_NUMBER_OFFSET_Y = 10;

const FONT_SIZE_TITLE = 16;
const FONT_SIZE_HEADER = 11;
const FONT_SIZE_NORMAL = 10;
const FONT_SIZE_TINY = 8;

const TABLE_HEADER_COLOR: [number, number, number] = [66, 139, 202];
const TABLE_TEXT_COLOR_WHITE = 255;

const COLUMN_WIDTH_WIDE = 40;
const COLUMN_WIDTH_EXTRA_WIDE = 60;
const CELL_PADDING_NORMAL = 3;

const MINUTES_PER_HOUR = 60;

const PDF_ORIENTATION_LANDSCAPE = 'landscape' as const;
const PDF_TABLE_THEME_STRIPED = 'striped' as const;
const FONT_STYLE_BOLD = 'bold' as const;

@Injectable()
export class ContainerTemplatePdfExportService {
  private translateService = inject(TranslateService);
  private routePdfExportService = inject(RoutePdfExportService);

  exportContainerTemplateToPdf(
    items: IContainerTemplateItem[],
    containerName: string,
    weekday: string,
    timeFrom: string,
    timeTo: string
  ): void {
    const pdf = new jsPDF(PDF_ORIENTATION_LANDSCAPE);

    const translatedWeekday = this.translateWeekday(weekday);
    const title = `${containerName} - ${translatedWeekday}`;
    pdf.setFontSize(FONT_SIZE_TITLE);
    pdf.text(title, PDF_MARGIN, PDF_TITLE_Y);

    pdf.setFontSize(FONT_SIZE_NORMAL);
    pdf.text(
      `${this.translateService.instant(
        'pdf.generated'
      )}: ${new Date().toLocaleDateString()}`,
      PDF_MARGIN,
      PDF_GENERATED_Y
    );
    pdf.text(
      `${this.translateService.instant(
        'shift.container-template.time-range'
      )}: ${timeFrom} - ${timeTo}`,
      PDF_MARGIN,
      PDF_TIME_RANGE_Y
    );

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
      startY: PDF_SUMMARY_START_Y,
      theme: PDF_TABLE_THEME_STRIPED,
      headStyles: {
        fillColor: TABLE_HEADER_COLOR,
        textColor: TABLE_TEXT_COLOR_WHITE,
        fontSize: FONT_SIZE_HEADER,
        fontStyle: FONT_STYLE_BOLD,
      },
      styles: {
        fontSize: FONT_SIZE_NORMAL,
        cellPadding: CELL_PADDING_NORMAL,
      },
      columnStyles: {
        0: { cellWidth: COLUMN_WIDTH_EXTRA_WIDE },
        1: { cellWidth: 'auto' },
        2: { cellWidth: COLUMN_WIDTH_WIDE, halign: 'center' },
        3: { cellWidth: COLUMN_WIDTH_WIDE, halign: 'center' },
        4: { cellWidth: COLUMN_WIDTH_WIDE, halign: 'center' },
        5: { cellWidth: 'auto' },
      },
    });

    const pageCount = (pdf as any).internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(FONT_SIZE_TINY);
      pdf.text(
        `${this.translateService.instant(
          'pdf.page'
        )} ${i} ${this.translateService.instant('pdf.of')} ${pageCount}`,
        pdf.internal.pageSize.width - PDF_PAGE_NUMBER_OFFSET_X,
        pdf.internal.pageSize.height - PDF_PAGE_NUMBER_OFFSET_Y
      );
    }

    const timestamp = new Date().getTime();
    const sanitizedName = containerName
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();
    pdf.save(`container-template-${sanitizedName}-${weekday}-${timestamp}.pdf`);
  }

  async exportRouteToPdf(
    items: IContainerTemplateItem[],
    routeInfo: IRouteInfo,
    containerName: string,
    weekday: string,
    timeFrom: string
  ): Promise<void> {
    return this.routePdfExportService.exportRouteToPdf(
      items,
      routeInfo,
      containerName,
      weekday,
      timeFrom,
      (wd) => this.translateWeekday(wd)
    );
  }

  private formatStartTime(item: IContainerTemplateItem): string {
    const timeString = item.shift?.isTimeRange
      ? item.timeRangeStartItem || item.startItem || ''
      : item.startItem || '';
    return this.formatTimeToHHMM(timeString);
  }

  private formatEndTime(item: IContainerTemplateItem): string {
    const timeString = item.shift?.isTimeRange
      ? item.timeRangeEndItem || item.endItem || ''
      : item.endItem || '';
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

  private translateWeekday(weekday: string): string {
    const weekdayMap: Record<string, string> = {
      Mo: 'shift.container-template.weekday-full.monday',
      Di: 'shift.container-template.weekday-full.tuesday',
      Mi: 'shift.container-template.weekday-full.wednesday',
      Do: 'shift.container-template.weekday-full.thursday',
      Fr: 'shift.container-template.weekday-full.friday',
      Sa: 'shift.container-template.weekday-full.saturday',
      So: 'shift.container-template.weekday-full.sunday',
      Feiertag: 'shift.container-template.weekday.holiday',
      monday: 'shift.container-template.weekday-full.monday',
      tuesday: 'shift.container-template.weekday-full.tuesday',
      wednesday: 'shift.container-template.weekday-full.wednesday',
      thursday: 'shift.container-template.weekday-full.thursday',
      friday: 'shift.container-template.weekday-full.friday',
      saturday: 'shift.container-template.weekday-full.saturday',
      sunday: 'shift.container-template.weekday-full.sunday',
      holiday: 'shift.container-template.weekday.holiday',
    };

    const translationKey =
      weekdayMap[weekday.toLowerCase()] || weekdayMap[weekday];
    if (translationKey) {
      return this.translateService.instant(translationKey);
    }
    return weekday;
  }

  private formatDuration(item: IContainerTemplateItem): string {
    if (item.shift?.workTime) {
      const hours = Math.floor(item.shift.workTime);
      const minutes = Math.round((item.shift.workTime - hours) * MINUTES_PER_HOUR);
      return `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}`;
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
