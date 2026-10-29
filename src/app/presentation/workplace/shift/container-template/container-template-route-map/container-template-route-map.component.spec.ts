// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { ContainerTemplateRouteMapComponent } from './container-template-route-map.component';
import { ContainerRouteMapService } from 'src/app/domain/services/container/container-route-map.service';
import { GeoServicesConfigService } from 'src/app/domain/services/settings/geo-services-config.service';
import { IContainerRouteMap } from 'src/app/domain/models/container/container-route-map.interface';
import { IRouteInfo } from 'src/app/domain/models/container/route-info.interface';
import {
  createGeoServicesConfigMock,
  GeoServicesConfigMock,
  TEST_MAP_TILE_CONFIG,
} from 'src/app/shared/testing/geo-services-config.testing';
import {
  ROUTE_MAP_ESTIMATED_LINE_STYLE,
  ROUTE_MAP_ROAD_LINE_STYLE,
  ROUTE_MAP_STOP_MARKER_CLASS,
} from './container-template-route-map.constants';

const XSS_PAYLOAD = '<img src=x onerror=alert(1)>';

const ROUTE_INFO: IRouteInfo = {
  startBase: 'Base',
  endBase: 'Base',
  totalDistanceKm: 4,
  estimatedTravelTime: '00:12:00',
  travelTimeFromStartBase: '00:04:00',
  distanceFromStartBaseKm: 1,
  distanceToEndBaseKm: 1,
  travelTimeToEndBase: '00:04:00',
  optimizedRoute: [],
};

const ROAD_MAP: IContainerRouteMap = {
  markers: [
    { kind: 'base', stopNumber: null, latitude: 47.5, longitude: 8.7, name: 'Base', address: 'Base street 1' },
    { kind: 'stop', stopNumber: 1, latitude: 47.51, longitude: 8.71, name: 'Anna', address: 'Anna street 2' },
    { kind: 'stop', stopNumber: 2, latitude: 47.52, longitude: 8.72, name: XSS_PAYLOAD, address: 'Bruno street 3' },
  ],
  path: [
    { lat: 47.5, lon: 8.7 },
    { lat: 47.505, lon: 8.705 },
    { lat: 47.51, lon: 8.71 },
    { lat: 47.52, lon: 8.72 },
  ],
  isRoadGeometry: true,
};

interface MarkerCall {
  position: [number, number];
  icon: { className: string; html: string };
  tooltip?: HTMLElement;
}

interface PolylineCall {
  points: [number, number][];
  options: object;
}

describe('ContainerTemplateRouteMapComponent', () => {
  let fixture: ComponentFixture<ContainerTemplateRouteMapComponent>;
  let config: GeoServicesConfigMock;
  let loadRouteMap: ReturnType<typeof vi.fn>;
  let markers: MarkerCall[];
  let polylines: PolylineCall[];
  let leafletMap: { remove: ReturnType<typeof vi.fn>; fitBounds: ReturnType<typeof vi.fn>; invalidateSize: ReturnType<typeof vi.fn> };
  let leaflet: Record<string, ReturnType<typeof vi.fn>>;
  let observerDisconnect: ReturnType<typeof vi.fn>;

  const stubLeaflet = (): void => {
    markers = [];
    polylines = [];
    leafletMap = { remove: vi.fn(), fitBounds: vi.fn(), invalidateSize: vi.fn() };
    const layer = { clearLayers: vi.fn(), addTo: vi.fn(() => layer) };
    leaflet = {
      map: vi.fn(() => leafletMap),
      tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
      layerGroup: vi.fn(() => layer),
      divIcon: vi.fn((options) => options),
      polyline: vi.fn((points: [number, number][], options: object) => {
        polylines.push({ points, options });
        return { addTo: vi.fn() };
      }),
      marker: vi.fn((position: [number, number], options: { icon: MarkerCall['icon'] }) => {
        const call: MarkerCall = { position, icon: options.icon };
        markers.push(call);
        const marker = {
          bindTooltip: vi.fn((tooltip: HTMLElement) => {
            call.tooltip = tooltip;
            return marker;
          }),
          addTo: vi.fn(() => marker),
        };
        return marker;
      }),
    };
    observerDisconnect = vi.fn();
    vi.stubGlobal('L', leaflet);
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = vi.fn();
        disconnect = observerDisconnect;
      },
    );
  };

  const render = async (routeMap: IContainerRouteMap): Promise<void> => {
    loadRouteMap.mockReturnValue(of(routeMap));
    fixture = TestBed.createComponent(ContainerTemplateRouteMapComponent);
    fixture.componentRef.setInput('routeInfo', ROUTE_INFO);
    fixture.detectChanges();
    TestBed.tick();
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const hint = (): HTMLElement | null => fixture.nativeElement.querySelector('.route-map-hint');

  beforeEach(() => {
    stubLeaflet();
    config = createGeoServicesConfigMock({ mapTilesEnabled: true, mapTiles: TEST_MAP_TILE_CONFIG });
    loadRouteMap = vi.fn();
    TestBed.configureTestingModule({
      imports: [ContainerTemplateRouteMapComponent, TranslateModule.forRoot()],
      providers: [
        { provide: GeoServicesConfigService, useValue: config },
        { provide: ContainerRouteMapService, useValue: { loadRouteMap } },
      ],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('places the markers in route order with the stop numbers as the only icon content', async () => {
    // Arrange / Act
    await render(ROAD_MAP);

    // Assert
    expect(loadRouteMap).toHaveBeenCalledWith(ROUTE_INFO);
    expect(markers.map((m) => m.position)).toEqual([
      [47.5, 8.7],
      [47.51, 8.71],
      [47.52, 8.72],
    ]);
    expect(markers.map((m) => m.icon.html)).toEqual(['', '1', '2']);
    expect(markers[1].icon.className).toBe(ROUTE_MAP_STOP_MARKER_CLASS);
  });

  it('draws the road geometry as a solid line and shows no estimated hint', async () => {
    // Arrange / Act
    await render(ROAD_MAP);

    // Assert
    expect(polylines).toHaveLength(1);
    expect(polylines[0].points).toEqual(ROAD_MAP.path.map((p) => [p.lat, p.lon]));
    expect(polylines[0].options).toBe(ROUTE_MAP_ROAD_LINE_STYLE);
    expect(leafletMap.fitBounds).toHaveBeenCalledTimes(1);
    expect(hint()).toBeNull();
  });

  it('falls back to a dashed straight line with the estimated hint when no road geometry came back', async () => {
    // Arrange
    const straight: IContainerRouteMap = {
      markers: ROAD_MAP.markers,
      path: [
        { lat: 47.5, lon: 8.7 },
        { lat: 47.51, lon: 8.71 },
        { lat: 47.52, lon: 8.72 },
      ],
      isRoadGeometry: false,
    };

    // Act
    await render(straight);

    // Assert
    expect(polylines[0].options).toBe(ROUTE_MAP_ESTIMATED_LINE_STYLE);
    expect(hint()).not.toBeNull();
    expect(hint()?.getAttribute('role')).toBe('status');
  });

  it('puts names into the tooltip as text, never as markup', async () => {
    // Arrange / Act
    await render(ROAD_MAP);

    // Assert
    const tooltip = markers[2].tooltip!;
    expect(tooltip.querySelector('img')).toBeNull();
    expect(tooltip.textContent).toContain(XSS_PAYLOAD);
  });

  it('shows the geo service notice and creates no map when map tiles are off', async () => {
    // Arrange
    config.mapTilesEnabled.set(false);
    config.mapTiles.set(null);

    // Act
    await render(ROAD_MAP);

    // Assert
    expect(leaflet['map']).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('app-geo-service-notice')).not.toBeNull();
  });

  it('removes the map and stops observing its size when destroyed', async () => {
    // Arrange
    await render(ROAD_MAP);

    // Act
    fixture.destroy();

    // Assert
    expect(leafletMap.remove).toHaveBeenCalledTimes(1);
    expect(observerDisconnect).toHaveBeenCalled();
  });
});
