// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Interactive tour map of a container template: numbered markers for the visits in route order, a marker per base
 * and the road geometry between them (from the backend routing proxy). Without a road geometry the stops are joined
 * by a dashed straight line and an "estimated" hint is shown. The tile source is the one the installation
 * configured; when map tiles are off the geo service notice replaces the map.
 * @param routeInfo - Stored route info of the edited weekday, null when the route was never optimized
 */
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of, switchMap } from 'rxjs';
import type * as Leaflet from 'leaflet';
import { IRouteInfo } from 'src/app/domain/models/container/route-info.interface';
import { IContainerRouteMap } from 'src/app/domain/models/container/container-route-map.interface';
import { IRouteMapMarker } from 'src/app/domain/models/container/route-map-marker.interface';
import { IMapTileConfig } from 'src/app/domain/models/settings/map-tile-config.interface';
import { ContainerRouteMapService } from 'src/app/domain/services/container/container-route-map.service';
import { GeoServicesConfigService } from 'src/app/domain/services/settings/geo-services-config.service';
import { escapeHtml } from 'src/app/domain/helpers/html-escape.helper';
import { GeoServiceNoticeComponent } from 'src/app/presentation/shared/geo-service-notice/geo-service-notice.component';
import {
  ROUTE_MAP_BASE_LABEL_KEY,
  ROUTE_MAP_BASE_MARKER_CLASS,
  ROUTE_MAP_ESTIMATED_HINT_KEY,
  ROUTE_MAP_ESTIMATED_LINE_STYLE,
  ROUTE_MAP_FIT_MAX_ZOOM,
  ROUTE_MAP_FIT_PADDING,
  ROUTE_MAP_MARKER_ANCHOR,
  ROUTE_MAP_MARKER_SIZE,
  ROUTE_MAP_ROAD_LINE_STYLE,
  ROUTE_MAP_STOP_MARKER_CLASS,
  ROUTE_MAP_TOOLTIP_LINE_CLASS,
} from './container-template-route-map.constants';

declare let L: typeof Leaflet;

const MIN_LINE_POINTS = 2;

@Component({
  selector: 'app-container-template-route-map',
  templateUrl: './container-template-route-map.component.html',
  styleUrl: './container-template-route-map.component.scss',
  standalone: true,
  imports: [TranslateModule, GeoServiceNoticeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContainerTemplateRouteMapComponent implements OnDestroy {
  private readonly routeMapService = inject(ContainerRouteMapService);
  private readonly geoServicesConfig = inject(GeoServicesConfigService);
  private readonly translateService = inject(TranslateService);

  readonly routeInfo = input<IRouteInfo | null>(null);

  private readonly mapContainer = viewChild<ElementRef<HTMLDivElement>>('mapContainer');

  protected readonly estimatedHintKey = ROUTE_MAP_ESTIMATED_HINT_KEY;
  protected readonly mapTilesEnabled = this.geoServicesConfig.mapTilesEnabled;
  protected readonly routeMap = signal<IContainerRouteMap | null>(null);
  protected readonly isEstimated = computed(() => {
    const routeMap = this.routeMap();
    return !!routeMap && routeMap.path.length >= MIN_LINE_POINTS && !routeMap.isRoadGeometry;
  });

  private map: Leaflet.Map | null = null;
  private mapElement: HTMLElement | null = null;
  private mapTiles: IMapTileConfig | null = null;
  private routeLayer: Leaflet.LayerGroup | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    void this.geoServicesConfig.ensureLoaded();

    toObservable(this.routeInfo)
      .pipe(
        switchMap((routeInfo) => (routeInfo ? this.routeMapService.loadRouteMap(routeInfo) : of(null))),
        takeUntilDestroyed(),
      )
      .subscribe((routeMap) => this.routeMap.set(routeMap));

    effect(() => {
      const container = this.mapContainer()?.nativeElement ?? null;
      const mapTiles = this.geoServicesConfig.mapTiles();
      const routeMap = this.routeMap();
      untracked(() => this.render(container, mapTiles, routeMap));
    });
  }

  ngOnDestroy(): void {
    this.destroyMap();
  }

  private render(container: HTMLElement | null, mapTiles: IMapTileConfig | null, routeMap: IContainerRouteMap | null): void {
    const urlTemplate = mapTiles?.urlTemplate;
    if (!container || !mapTiles || !urlTemplate || typeof L === 'undefined') {
      this.destroyMap();
      return;
    }

    if (!this.map || this.mapElement !== container || this.mapTiles !== mapTiles) {
      this.destroyMap();
      this.createMap(container, mapTiles, urlTemplate);
    }

    this.drawRoute(routeMap);
  }

  private createMap(container: HTMLElement, mapTiles: IMapTileConfig, urlTemplate: string): void {
    const map = L.map(container);
    L.tileLayer(urlTemplate, {
      attribution: escapeHtml(mapTiles.attribution),
      maxZoom: mapTiles.maxZoom,
      ...(mapTiles.subdomains.length > 0 ? { subdomains: mapTiles.subdomains } : {}),
    }).addTo(map);

    this.map = map;
    this.mapElement = container;
    this.mapTiles = mapTiles;
    this.routeLayer = L.layerGroup().addTo(map);
    this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize());
    this.resizeObserver.observe(container);
  }

  private drawRoute(routeMap: IContainerRouteMap | null): void {
    const map = this.map;
    const layer = this.routeLayer;
    if (!map || !layer) {
      return;
    }

    layer.clearLayers();
    if (!routeMap) {
      return;
    }

    const bounds: Leaflet.LatLngTuple[] = [];

    if (routeMap.path.length >= MIN_LINE_POINTS) {
      const line = routeMap.path.map((point): Leaflet.LatLngTuple => [point.lat, point.lon]);
      L.polyline(line, routeMap.isRoadGeometry ? ROUTE_MAP_ROAD_LINE_STYLE : ROUTE_MAP_ESTIMATED_LINE_STYLE).addTo(layer);
      bounds.push(...line);
    }

    for (const marker of routeMap.markers) {
      const position: Leaflet.LatLngTuple = [marker.latitude, marker.longitude];
      L.marker(position, { icon: this.createIcon(marker), keyboard: false })
        .bindTooltip(this.createTooltip(marker))
        .addTo(layer);
      bounds.push(position);
    }

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: ROUTE_MAP_FIT_PADDING, maxZoom: ROUTE_MAP_FIT_MAX_ZOOM });
    }
  }

  private createIcon(marker: IRouteMapMarker): Leaflet.DivIcon {
    const isStop = marker.stopNumber !== null;
    return L.divIcon({
      className: isStop ? ROUTE_MAP_STOP_MARKER_CLASS : ROUTE_MAP_BASE_MARKER_CLASS,
      html: isStop ? String(marker.stopNumber) : '',
      iconSize: ROUTE_MAP_MARKER_SIZE,
      iconAnchor: ROUTE_MAP_MARKER_ANCHOR,
    });
  }

  private createTooltip(marker: IRouteMapMarker): HTMLElement {
    const title =
      marker.stopNumber === null
        ? this.translateService.instant(ROUTE_MAP_BASE_LABEL_KEY)
        : `${marker.stopNumber}. ${marker.name}`;
    const tooltip = document.createElement('div');
    for (const text of [title, marker.address]) {
      if (!text) {
        continue;
      }
      const line = document.createElement('div');
      line.className = ROUTE_MAP_TOOLTIP_LINE_CLASS;
      line.textContent = text;
      tooltip.appendChild(line);
    }
    return tooltip;
  }

  private destroyMap(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.map?.remove();
    this.map = null;
    this.mapElement = null;
    this.mapTiles = null;
    this.routeLayer = null;
  }
}
