/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, inject } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TranslateService } from '@ngx-translate/core';
import {
  IContainerTemplateItem,
  IRouteInfo,
  IRouteLocation,
} from 'src/app/domain/models/container-template-class';
import { AddressTypeEnum } from 'src/app/domain/enums/client-enum';

export type RouteInfo = IRouteInfo;
export type RouteLocation = IRouteLocation;

@Injectable({
  providedIn: 'root',
})
export class ContainerTemplatePdfExportService {
  private translateService = inject(TranslateService);
  private readonly MAP_WIDTH = 1200;
  private readonly MAP_HEIGHT = 720;

  exportContainerTemplateToPdf(
    items: IContainerTemplateItem[],
    containerName: string,
    weekday: string,
    timeFrom: string,
    timeTo: string
  ): void {
    const pdf = new jsPDF('landscape');

    const translatedWeekday = this.translateWeekday(weekday);
    const title = `${containerName} - ${translatedWeekday}`;
    pdf.setFontSize(16);
    pdf.text(title, 14, 15);

    pdf.setFontSize(10);
    pdf.text(
      `${this.translateService.instant(
        'pdf.generated'
      )}: ${new Date().toLocaleDateString()}`,
      14,
      22
    );
    pdf.text(
      `${this.translateService.instant(
        'shift.container-template.time-range'
      )}: ${timeFrom} - ${timeTo}`,
      14,
      29
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
        `${this.translateService.instant(
          'pdf.page'
        )} ${i} ${this.translateService.instant('pdf.of')} ${pageCount}`,
        pdf.internal.pageSize.width - 40,
        pdf.internal.pageSize.height - 10
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
      const minutes = Math.round((item.shift.workTime - hours) * 60);
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
    const pdf = new jsPDF('landscape');

    const translatedWeekday = this.translateWeekday(weekday);
    const title = `${containerName} - ${translatedWeekday}`;
    pdf.setFontSize(16);
    pdf.text(title, 14, 15);

    pdf.setFontSize(10);
    pdf.text(
      `${this.translateService.instant(
        'pdf.generated'
      )}: ${new Date().toLocaleDateString()}`,
      14,
      22
    );

    pdf.setFontSize(12);
    pdf.text(
      this.translateService.instant('pdf.route-summary') || 'Route Summary',
      14,
      32
    );

    pdf.setFontSize(10);
    const summaryY = 40;
    pdf.text(
      `${this.translateService.instant('pdf.start-base') || 'Start'}: ${
        routeInfo.startBase
      }`,
      14,
      summaryY
    );
    pdf.text(
      `${this.translateService.instant('pdf.end-base') || 'End'}: ${
        routeInfo.endBase
      }`,
      14,
      summaryY + 6
    );
    pdf.text(
      `${
        this.translateService.instant('pdf.total-distance') || 'Total Distance'
      }: ${routeInfo.totalDistanceKm.toFixed(2)} km`,
      14,
      summaryY + 12
    );
    pdf.text(
      `${
        this.translateService.instant('pdf.total-travel-time') ||
        'Total Travel Time'
      }: ${this.formatTimeSpan(routeInfo.estimatedTravelTime)}`,
      14,
      summaryY + 18
    );

    const coordinates = this.extractCoordinatesFromItems(items, routeInfo);

    let currentY = summaryY + 30;

    if (coordinates.length > 0) {
      try {
        const mapCanvas = await this.generateRouteMapCanvas(coordinates);

        if (mapCanvas) {
          const pageWidth = pdf.internal.pageSize.width;
          const maxMapWidth = pageWidth - 85;
          const aspectRatio = mapCanvas.width / mapCanvas.height;
          const mapWidth = maxMapWidth;
          const mapHeight = mapWidth / aspectRatio;

          const mapDataUrl = mapCanvas.toDataURL('image/png');
          pdf.addImage(mapDataUrl, 'PNG', 14, currentY, mapWidth, mapHeight);
        }
      } catch (error) {
        console.error('Error generating route map:', error);
        pdf.setFontSize(10);
        pdf.text('Map could not be generated', 14, currentY);
      }
    }

    pdf.addPage('landscape');
    currentY = 20;

    pdf.setFontSize(12);
    pdf.text(
      this.translateService.instant('pdf.route-details') || 'Route Details',
      14,
      currentY
    );
    currentY += 8;

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
      theme: 'striped',
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 25, halign: 'center' },
        5: { cellWidth: 25, halign: 'right' },
      },
    });

    if (routeInfo.segmentDirections && routeInfo.segmentDirections.length > 0) {
      this.addDirectionsSection(pdf, routeInfo.segmentDirections);
    }

    const pageCount = (pdf as any).internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.text(
        `${this.translateService.instant(
          'pdf.page'
        )} ${i} ${this.translateService.instant('pdf.of')} ${pageCount}`,
        pdf.internal.pageSize.width - 40,
        pdf.internal.pageSize.height - 10
      );
    }

    const timestamp = new Date().getTime();
    const sanitizedName = containerName
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();
    pdf.save(`route-${sanitizedName}-${weekday}-${timestamp}.pdf`);
  }

  private addDirectionsSection(pdf: jsPDF, segmentDirections: any[]): void {
    pdf.addPage('landscape');

    let currentY = 20;
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(
      this.translateService.instant('pdf.directions') || 'Wegbeschreibung',
      14,
      currentY
    );
    pdf.setFont('helvetica', 'normal');
    currentY += 12;

    for (const segment of segmentDirections) {
      if (currentY > pdf.internal.pageSize.height - 50) {
        pdf.addPage('landscape');
        currentY = 20;
      }

      const boxHeight = 10;
      pdf.setFillColor(66, 139, 202);
      pdf.rect(
        14,
        currentY - 6,
        pdf.internal.pageSize.width - 28,
        boxHeight,
        'F'
      );

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');

      const segmentHeader = `${segment.fromName}  -->  ${segment.toName}  (${segment.transportMode})`;
      pdf.text(segmentHeader, 18, currentY + 1);

      const distanceText = `${segment.distanceKm.toFixed(2)} km`;
      pdf.text(
        distanceText,
        pdf.internal.pageSize.width - 18 - pdf.getTextWidth(distanceText),
        currentY + 1
      );

      pdf.setTextColor(0, 0, 0);
      currentY += 14;

      if (segment.steps && segment.steps.length > 0) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);

        for (let i = 0; i < segment.steps.length; i++) {
          const step = segment.steps[i];

          if (currentY > pdf.internal.pageSize.height - 20) {
            pdf.addPage('landscape');
            currentY = 15;
          }

          const stepNumber = `${i + 1}.`;
          const distanceStr =
            step.distanceMeters >= 1000
              ? `${(step.distanceMeters / 1000).toFixed(1)} km`
              : `${Math.round(step.distanceMeters)} m`;

          pdf.setFont('helvetica', 'bold');
          pdf.text(stepNumber, 18, currentY);
          pdf.setFont('helvetica', 'normal');
          pdf.text(step.instruction, 26, currentY);

          pdf.setTextColor(100, 100, 100);
          const distanceX =
            pdf.internal.pageSize.width - 14 - pdf.getTextWidth(distanceStr);
          pdf.text(distanceStr, distanceX, currentY);
          pdf.setTextColor(0, 0, 0);

          currentY += 5;
        }
      } else {
        pdf.setFontSize(9);
        pdf.setTextColor(100, 100, 100);
        pdf.text(
          'Keine detaillierten Wegbeschreibungen verfügbar',
          18,
          currentY
        );
        pdf.setTextColor(0, 0, 0);
        currentY += 5;
      }

      currentY += 8;
    }
  }

  private extractCoordinatesFromItems(
    items: IContainerTemplateItem[],
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
    canvas.width = this.MAP_WIDTH;
    canvas.height = this.MAP_HEIGHT;
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

    const padding = 0.05;
    const latPadding = (maxLat - minLat) * padding || 0.005;
    const lonPadding = (maxLon - minLon) * padding || 0.005;

    const paddedMinLat = minLat - latPadding;
    const paddedMaxLat = maxLat + latPadding;
    const paddedMinLon = minLon - lonPadding;
    const paddedMaxLon = maxLon + lonPadding;

    const centerLat = (paddedMinLat + paddedMaxLat) / 2;
    const centerLon = (paddedMinLon + paddedMaxLon) / 2;

    const latSpan = paddedMaxLat - paddedMinLat;
    const lonSpan = paddedMaxLon - paddedMinLon;
    const maxSpan = Math.max(latSpan, lonSpan);

    let zoom = 15;
    if (maxSpan > 2) zoom = 8;
    else if (maxSpan > 1) zoom = 9;
    else if (maxSpan > 0.5) zoom = 10;
    else if (maxSpan > 0.2) zoom = 11;
    else if (maxSpan > 0.1) zoom = 12;
    else if (maxSpan > 0.05) zoom = 13;
    else if (maxSpan > 0.02) zoom = 14;
    else zoom = 15;

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
      ctx.fillStyle = '#e8e8e8';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#999999';
      ctx.font = '14px Arial';
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
      ctx.strokeStyle = '#0044AA';
      ctx.lineWidth = 6;
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

      ctx.strokeStyle = '#3388FF';
      ctx.lineWidth = 4;
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

    const firstCoord = coordinates[0];
    const lastCoord = coordinates[coordinates.length - 1];
    const startEndSameLocation =
      coordinates.length > 1 &&
      Math.abs(firstCoord.lat - lastCoord.lat) < 0.0001 &&
      Math.abs(firstCoord.lon - lastCoord.lon) < 0.0001;

    const drawnPositions: { x: number; y: number; labels: string[] }[] = [];

    coordinates.forEach((coord, i) => {
      const x = toPixelX(coord.lon);
      const y = toPixelY(coord.lat);

      const existingPos = drawnPositions.find(
        (p) => Math.abs(p.x - x) < 20 && Math.abs(p.y - y) < 20
      );

      if (existingPos) {
        existingPos.labels.push(i.toString());
      } else {
        drawnPositions.push({ x, y, labels: [i.toString()] });
      }
    });

    drawnPositions.forEach((pos, idx) => {
      const isStart = pos.labels.includes('0');
      const isEnd = pos.labels.includes((coordinates.length - 1).toString());
      const isBoth = isStart && isEnd;

      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      ctx.fillStyle = isBoth
        ? '#8822AA'
        : isStart
        ? '#22AA22'
        : isEnd
        ? '#AA2222'
        : '#CC4444';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.beginPath();
      const radius = pos.labels.length > 1 ? 18 : 14;
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      ctx.fillStyle = '#FFFFFF';
      ctx.font = pos.labels.length > 1 ? 'bold 10px Arial' : 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pos.labels.join('|'), pos.x, pos.y);
    });

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(5, canvas.height - 22, 160, 18);
    ctx.fillStyle = '#333333';
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('© OpenStreetMap contributors', 8, canvas.height - 10);

    return canvas;
  }

  private async getOsrmRoute(
    coordinates: { lat: number; lon: number; name: string }[]
  ): Promise<{ lat: number; lon: number }[]> {
    if (coordinates.length < 2) {
      return coordinates.map((c) => ({ lat: c.lat, lon: c.lon }));
    }

    const coordString = coordinates.map((c) => `${c.lon},${c.lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OSRM request failed: ${response.status}`);
    }

    const data = await response.json();
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error('No route found');
    }

    const routeCoords = data.routes[0].geometry.coordinates;
    return routeCoords.map((coord: [number, number]) => ({
      lon: coord[0],
      lat: coord[1],
    }));
  }

  private async loadOsmTiles(
    ctx: CanvasRenderingContext2D,
    centerLat: number,
    centerLon: number,
    zoom: number,
    canvasWidth: number,
    canvasHeight: number
  ): Promise<void> {
    const tileSize = 256;
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

    const tilesX = Math.ceil(canvasWidth / tileSize) + 1;
    const tilesY = Math.ceil(canvasHeight / tileSize) + 1;

    const startTileX = Math.floor(centerTileX - tilesX / 2);
    const startTileY = Math.floor(centerTileY - tilesY / 2);

    const offsetX = canvasWidth / 2 - (centerTileX - startTileX) * tileSize;
    const offsetY = canvasHeight / 2 - (centerTileY - startTileY) * tileSize;

    const tilePromises: Promise<void>[] = [];

    for (let y = 0; y < tilesY; y++) {
      for (let x = 0; x < tilesX; x++) {
        const tileX = startTileX + x;
        const tileY = startTileY + y;

        if (tileX >= 0 && tileX < n && tileY >= 0 && tileY < n) {
          const drawX = offsetX + x * tileSize;
          const drawY = offsetY + y * tileSize;

          tilePromises.push(
            this.loadAndDrawTile(
              ctx,
              tileX,
              tileY,
              zoom,
              drawX,
              drawY,
              tileSize
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
    drawY: number,
    tileSize: number
  ): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        ctx.drawImage(img, drawX, drawY, tileSize, tileSize);
        resolve();
      };

      img.onerror = () => {
        ctx.fillStyle = '#e8e8e8';
        ctx.fillRect(drawX, drawY, tileSize, tileSize);
        resolve();
      };

      const subdomains = ['a', 'b', 'c'];
      const subdomain = subdomains[(tileX + tileY) % 3];
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
    const tileSize = 256;
    const centerPixelX = ((centerLon + 180) / 360) * n * tileSize;
    const pixelX = ((lon + 180) / 360) * n * tileSize;
    return canvasWidth / 2 + (pixelX - centerPixelX);
  }

  private latToPixelY(
    lat: number,
    zoom: number,
    centerLat: number,
    canvasHeight: number
  ): number {
    const n = Math.pow(2, zoom);
    const tileSize = 256;
    const centerPixelY =
      ((1 -
        Math.log(
          Math.tan((centerLat * Math.PI) / 180) +
            1 / Math.cos((centerLat * Math.PI) / 180)
        ) /
          Math.PI) /
        2) *
      n *
      tileSize;
    const pixelY =
      ((1 -
        Math.log(
          Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
        ) /
          Math.PI) /
        2) *
      n *
      tileSize;
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
        ? Math.round(item.shift.workTime * 60)
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
      return hours * 60 + minutes;
    }
    return 0;
  }

  private timeStringToMinutes(timeString: string): number {
    const parts = timeString.split(':');
    if (parts.length >= 2) {
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }
    return 0;
  }

  private minutesToTimeString(minutes: number): string {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}`;
  }
}
