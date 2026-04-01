// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for rendering route maps on canvas elements with OSM tiles.
 * Creates an HTMLCanvasElement with map viewport, route line, and marker positions.
 * @param coordinates - List of coordinates (lat, lon, name) for the route points
 * @param dataRoutingService - Provides the OSRM route geometry between the coordinates
 */
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DataRoutingService } from 'src/app/infrastructure/api/data-routing.service';

const MAP_WIDTH = 1200;
const MAP_HEIGHT = 720;
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

const PAGE_NUMBER_OFFSET_Y = 10;

@Injectable()
export class MapRenderingService {
  private dataRoutingService = inject(DataRoutingService);

  async generateRouteMapCanvas(
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
    } catch {
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
    } catch {
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
      this.drawRouteLine(ctx, routeGeometry, toPixelX, toPixelY);
    }

    this.drawMarkers(ctx, coordinates, toPixelX, toPixelY);
    this.drawAttribution(ctx, canvas);

    return canvas;
  }

  private drawRouteLine(
    ctx: CanvasRenderingContext2D,
    routeGeometry: { lat: number; lon: number }[],
    toPixelX: (lon: number) => number,
    toPixelY: (lat: number) => number
  ): void {
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

  private drawMarkers(
    ctx: CanvasRenderingContext2D,
    coordinates: { lat: number; lon: number; name: string }[],
    toPixelX: (lon: number) => number,
    toPixelY: (lat: number) => number
  ): void {
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
  }

  private drawAttribution(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
  ): void {
    const isRtl = document.documentElement.dir === 'rtl';
    ctx.fillStyle = COLOR_ATTRIBUTION_BG;
    ctx.fillRect(
      isRtl ? canvas.width - OSM_ATTRIBUTION_WIDTH - OSM_ATTRIBUTION_MARGIN : OSM_ATTRIBUTION_MARGIN,
      canvas.height - OSM_ATTRIBUTION_HEIGHT - OSM_ATTRIBUTION_MARGIN + 1,
      OSM_ATTRIBUTION_WIDTH,
      OSM_ATTRIBUTION_HEIGHT
    );
    ctx.fillStyle = COLOR_GRAY_DARK;
    ctx.font = CANVAS_FONT_NORMAL_10;
    ctx.textAlign = isRtl ? 'right' : 'left';
    ctx.fillText(
      OSM_ATTRIBUTION_TEXT,
      isRtl ? canvas.width - OSM_ATTRIBUTION_TEXT_OFFSET : OSM_ATTRIBUTION_TEXT_OFFSET,
      canvas.height - PAGE_NUMBER_OFFSET_Y
    );
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
}
