// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Tests for DataRoutingService.
 * Verifies that route requests only ever go to the own backend (OpenRouteService proxy first, then the
 * OSRM proxy), that switched-off services are not requested at all, and that the raw waypoints come back
 * when no route can be obtained.
 */

import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { DataRoutingService } from './data-routing.service';
import { RouteCoordinate } from './route-coordinate.interface';
import { RouteCoordinateWithName } from './route-coordinate-with-name.interface';
import { environment } from 'src/environments/environment';
import { IRoadRouteGeometry } from 'src/app/domain/models/geo/road-route-geometry.interface';
import { GeoServicesConfigService } from 'src/app/domain/services/settings/geo-services-config.service';
import { createGeoServicesConfigMock, GeoServicesConfigMock } from 'src/app/shared/testing/geo-services-config.testing';

const DIRECTIONS_URL = `${environment.baseUrl}Routing/Directions`;
const OSRM_ROUTE_URL = `${environment.baseUrl}Routing/OsrmRoute`;

const WAYPOINTS: RouteCoordinateWithName[] = [
  { name: 'Start', lat: 47.3769, lon: 8.5417 },
  { name: 'Ziel', lat: 46.948, lon: 7.4474 },
];

const RAW_WAYPOINTS: RouteCoordinate[] = [
  { lat: 47.3769, lon: 8.5417 },
  { lat: 46.948, lon: 7.4474 },
];

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

describe('DataRoutingService', () => {
  let service: DataRoutingService;
  let httpMock: HttpTestingController;
  let config: GeoServicesConfigMock;

  const route = async (coordinates: RouteCoordinateWithName[] = WAYPOINTS): Promise<{ value?: RouteCoordinate[] }> => {
    const captured: { value?: RouteCoordinate[] } = {};
    service.getRoute(coordinates).subscribe((r) => (captured.value = r));
    await settle();
    return captured;
  };

  beforeEach(() => {
    config = createGeoServicesConfigMock({ routingEnabled: true, openRouteServiceEnabled: true });
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DataRoutingService, { provide: GeoServicesConfigService, useValue: config }],
    });
    service = TestBed.inject(DataRoutingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('uses the OpenRouteService proxy geometry when the backend returns a route', async () => {
    const result = await route();

    httpMock.expectOne(DIRECTIONS_URL).flush([
      { lat: 47.3, lon: 8.5 },
      { lat: 47.1, lon: 8.0 },
    ]);

    expect(result.value).toEqual([
      { lat: 47.3, lon: 8.5 },
      { lat: 47.1, lon: 8.0 },
    ]);
    expect(config.ensureLoaded).toHaveBeenCalled();
  });

  it('falls back to the OSRM proxy when the OpenRouteService proxy answers 204 No Content', async () => {
    const result = await route();

    httpMock.expectOne(DIRECTIONS_URL).flush(null, { status: 204, statusText: 'No Content' });
    const osrmRequest = httpMock.expectOne(OSRM_ROUTE_URL);
    expect(osrmRequest.request.method).toBe('POST');
    expect(osrmRequest.request.body).toEqual(RAW_WAYPOINTS);
    osrmRequest.flush({ status: 'Ok', points: [{ lat: 47.3, lon: 8.5 }] });

    expect(result.value).toEqual([{ lat: 47.3, lon: 8.5 }]);
  });

  it('falls back to the OSRM proxy when the OpenRouteService proxy fails', async () => {
    const result = await route();

    httpMock.expectOne(DIRECTIONS_URL).flush(null, { status: 500, statusText: 'Server Error' });
    httpMock.expectOne(OSRM_ROUTE_URL).flush({ status: 'Ok', points: [{ lat: 46.94, lon: 7.44 }] });

    expect(result.value).toEqual([{ lat: 46.94, lon: 7.44 }]);
  });

  it.each(['NoRoute', 'Disabled', 'Unavailable'])(
    'returns the raw waypoints when the OSRM proxy reports %s',
    async (status) => {
      const result = await route();

      httpMock.expectOne(DIRECTIONS_URL).flush(null, { status: 204, statusText: 'No Content' });
      httpMock.expectOne(OSRM_ROUTE_URL).flush({ status, points: [] });

      expect(result.value).toEqual(RAW_WAYPOINTS);
    },
  );

  it('returns the raw waypoints when both routing proxies fail', async () => {
    const result = await route();

    httpMock.expectOne(DIRECTIONS_URL).flush(null, { status: 500, statusText: 'Server Error' });
    httpMock.expectOne(OSRM_ROUTE_URL).flush(null, { status: 429, statusText: 'Too Many Requests' });

    expect(result.value).toEqual(RAW_WAYPOINTS);
  });

  it('skips the OpenRouteService proxy when OpenRouteService is disabled', async () => {
    config.openRouteServiceEnabled.set(false);

    const result = await route();

    httpMock.expectNone(DIRECTIONS_URL);
    httpMock.expectOne(OSRM_ROUTE_URL).flush({ status: 'Ok', points: [{ lat: 47.3, lon: 8.5 }] });

    expect(result.value).toEqual([{ lat: 47.3, lon: 8.5 }]);
  });

  it('skips the OSRM proxy when routing is disabled', async () => {
    config.routingEnabled.set(false);

    const result = await route();

    httpMock.expectOne(DIRECTIONS_URL).flush(null, { status: 204, statusText: 'No Content' });
    httpMock.expectNone(OSRM_ROUTE_URL);

    expect(result.value).toEqual(RAW_WAYPOINTS);
  });

  it('sends no request at all and returns the waypoints when every routing service is disabled', async () => {
    config.routingEnabled.set(false);
    config.openRouteServiceEnabled.set(false);

    const result = await route();

    httpMock.expectNone(() => true);
    expect(result.value).toEqual(RAW_WAYPOINTS);
  });

  it('does not call any routing service for a single waypoint', async () => {
    const result = await route([WAYPOINTS[0]]);

    httpMock.expectNone(() => true);
    expect(result.value).toEqual([{ lat: 47.3769, lon: 8.5417 }]);
  });

  describe('getRouteGeometry', () => {
    const geometry = async (): Promise<{ value?: IRoadRouteGeometry }> => {
      const captured: { value?: IRoadRouteGeometry } = {};
      service.getRouteGeometry(WAYPOINTS).subscribe((g) => (captured.value = g));
      await settle();
      return captured;
    };

    it('reports a road geometry when a routing proxy returns a route', async () => {
      // Arrange
      const result = await geometry();

      // Act
      httpMock.expectOne(DIRECTIONS_URL).flush([
        { lat: 47.3, lon: 8.5 },
        { lat: 47.1, lon: 8.0 },
      ]);

      // Assert
      expect(result.value).toEqual({
        points: [
          { lat: 47.3, lon: 8.5 },
          { lat: 47.1, lon: 8.0 },
        ],
        isRoadGeometry: true,
      });
    });

    it('reports the straight-line fallback when no routing proxy returns a route', async () => {
      // Arrange
      const result = await geometry();

      // Act
      httpMock.expectOne(DIRECTIONS_URL).flush(null, { status: 500, statusText: 'Server Error' });
      httpMock.expectOne(OSRM_ROUTE_URL).flush({ status: 'NoRoute', points: [] });

      // Assert
      expect(result.value).toEqual({ points: RAW_WAYPOINTS, isRoadGeometry: false });
    });
  });
});
