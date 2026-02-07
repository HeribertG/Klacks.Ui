/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, inject } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import {
  IContainerTemplateItem,
  IRouteInfo,
  IRouteLocation,
} from 'src/app/domain/models/container/container-template-class';
import { AddressTypeEnum } from 'src/app/domain/enums/client-enum';
import { DataRoutingService } from 'src/app/infrastructure/api/data-routing.service';

export type RouteInfo = IRouteInfo;
export type RouteLocation = IRouteLocation;

const PDF_MARGIN = 14;
const PDF_TITLE_Y = 15;
const PDF_GENERATED_Y = 22;
const PDF_TIME_RANGE_Y = 29;
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
const COLUMN_WIDTH_WIDE = 40;
const COLUMN_WIDTH_EXTRA_WIDE = 60;
const CELL_PADDING_NORMAL = 3;
const CELL_PADDING_SMALL = 2;

const MAP_WIDTH = 1200;
const MAP_HEIGHT = 720;
const MAP_PDF_MARGIN = 85;
const MAP_PADDING_PERCENT = 0.05;
const MAP_PADDING_MIN = 0.005;
const MAP_MARKER_PROXIMITY = 20;

const ROUTE_LINE_WIDTH_OUTER = 6;
const ROUTE_LINE_WIDTH_INNER = 4;
const ROUTE_LINE_COLOR_OUTER = '#0044AA';
const ROUTE_LINE_COLOR_INNER = '#3388FF';
const MARKER_STROKE_WIDTH = 3;
const MARKER_RADIUS_NORMAL = 14;
const MARKER_RADIUS_COMBINED = 18;
const MARKER_COLOR_BOTH = '#8822AA';
const MARKER_COLOR_START = '#22AA22';
const MARKER_COLOR_END = '#AA2222';
const MARKER_COLOR_DEFAULT = '#CC4444';

const TILE_SIZE = 256;
const OSM_ATTRIBUTION_WIDTH = 160;
const OSM_ATTRIBUTION_HEIGHT = 18;
const OSM_ATTRIBUTION_MARGIN = 5;
const OSM_ATTRIBUTION_TEXT_OFFSET = 8;

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

const ZOOM_THRESHOLDS = [
  { span: 2, zoom: 8 },
  { span: 1, zoom: 9 },
  { span: 0.5, zoom: 10 },
  { span: 0.2, zoom: 11 },
  { span: 0.1, zoom: 12 },
  { span: 0.05, zoom: 13 },
  { span: 0.02, zoom: 14 },
];
const ZOOM_DEFAULT = 15;

const PDF_ORIENTATION_LANDSCAPE = 'landscape' as const;
const PDF_IMAGE_FORMAT_PNG = 'PNG' as const;
const PDF_TABLE_THEME_STRIPED = 'striped' as const;
const PDF_RECT_FILL = 'F' as const;

const FONT_FAMILY_HELVETICA = 'helvetica';
const FONT_STYLE_BOLD = 'bold' as const;
const FONT_STYLE_NORMAL = 'normal' as const;

const CANVAS_FONT_BOLD_10 = 'bold 10px Arial';
const CANVAS_FONT_BOLD_12 = 'bold 12px Arial';
const CANVAS_FONT_NORMAL_10 = '10px Arial';

const COLOR_WHITE = '#FFFFFF';
const COLOR_GRAY_LIGHT = '#e8e8e8';
const COLOR_GRAY_MEDIUM = '#999999';
const COLOR_GRAY_DARK = '#333333';
const COLOR_SHADOW = 'rgba(0, 0, 0, 0.3)';
const COLOR_ATTRIBUTION_BG = 'rgba(255, 255, 255, 0.9)';
const COLOR_TRANSPARENT = 'transparent';

const OSM_SUBDOMAINS = ['a', 'b', 'c'];
const OSM_ATTRIBUTION_TEXT = '© OpenStreetMap contributors';

@Injectable({
  providedIn: 'root',
})
export class ContainerTemplatePdfExportService {
  private translateService = inject(TranslateService);
  private dataRoutingService = inject(DataRoutingService);

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

  private formatStartTime(item: IContainerTemplateItem): string {
    const timeString = item.shift?.isTimeRange
      ? item.timeRangeStartShift || item.startShift || ''
      : item.startShift || '';
    return this.formatTimeToHHMM(timeString);
  }

  private formatEndTime(item: IContainerTemplateItem): string {
    const timeString = item.shift?.isTimeRange
      ? item.timeRangeEndShift || item.endShift || ''
      : item.endShift || '';
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

  async exportRouteToPdf(
    items: IContainerTemplateItem[],
    routeInfo: RouteInfo,
    containerName: string,
    weekday: string,
    timeFrom: string
  ): Promise<void> {
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
        const mapCanvas = await this.generateRouteMapCanvas(coordinates);

        if (mapCanvas) {
          const pageWidth = pdf.internal.pageSize.width;
          const maxMapWidth = pageWidth - MAP_PDF_MARGIN;
          const aspectRatio = mapCanvas.width / mapCanvas.height;
          const mapWidth = maxMapWidth;
          const mapHeight = mapWidth / aspectRatio;

          const mapDataUrl = mapCanvas.toDataURL('image/png');
          pdf.addImage(mapDataUrl, PDF_IMAGE_FORMAT_PNG, PDF_MARGIN, currentY, mapWidth, mapHeight);
        }
      } catch (error) {
        console.error('Error generating route map:', error);
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
    pdf.save(`route-${sanitizedName}-${weekday}-${timestamp}.pdf`);
  }

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

  private async generateRouteMapCanvas(
    coordinates: { lat: number; lon: number; name: string }[]
  ): Promise<HTMLCanvasElement | null> {
    if (coordinates.length === 0) {
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = MAP_WIDTH;
    canvas.height = MAP_HEIGHT;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return null;
    }

    let routeGeometry: { lat: number; lon: number }[] = [];
    try {
      routeGeometry = await this.getOsrmRoute(coordinates);
    } catch (error) {
      console.error('Error fetching OSRM route:', error);
      routeGeometry = coordinates.map((c) => ({ lat: c.lat, lon: c.lon }));
    }

    const allPoints = routeGeometry.length > 0 ? routeGeometry : coordinates;
    const lats = allPoints.map((c) => c.lat);
    const lons = allPoints.map((c) => c.lon);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    const latPadding = (maxLat - minLat) * MAP_PADDING_PERCENT || MAP_PADDING_MIN;
    const lonPadding = (maxLon - minLon) * MAP_PADDING_PERCENT || MAP_PADDING_MIN;

    const paddedMinLat = minLat - latPadding;
    const paddedMaxLat = maxLat + latPadding;
    const paddedMinLon = minLon - lonPadding;
    const paddedMaxLon = maxLon + lonPadding;

    const centerLat = (paddedMinLat + paddedMaxLat) / 2;
    const centerLon = (paddedMinLon + paddedMaxLon) / 2;

    const latSpan = paddedMaxLat - paddedMinLat;
    const lonSpan = paddedMaxLon - paddedMinLon;
    const maxSpan = Math.max(latSpan, lonSpan);

    let zoom = ZOOM_DEFAULT;
    for (const threshold of ZOOM_THRESHOLDS) {
      if (maxSpan > threshold.span) {
        zoom = threshold.zoom;
        break;
      }
    }

    try {
      await this.loadOsmTiles(
        ctx,
        centerLat,
        centerLon,
        zoom,
        canvas.width,
        canvas.height
      );
    } catch (error) {
      console.error('Error loading OSM tiles:', error);
      ctx.fillStyle = COLOR_GRAY_LIGHT;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = COLOR_GRAY_MEDIUM;
      ctx.font = `${MARKER_RADIUS_NORMAL}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(
        'Map tiles could not be loaded',
        canvas.width / 2,
        canvas.height / 2
      );
    }

    const toPixelX = (lon: number) =>
      this.lonToPixelX(lon, zoom, centerLon, canvas.width);
    const toPixelY = (lat: number) =>
      this.latToPixelY(lat, zoom, centerLat, canvas.height);

    if (routeGeometry.length > 0) {
      ctx.strokeStyle = ROUTE_LINE_COLOR_OUTER;
      ctx.lineWidth = ROUTE_LINE_WIDTH_OUTER;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      routeGeometry.forEach((point, i) => {
        const x = toPixelX(point.lon);
        const y = toPixelY(point.lat);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      ctx.strokeStyle = ROUTE_LINE_COLOR_INNER;
      ctx.lineWidth = ROUTE_LINE_WIDTH_INNER;
      ctx.beginPath();
      routeGeometry.forEach((point, i) => {
        const x = toPixelX(point.lon);
        const y = toPixelY(point.lat);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    }

    const drawnPositions: { x: number; y: number; labels: string[] }[] = [];

    coordinates.forEach((coord, i) => {
      const x = toPixelX(coord.lon);
      const y = toPixelY(coord.lat);

      const existingPos = drawnPositions.find(
        (p) => Math.abs(p.x - x) < MAP_MARKER_PROXIMITY && Math.abs(p.y - y) < MAP_MARKER_PROXIMITY
      );

      if (existingPos) {
        existingPos.labels.push(i.toString());
      } else {
        drawnPositions.push({ x, y, labels: [i.toString()] });
      }
    });

    drawnPositions.forEach((pos) => {
      const isStart = pos.labels.includes('0');
      const isEnd = pos.labels.includes((coordinates.length - 1).toString());
      const isBoth = isStart && isEnd;

      ctx.shadowColor = COLOR_SHADOW;
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      ctx.fillStyle = isBoth
        ? MARKER_COLOR_BOTH
        : isStart
        ? MARKER_COLOR_START
        : isEnd
        ? MARKER_COLOR_END
        : MARKER_COLOR_DEFAULT;
      ctx.strokeStyle = COLOR_WHITE;
      ctx.lineWidth = MARKER_STROKE_WIDTH;
      ctx.beginPath();
      const radius = pos.labels.length > 1 ? MARKER_RADIUS_COMBINED : MARKER_RADIUS_NORMAL;
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.shadowColor = COLOR_TRANSPARENT;
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      ctx.fillStyle = COLOR_WHITE;
      ctx.font = pos.labels.length > 1 ? CANVAS_FONT_BOLD_10 : CANVAS_FONT_BOLD_12;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pos.labels.join('|'), pos.x, pos.y);
    });

    ctx.fillStyle = COLOR_ATTRIBUTION_BG;
    ctx.fillRect(
      OSM_ATTRIBUTION_MARGIN,
      canvas.height - OSM_ATTRIBUTION_HEIGHT - OSM_ATTRIBUTION_MARGIN + 1,
      OSM_ATTRIBUTION_WIDTH,
      OSM_ATTRIBUTION_HEIGHT
    );
    ctx.fillStyle = COLOR_GRAY_DARK;
    ctx.font = CANVAS_FONT_NORMAL_10;
    ctx.textAlign = 'left';
    ctx.fillText(
      OSM_ATTRIBUTION_TEXT,
      OSM_ATTRIBUTION_TEXT_OFFSET,
      canvas.height - PDF_PAGE_NUMBER_OFFSET_Y
    );

    return canvas;
  }

  private async getOsrmRoute(
    coordinates: { lat: number; lon: number; name: string }[]
  ): Promise<{ lat: number; lon: number }[]> {
    if (coordinates.length < 2) {
      return coordinates.map((c) => ({ lat: c.lat, lon: c.lon }));
    }

    return await firstValueFrom(this.dataRoutingService.getRoute(coordinates));
  }

  private async loadOsmTiles(
    ctx: CanvasRenderingContext2D,
    centerLat: number,
    centerLon: number,
    zoom: number,
    canvasWidth: number,
    canvasHeight: number
  ): Promise<void> {
    const n = Math.pow(2, zoom);

    const centerTileX = ((centerLon + 180) / 360) * n;
    const centerTileY =
      ((1 -
        Math.log(
          Math.tan((centerLat * Math.PI) / 180) +
            1 / Math.cos((centerLat * Math.PI) / 180)
        ) /
          Math.PI) /
        2) *
      n;

    const tilesX = Math.ceil(canvasWidth / TILE_SIZE) + 1;
    const tilesY = Math.ceil(canvasHeight / TILE_SIZE) + 1;

    const startTileX = Math.floor(centerTileX - tilesX / 2);
    const startTileY = Math.floor(centerTileY - tilesY / 2);

    const offsetX = canvasWidth / 2 - (centerTileX - startTileX) * TILE_SIZE;
    const offsetY = canvasHeight / 2 - (centerTileY - startTileY) * TILE_SIZE;

    const tilePromises: Promise<void>[] = [];

    for (let y = 0; y < tilesY; y++) {
      for (let x = 0; x < tilesX; x++) {
        const tileX = startTileX + x;
        const tileY = startTileY + y;

        if (tileX >= 0 && tileX < n && tileY >= 0 && tileY < n) {
          const drawX = offsetX + x * TILE_SIZE;
          const drawY = offsetY + y * TILE_SIZE;

          tilePromises.push(
            this.loadAndDrawTile(
              ctx,
              tileX,
              tileY,
              zoom,
              drawX,
              drawY
            )
          );
        }
      }
    }

    await Promise.allSettled(tilePromises);
  }

  private loadAndDrawTile(
    ctx: CanvasRenderingContext2D,
    tileX: number,
    tileY: number,
    zoom: number,
    drawX: number,
    drawY: number
  ): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        ctx.drawImage(img, drawX, drawY, TILE_SIZE, TILE_SIZE);
        resolve();
      };

      img.onerror = () => {
        ctx.fillStyle = COLOR_GRAY_LIGHT;
        ctx.fillRect(drawX, drawY, TILE_SIZE, TILE_SIZE);
        resolve();
      };

      const subdomain = OSM_SUBDOMAINS[(tileX + tileY) % OSM_SUBDOMAINS.length];
      img.src = `https://${subdomain}.tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`;
    });
  }

  private lonToPixelX(
    lon: number,
    zoom: number,
    centerLon: number,
    canvasWidth: number
  ): number {
    const n = Math.pow(2, zoom);
    const centerPixelX = ((centerLon + 180) / 360) * n * TILE_SIZE;
    const pixelX = ((lon + 180) / 360) * n * TILE_SIZE;
    return canvasWidth / 2 + (pixelX - centerPixelX);
  }

  private latToPixelY(
    lat: number,
    zoom: number,
    centerLat: number,
    canvasHeight: number
  ): number {
    const n = Math.pow(2, zoom);
    const centerPixelY =
      ((1 -
        Math.log(
          Math.tan((centerLat * Math.PI) / 180) +
            1 / Math.cos((centerLat * Math.PI) / 180)
        ) /
          Math.PI) /
        2) *
      n *
      TILE_SIZE;
    const pixelY =
      ((1 -
        Math.log(
          Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
        ) /
          Math.PI) /
        2) *
      n *
      TILE_SIZE;
    return canvasHeight / 2 + (pixelY - centerPixelY);
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

      const address = this.formatClientWithAddress(item);

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
}
