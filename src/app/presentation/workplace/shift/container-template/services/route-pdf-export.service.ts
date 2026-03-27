// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for PDF export of route information including map, route table, and directions.
 * @param routeInfo - Contains optimized route, segments, distances, and travel times
 * @param items - Container template items with shift and address data
 * @param mapRenderingService - Renders the route map as a canvas element
 */
import { Injectable, inject } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TranslateService } from '@ngx-translate/core';
import {
  IContainerTemplateItem,
  IRouteInfo,
  IRouteLocation,
} from 'src/app/domain/models/container/container-template-class';
import { MapRenderingService } from './map-rendering.service';
import { formatClientWithAddress } from 'src/app/shared/helpers/container-template-format.helper';

export type RouteInfo = IRouteInfo;
export type RouteLocation = IRouteLocation;

const PDF_MARGIN = 14;
const PDF_TITLE_Y = 15;
const PDF_GENERATED_Y = 22;
const PDF_SUMMARY_TITLE_Y = 32;
const PDF_SUMMARY_START_Y = 40;
const PDF_LINE_SPACING = 6;
const PDF_SECTION_SPACING = 8;
const PDF_PAGE_START_Y = 20;
const PDF_PAGE_NUMBER_OFFSET_X = 40;
const PDF_PAGE_NUMBER_OFFSET_Y = 10;

const FONT_SIZE_TITLE = 16;
const FONT_SIZE_SECTION = 12;
const FONT_SIZE_HEADER = 11;
const FONT_SIZE_NORMAL = 10;
const FONT_SIZE_SMALL = 9;
const FONT_SIZE_TINY = 8;

const TABLE_HEADER_COLOR: [number, number, number] = [66, 139, 202];
const TABLE_TEXT_COLOR_WHITE = 255;
const TEXT_COLOR_GRAY = 100;

const COLUMN_WIDTH_NARROW = 10;
const COLUMN_WIDTH_MEDIUM = 25;
const CELL_PADDING_SMALL = 2;

const MAP_PDF_MARGIN = 85;

const DIRECTION_BOX_HEIGHT = 10;
const DIRECTION_BOX_MARGIN = 6;
const DIRECTION_STEP_SPACING = 5;
const DIRECTION_TEXT_OFFSET = 18;
const DIRECTION_INSTRUCTION_OFFSET = 26;
const DIRECTION_PAGE_BREAK_THRESHOLD = 50;
const DIRECTION_STEP_PAGE_BREAK_THRESHOLD = 20;
const DIRECTION_NEW_PAGE_START_Y = 15;

const METERS_PER_KM = 1000;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

const PDF_ORIENTATION_LANDSCAPE = 'landscape' as const;
const PDF_IMAGE_FORMAT_PNG = 'PNG' as const;
const PDF_TABLE_THEME_STRIPED = 'striped' as const;
const PDF_RECT_FILL = 'F' as const;

const FONT_FAMILY_HELVETICA = 'helvetica';
const FONT_STYLE_BOLD = 'bold' as const;
const FONT_STYLE_NORMAL = 'normal' as const;

@Injectable()
export class RoutePdfExportService {
  private translateService = inject(TranslateService);
  private mapRenderingService = inject(MapRenderingService);

  async exportRouteToPdf(
    items: IContainerTemplateItem[],
    routeInfo: RouteInfo,
    containerName: string,
    weekday: string,
    timeFrom: string,
    translateWeekday: (weekday: string) => string
  ): Promise<void> {
    const pdf = new jsPDF(PDF_ORIENTATION_LANDSCAPE);

    const translatedWeekday = translateWeekday(weekday);
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

    pdf.setFontSize(FONT_SIZE_SECTION);
    pdf.text(
      this.translateService.instant('pdf.route-summary') || 'Route Summary',
      PDF_MARGIN,
      PDF_SUMMARY_TITLE_Y
    );

    pdf.setFontSize(FONT_SIZE_NORMAL);
    pdf.text(
      `${this.translateService.instant('pdf.start-base') || 'Start'}: ${
        routeInfo.startBase
      }`,
      PDF_MARGIN,
      PDF_SUMMARY_START_Y
    );
    pdf.text(
      `${this.translateService.instant('pdf.end-base') || 'End'}: ${
        routeInfo.endBase
      }`,
      PDF_MARGIN,
      PDF_SUMMARY_START_Y + PDF_LINE_SPACING
    );
    pdf.text(
      `${
        this.translateService.instant('pdf.total-distance') || 'Total Distance'
      }: ${routeInfo.totalDistanceKm.toFixed(2)} km`,
      PDF_MARGIN,
      PDF_SUMMARY_START_Y + PDF_LINE_SPACING * 2
    );
    pdf.text(
      `${
        this.translateService.instant('pdf.total-travel-time') ||
        'Total Travel Time'
      }: ${this.formatTimeSpan(routeInfo.estimatedTravelTime)}`,
      PDF_MARGIN,
      PDF_SUMMARY_START_Y + PDF_LINE_SPACING * 3
    );

    const coordinates = this.extractCoordinatesFromItems(items, routeInfo);

    let currentY = PDF_SUMMARY_START_Y + PDF_LINE_SPACING * 5;

    if (coordinates.length > 0) {
      try {
        const mapCanvas = await this.mapRenderingService.generateRouteMapCanvas(coordinates);

        if (mapCanvas) {
          const pageWidth = pdf.internal.pageSize.width;
          const maxMapWidth = pageWidth - MAP_PDF_MARGIN;
          const aspectRatio = mapCanvas.width / mapCanvas.height;
          const mapWidth = maxMapWidth;
          const mapHeight = mapWidth / aspectRatio;

          const mapDataUrl = mapCanvas.toDataURL('image/png');
          pdf.addImage(mapDataUrl, PDF_IMAGE_FORMAT_PNG, PDF_MARGIN, currentY, mapWidth, mapHeight);
        }
      } catch {
        pdf.setFontSize(FONT_SIZE_NORMAL);
        pdf.text('Map could not be generated', PDF_MARGIN, currentY);
      }
    }

    pdf.addPage(PDF_ORIENTATION_LANDSCAPE);
    currentY = PDF_PAGE_START_Y;

    pdf.setFontSize(FONT_SIZE_SECTION);
    pdf.text(
      this.translateService.instant('pdf.route-details') || 'Route Details',
      PDF_MARGIN,
      currentY
    );
    currentY += PDF_SECTION_SPACING;

    const routeData = this.buildRouteTableData(items, routeInfo, timeFrom);

    autoTable(pdf, {
      head: [
        [
          '#',
          this.translateService.instant('pdf.location') || 'Location',
          this.translateService.instant('pdf.arrival') || 'Arrival',
          this.translateService.instant('pdf.departure') || 'Departure',
          this.translateService.instant('pdf.travel-time') || 'Travel Time',
          this.translateService.instant('pdf.distance') || 'Distance',
        ],
      ],
      body: routeData,
      startY: currentY,
      theme: PDF_TABLE_THEME_STRIPED,
      headStyles: {
        fillColor: TABLE_HEADER_COLOR,
        textColor: TABLE_TEXT_COLOR_WHITE,
        fontSize: FONT_SIZE_SMALL,
        fontStyle: FONT_STYLE_BOLD,
      },
      styles: {
        fontSize: FONT_SIZE_TINY,
        cellPadding: CELL_PADDING_SMALL,
      },
      columnStyles: {
        0: { cellWidth: COLUMN_WIDTH_NARROW, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: COLUMN_WIDTH_MEDIUM, halign: 'center' },
        3: { cellWidth: COLUMN_WIDTH_MEDIUM, halign: 'center' },
        4: { cellWidth: COLUMN_WIDTH_MEDIUM, halign: 'center' },
        5: { cellWidth: COLUMN_WIDTH_MEDIUM, halign: 'right' },
      },
    });

    if (routeInfo.segmentDirections && routeInfo.segmentDirections.length > 0) {
      this.addDirectionsSection(pdf, routeInfo.segmentDirections);
    }

    const pageCount = pdf.getNumberOfPages();
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
    pdf.save(`route-${sanitizedName}-${weekday}-${timestamp}.pdf`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private addDirectionsSection(pdf: jsPDF, segmentDirections: any[]): void {
    pdf.addPage(PDF_ORIENTATION_LANDSCAPE);

    let currentY = PDF_PAGE_START_Y;
    pdf.setFontSize(FONT_SIZE_TITLE);
    pdf.setFont(FONT_FAMILY_HELVETICA, FONT_STYLE_BOLD);
    pdf.text(
      this.translateService.instant('pdf.directions') || 'Wegbeschreibung',
      PDF_MARGIN,
      currentY
    );
    pdf.setFont(FONT_FAMILY_HELVETICA, FONT_STYLE_NORMAL);
    currentY += FONT_SIZE_SECTION;

    for (const segment of segmentDirections) {
      if (currentY > pdf.internal.pageSize.height - DIRECTION_PAGE_BREAK_THRESHOLD) {
        pdf.addPage(PDF_ORIENTATION_LANDSCAPE);
        currentY = PDF_PAGE_START_Y;
      }

      pdf.setFillColor(...TABLE_HEADER_COLOR);
      pdf.rect(
        PDF_MARGIN,
        currentY - DIRECTION_BOX_MARGIN,
        pdf.internal.pageSize.width - PDF_MARGIN * 2,
        DIRECTION_BOX_HEIGHT,
        PDF_RECT_FILL
      );

      pdf.setTextColor(TABLE_TEXT_COLOR_WHITE, TABLE_TEXT_COLOR_WHITE, TABLE_TEXT_COLOR_WHITE);
      pdf.setFontSize(FONT_SIZE_HEADER);
      pdf.setFont(FONT_FAMILY_HELVETICA, FONT_STYLE_BOLD);

      const segmentHeader = `${segment.fromName}  -->  ${segment.toName}  (${segment.transportMode})`;
      pdf.text(segmentHeader, DIRECTION_TEXT_OFFSET, currentY + 1);

      const distanceText = `${segment.distanceKm.toFixed(2)} km`;
      pdf.text(
        distanceText,
        pdf.internal.pageSize.width - DIRECTION_TEXT_OFFSET - pdf.getTextWidth(distanceText),
        currentY + 1
      );

      pdf.setTextColor(0, 0, 0);
      currentY += PDF_MARGIN;

      if (segment.steps && segment.steps.length > 0) {
        pdf.setFont(FONT_FAMILY_HELVETICA, FONT_STYLE_NORMAL);
        pdf.setFontSize(FONT_SIZE_SMALL);

        for (let i = 0; i < segment.steps.length; i++) {
          const step = segment.steps[i];

          if (currentY > pdf.internal.pageSize.height - DIRECTION_STEP_PAGE_BREAK_THRESHOLD) {
            pdf.addPage(PDF_ORIENTATION_LANDSCAPE);
            currentY = DIRECTION_NEW_PAGE_START_Y;
          }

          const stepNumber = `${i + 1}.`;
          const distanceStr =
            step.distanceMeters >= METERS_PER_KM
              ? `${(step.distanceMeters / METERS_PER_KM).toFixed(1)} km`
              : `${Math.round(step.distanceMeters)} m`;

          pdf.setFont(FONT_FAMILY_HELVETICA, FONT_STYLE_BOLD);
          pdf.text(stepNumber, DIRECTION_TEXT_OFFSET, currentY);
          pdf.setFont(FONT_FAMILY_HELVETICA, FONT_STYLE_NORMAL);
          pdf.text(step.instruction, DIRECTION_INSTRUCTION_OFFSET, currentY);

          pdf.setTextColor(TEXT_COLOR_GRAY, TEXT_COLOR_GRAY, TEXT_COLOR_GRAY);
          const distanceX =
            pdf.internal.pageSize.width - PDF_MARGIN - pdf.getTextWidth(distanceStr);
          pdf.text(distanceStr, distanceX, currentY);
          pdf.setTextColor(0, 0, 0);

          currentY += DIRECTION_STEP_SPACING;
        }
      } else {
        pdf.setFontSize(FONT_SIZE_SMALL);
        pdf.setTextColor(TEXT_COLOR_GRAY, TEXT_COLOR_GRAY, TEXT_COLOR_GRAY);
        pdf.text(
          this.translateService.instant('pdf.no-directions-available'),
          DIRECTION_TEXT_OFFSET,
          currentY
        );
        pdf.setTextColor(0, 0, 0);
        currentY += DIRECTION_STEP_SPACING;
      }

      currentY += PDF_SECTION_SPACING;
    }
  }

  private extractCoordinatesFromItems(
    _items: IContainerTemplateItem[],
    routeInfo: RouteInfo
  ): { lat: number; lon: number; name: string }[] {
    if (!routeInfo.optimizedRoute || routeInfo.optimizedRoute.length === 0) {
      return [];
    }

    return routeInfo.optimizedRoute
      .filter((loc) => loc.latitude && loc.longitude)
      .map((loc) => ({
        lat: loc.latitude,
        lon: loc.longitude,
        name: loc.name,
      }));
  }

  private buildRouteTableData(
    items: IContainerTemplateItem[],
    routeInfo: RouteInfo,
    timeFrom: string
  ): string[][] {
    const data: string[][] = [];

    const distanceFromStart =
      routeInfo.distanceFromStartBaseKm > 0
        ? `${routeInfo.distanceFromStartBaseKm.toFixed(2)} km`
        : '-';

    const formattedTimeFrom = this.formatTimeToHHMM(timeFrom);

    data.push([
      '0',
      `${this.translateService.instant('pdf.start-base') || 'Start'}: ${
        routeInfo.startBase
      }`,
      formattedTimeFrom,
      formattedTimeFrom,
      this.formatTimeSpan(routeInfo.travelTimeFromStartBase),
      distanceFromStart,
    ]);

    let currentTimeMinutes = this.timeStringToMinutes(timeFrom);

    const routeStepMap = new Map<string, RouteLocation>();
    if (routeInfo.optimizedRoute) {
      routeInfo.optimizedRoute.forEach((step) => {
        if (step.shiftId) {
          routeStepMap.set(step.shiftId, step);
        }
      });
    }

    items.forEach((item, index) => {
      const travelMinutes = this.parseTravelTime(item.travelTimeBefore);
      const arrivalMinutes = currentTimeMinutes + travelMinutes;
      const arrivalTime = this.minutesToTimeString(arrivalMinutes);

      const workMinutes = item.shift?.workTime
        ? Math.round(item.shift.workTime * MINUTES_PER_HOUR)
        : 0;
      const departureMinutes = arrivalMinutes + workMinutes;
      const departureTime = this.minutesToTimeString(departureMinutes);

      const address = formatClientWithAddress(item);

      const routeStep = routeStepMap.get(item.shiftId || '');
      const distanceToNext = routeStep?.distanceToNextKm
        ? `${routeStep.distanceToNextKm.toFixed(2)} km`
        : '-';

      data.push([
        (index + 1).toString(),
        address,
        arrivalTime,
        departureTime,
        this.formatTimeSpan(item.travelTimeBefore),
        distanceToNext,
      ]);

      currentTimeMinutes = departureMinutes;
    });

    if (routeInfo.distanceToEndBaseKm > 0) {
      const returnTravelMinutes = this.parseTravelTime(
        routeInfo.travelTimeToEndBase
      );
      const arrivalAtBase = currentTimeMinutes + returnTravelMinutes;

      data.push([
        (items.length + 1).toString(),
        `${this.translateService.instant('pdf.end-base') || 'End'}: ${
          routeInfo.endBase
        }`,
        this.minutesToTimeString(arrivalAtBase),
        '-',
        this.formatTimeSpan(routeInfo.travelTimeToEndBase),
        `${routeInfo.distanceToEndBaseKm.toFixed(2)} km`,
      ]);
    }

    return data;
  }


  private formatTimeSpan(timeSpan: string): string {
    if (!timeSpan) return '-';
    const parts = timeSpan.split(':');
    if (parts.length >= 2) {
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m`;
    }
    return timeSpan;
  }

  private parseTravelTime(travelTime: string): number {
    if (!travelTime) return 0;
    const parts = travelTime.split(':');
    if (parts.length >= 2) {
      const hours = parseInt(parts[0], 10) || 0;
      const minutes = parseInt(parts[1], 10) || 0;
      return hours * MINUTES_PER_HOUR + minutes;
    }
    return 0;
  }

  private timeStringToMinutes(timeString: string): number {
    const parts = timeString.split(':');
    if (parts.length >= 2) {
      return parseInt(parts[0], 10) * MINUTES_PER_HOUR + parseInt(parts[1], 10);
    }
    return 0;
  }

  private minutesToTimeString(minutes: number): string {
    const hours = Math.floor(minutes / MINUTES_PER_HOUR) % HOURS_PER_DAY;
    const mins = minutes % MINUTES_PER_HOUR;
    return `${hours.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}`;
  }

  private formatTimeToHHMM(timeString: string): string {
    if (!timeString) return '';
    const parts = timeString.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`;
    }
    return timeString;
  }
}
