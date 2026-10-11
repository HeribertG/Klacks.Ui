// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Service for rendering route maps on canvas elements with the tile source the installation configured.
 * Creates an HTMLCanvasElement with map viewport, route line, and marker positions. When map tiles are
 * switched off (or the geo services configuration could not be loaded) no tile is requested: the route is
 * drawn on a plain light background with a translated hint instead.
 * @param coordinates - List of coordinates (lat, lon, name) for the route points
 * @param dataRoutingService - Provides the route geometry between the coordinates through the backend
 * @param geoServicesConfig - Provides the configured tile source (url template, subdomains, attribution)
 */
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { DataRoutingService } from 'src/app/infrastructure/api/data-routing.service';
import { GeoServicesConfigService } from 'src/app/domain/services/settings/geo-services-config.service';
import { IMapTileConfig } from 'src/app/domain/models/settings/map-tile-config.interface';
import { buildMapTileUrl } from 'src/app/shared/helpers/map-tile-url.helper';

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
const ATTRIBUTION_HEIGHT = 18;
const ATTRIBUTION_MARGIN = 5;
const ATTRIBUTION_TEXT_OFFSET = 8;
const ATTRIBUTION_TEXT_PADDING = 16;

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

const TILES_DISABLED_KEY = 'geoServices.routePdf.tilesDisabled';
const TILES_FAILED_KEY = 'geoServices.routePdf.tilesFailed';
const CANVAS_FONT_FAMILY = 'Arial';

const PAGE_NUMBER_OFFSET_Y = 10;

@Injectable()
export class MapRenderingService {
  private dataRoutingService = inject(DataRoutingService);
  private geoServicesConfig = inject(GeoServicesConfigService);
  private translateService = inject(TranslateService);

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

    await this.geoServicesConfig.ensureLoaded();

    let routeGeometry: { lat: number; lon: number }[] = [];
    try {
      routeGeometry = await this.getRoute(coordinates);
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

    const mapTiles = this.geoServicesConfig.mapTiles();
    let tilesDrawn = false;
    if (mapTiles?.urlTemplate) {
      try {
        await this.loadTiles(
          ctx,
          mapTiles,
          centerLat,
          centerLon,
          zoom,
          canvas.width,
          canvas.height
        );
        tilesDrawn = true;
      } catch {
        this.drawPlainBackground(ctx, canvas, TILES_FAILED_KEY);
      }
    } else {
      const hintKey = this.geoServicesConfig.loadState() === 'failed' ? TILES_FAILED_KEY : TILES_DISABLED_KEY;
      this.drawPlainBackground(ctx, canvas, hintKey);
    }

    const toPixelX = (lon: number) =>
      this.lonToPixelX(lon, zoom, centerLon, canvas.width);
    const toPixelY = (lat: number) =>
      this.latToPixelY(lat, zoom, centerLat, canvas.height);

    if (routeGeometry.length > 0) {
      this.drawRouteLine(ctx, routeGeometry, toPixelX, toPixelY);
    }

    this.drawMarkers(ctx, coordinates, toPixelX, toPixelY);
    if (tilesDrawn && mapTiles?.attribution) {
      this.drawAttribution(ctx, canvas, mapTiles.attribution);
    }

    return canvas;
  }

  private drawPlainBackground(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    hintKey: string
  ): void {
    ctx.fillStyle = COLOR_GRAY_LIGHT;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = COLOR_GRAY_MEDIUM;
    ctx.font = `${MARKER_RADIUS_NORMAL}px ${CANVAS_FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.fillText(
      this.translateService.instant(hintKey),
      canvas.width / 2,
      canvas.height - MARKER_RADIUS_NORMAL * 2
    );
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
    canvas: HTMLCanvasElement,
    attribution: string
  ): void {
    const isRtl = document.documentElement.dir === 'rtl';
    ctx.font = CANVAS_FONT_NORMAL_10;
    const width = ctx.measureText(attribution).width + ATTRIBUTION_TEXT_PADDING;
    ctx.fillStyle = COLOR_ATTRIBUTION_BG;
    ctx.fillRect(
      isRtl ? canvas.width - width - ATTRIBUTION_MARGIN : ATTRIBUTION_MARGIN,
      canvas.height - ATTRIBUTION_HEIGHT - ATTRIBUTION_MARGIN + 1,
      width,
      ATTRIBUTION_HEIGHT
    );
    ctx.fillStyle = COLOR_GRAY_DARK;
    ctx.textAlign = isRtl ? 'right' : 'left';
    ctx.fillText(
      attribution,
      isRtl ? canvas.width - ATTRIBUTION_TEXT_OFFSET : ATTRIBUTION_TEXT_OFFSET,
      canvas.height - PAGE_NUMBER_OFFSET_Y
    );
  }

  private async getRoute(
    coordinates: { lat: number; lon: number; name: string }[]
  ): Promise<{ lat: number; lon: number }[]> {
    if (coordinates.length < 2) {
      return coordinates.map((c) => ({ lat: c.lat, lon: c.lon }));
    }

    return await firstValueFrom(this.dataRoutingService.getRoute(coordinates));
  }

  private async loadTiles(
    ctx: CanvasRenderingContext2D,
    mapTiles: IMapTileConfig,
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
              mapTiles,
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
    mapTiles: IMapTileConfig,
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

      img.src = buildMapTileUrl(mapTiles.urlTemplate ?? '', mapTiles.subdomains, zoom, tileX, tileY);
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
