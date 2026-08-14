// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Tests for DataRoutingService.
 * Verifies that route requests go through the backend proxy (so the OpenRouteService API key
 * never reaches the browser) and that OSRM is only used when the proxy reports no route.
 */

import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import {
  DataRoutingService,
  RouteCoordinate,
  RouteCoordinateWithName,
} from './data-routing.service';
import { environment } from 'src/environments/environment';

const PROXY_URL = `${environment.baseUrl}Routing/Directions`;
const OSRM_URL_PREFIX = 'https://router.project-osrm.org/route/v1/driving/';
const ORS_HOST = 'openrouteservice.org';

const WAYPOINTS: RouteCoordinateWithName[] = [
  { name: 'Start', lat: 47.3769, lon: 8.5417 },
  { name: 'Ziel', lat: 46.948, lon: 7.4474 },
];

describe('DataRoutingService', () => {
  let service: DataRoutingService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DataRoutingService],
    });
    service = TestBed.inject(DataRoutingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('never calls openrouteservice.org directly', () => {
    service.getRoute(WAYPOINTS).subscribe();

    const request = httpMock.expectOne(PROXY_URL);
    expect(request.request.url).not.toContain(ORS_HOST);
    request.flush([{ lat: 47.3, lon: 8.5 }]);
  });

  it('uses the proxy geometry when the backend returns a route', () => {
    let result: RouteCoordinate[] | undefined;
    service.getRoute(WAYPOINTS).subscribe((r) => (result = r));

    httpMock.expectOne(PROXY_URL).flush([
      { lat: 47.3, lon: 8.5 },
      { lat: 47.1, lon: 8.0 },
    ]);

    expect(result).toEqual([
      { lat: 47.3, lon: 8.5 },
      { lat: 47.1, lon: 8.0 },
    ]);
  });

  it('falls back to OSRM when the proxy answers 204 No Content', () => {
    let result: RouteCoordinate[] | undefined;
    service.getRoute(WAYPOINTS).subscribe((r) => (result = r));

    httpMock
      .expectOne(PROXY_URL)
      .flush(null, { status: 204, statusText: 'No Content' });

    const osrmRequest = httpMock.expectOne((r) =>
      r.url.startsWith(OSRM_URL_PREFIX)
    );
    osrmRequest.flush({
      code: 'Ok',
      routes: [{ geometry: { coordinates: [[8.5, 47.3]] } }],
    });

    expect(result).toEqual([{ lat: 47.3, lon: 8.5 }]);
  });

  it('falls back to OSRM when the proxy fails', () => {
    let result: RouteCoordinate[] | undefined;
    service.getRoute(WAYPOINTS).subscribe((r) => (result = r));

    httpMock
      .expectOne(PROXY_URL)
      .flush(null, { status: 500, statusText: 'Server Error' });

    httpMock
      .expectOne((r) => r.url.startsWith(OSRM_URL_PREFIX))
      .flush({
        code: 'Ok',
        routes: [{ geometry: { coordinates: [[7.44, 46.94]] } }],
      });

    expect(result).toEqual([{ lat: 46.94, lon: 7.44 }]);
  });

  it('returns the raw waypoints when both routing paths fail', () => {
    let result: RouteCoordinate[] | undefined;
    service.getRoute(WAYPOINTS).subscribe((r) => (result = r));

    httpMock
      .expectOne(PROXY_URL)
      .flush(null, { status: 500, statusText: 'Server Error' });

    httpMock
      .expectOne((r) => r.url.startsWith(OSRM_URL_PREFIX))
      .flush(null, { status: 500, statusText: 'Server Error' });

    expect(result).toEqual([
      { lat: 47.3769, lon: 8.5417 },
      { lat: 46.948, lon: 7.4474 },
    ]);
  });

  it('does not call any routing service for a single waypoint', () => {
    let result: RouteCoordinate[] | undefined;
    service.getRoute([WAYPOINTS[0]]).subscribe((r) => (result = r));

    expect(result).toEqual([{ lat: 47.3769, lon: 8.5417 }]);
  });
});
