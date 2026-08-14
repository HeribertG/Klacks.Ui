// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for fetching route geometries for map display.
 * @param coordinates - List of coordinates with name, lat/lon
 * Routes are requested through the backend proxy, which holds the OpenRouteService API key.
 * When the proxy reports no route (key not configured, service unavailable), OSRM is used instead.
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, switchMap, catchError, of } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface RouteCoordinate {
  lat: number;
  lon: number;
}

export interface RouteCoordinateWithName extends RouteCoordinate {
  name: string;
}

interface OsrmResponse {
  code: string;
  routes: {
    geometry: {
      coordinates: [number, number][];
    };
  }[];
}

const OSRM_ROUTE_URL = 'https://router.project-osrm.org/route/v1/driving/';
const ROUTING_DIRECTIONS_PATH = 'Routing/Directions';

@Injectable({
  providedIn: 'root',
})
export class DataRoutingService {
  private httpClient = inject(HttpClient);

  getRoute(coordinates: RouteCoordinateWithName[]): Observable<RouteCoordinate[]> {
    if (coordinates.length < 2) {
      return of(coordinates.map((c) => ({ lat: c.lat, lon: c.lon })));
    }

    return this.getProxiedRoute(coordinates).pipe(
      switchMap((route) =>
        route.length > 0 ? of(route) : this.getOsrmRoute(coordinates)
      ),
      catchError(() => this.getOsrmRoute(coordinates))
    );
  }

  private getProxiedRoute(
    coordinates: RouteCoordinateWithName[]
  ): Observable<RouteCoordinate[]> {
    const body = coordinates.map((c) => ({ lat: c.lat, lon: c.lon }));

    return this.httpClient
      .post<RouteCoordinate[] | null>(
        `${environment.baseUrl}${ROUTING_DIRECTIONS_PATH}`,
        body
      )
      .pipe(map((route) => route ?? []));
  }

  private getOsrmRoute(
    coordinates: RouteCoordinateWithName[]
  ): Observable<RouteCoordinate[]> {
    const coordString = coordinates.map((c) => `${c.lon},${c.lat}`).join(';');
    const url = `${OSRM_ROUTE_URL}${coordString}?overview=full&geometries=geojson`;

    return this.httpClient.get<OsrmResponse>(url).pipe(
      map((data) => {
        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
          throw new Error('No route found');
        }

        return data.routes[0].geometry.coordinates.map((coord) => ({
          lon: coord[0],
          lat: coord[1],
        }));
      }),
      catchError(() =>
        of(coordinates.map((c) => ({ lat: c.lat, lon: c.lon })))
      )
    );
  }
}
