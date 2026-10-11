// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Service for fetching route geometries for map display, exclusively through the backend.
 * OpenRouteService (Routing/Directions, holds the API key) is asked first when the installation enables it;
 * when it reports no route, the backend OSRM proxy (Routing/OsrmRoute) is asked when routing is enabled.
 * Whatever is switched off is not requested at all, and when no route can be obtained the raw waypoints are
 * returned, so the map shows straight lines instead of failing.
 * @param coordinates - List of coordinates with name, lat/lon
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, switchMap, catchError, of, from } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  ROUTING_DIRECTIONS_PATH,
  ROUTING_OSRM_ROUTE_PATH,
} from 'src/app/domain/constants/geo-services-api.constants';
import { GeoServicesConfigService } from 'src/app/domain/services/settings/geo-services-config.service';
import { IRouteGeometryResult } from 'src/app/domain/models/geo/route-geometry-result.interface';
import { RouteGeometryStatus } from 'src/app/domain/models/geo/route-geometry-status.model';

export interface RouteCoordinate {
  lat: number;
  lon: number;
}

export interface RouteCoordinateWithName extends RouteCoordinate {
  name: string;
}

const MIN_ROUTE_WAYPOINTS = 2;

@Injectable({
  providedIn: 'root',
})
export class DataRoutingService {
  private httpClient = inject(HttpClient);
  private geoServicesConfig = inject(GeoServicesConfigService);

  getRoute(coordinates: RouteCoordinateWithName[]): Observable<RouteCoordinate[]> {
    const waypoints = this.toWaypoints(coordinates);
    if (coordinates.length < MIN_ROUTE_WAYPOINTS) {
      return of(waypoints);
    }

    return from(this.geoServicesConfig.ensureLoaded()).pipe(
      switchMap(() => this.getOpenRouteServiceRoute(waypoints)),
      switchMap((route) => (route.length > 0 ? of(route) : this.getOsrmRoute(waypoints))),
      map((route) => (route.length > 0 ? route : waypoints)),
      catchError(() => of(waypoints)),
    );
  }

  private getOpenRouteServiceRoute(waypoints: RouteCoordinate[]): Observable<RouteCoordinate[]> {
    if (!this.geoServicesConfig.openRouteServiceEnabled()) {
      return of([]);
    }

    return this.httpClient
      .post<RouteCoordinate[] | null>(`${environment.baseUrl}${ROUTING_DIRECTIONS_PATH}`, waypoints)
      .pipe(
        map((route) => route ?? []),
        catchError(() => of([])),
      );
  }

  private getOsrmRoute(waypoints: RouteCoordinate[]): Observable<RouteCoordinate[]> {
    if (!this.geoServicesConfig.routingEnabled()) {
      return of([]);
    }

    return this.httpClient
      .post<IRouteGeometryResult>(`${environment.baseUrl}${ROUTING_OSRM_ROUTE_PATH}`, waypoints)
      .pipe(
        map((result) =>
          result?.status === RouteGeometryStatus.Ok
            ? result.points.map((point) => ({ lat: point.lat, lon: point.lon }))
            : [],
        ),
        catchError(() => of([])),
      );
  }

  private toWaypoints(coordinates: RouteCoordinateWithName[]): RouteCoordinate[] {
    return coordinates.map((c) => ({ lat: c.lat, lon: c.lon }));
  }
}
