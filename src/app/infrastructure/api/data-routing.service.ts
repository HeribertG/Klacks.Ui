// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for fetching route geometries for map display.
 * @param coordinates - List of coordinates with name, lat/lon
 * Uses OpenRouteService (if API key is available), otherwise OSRM as fallback.
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, of, switchMap } from 'rxjs';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';

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

interface OrsDirectionsResponse {
  features: {
    geometry: {
      coordinates: [number, number][];
    };
  }[];
}

const OSRM_ROUTE_URL = 'https://router.project-osrm.org/route/v1/driving/';
const ORS_DIRECTIONS_URL = 'https://api.openrouteservice.org/v2/directions/driving-car/geojson';

@Injectable({
  providedIn: 'root',
})
export class DataRoutingService {
  private httpClient = inject(HttpClient);
  private appSettingsService = inject(AppSettingsManagementService);

  getRoute(coordinates: RouteCoordinateWithName[]): Observable<RouteCoordinate[]> {
    if (coordinates.length < 2) {
      return of(coordinates.map((c) => ({ lat: c.lat, lon: c.lon })));
    }

    const apiKey = this.appSettingsService.openRouteServiceApiKey();

    if (apiKey) {
      return this.getOpenRouteServiceRoute(coordinates, apiKey).pipe(
        catchError(() => this.getOsrmRoute(coordinates))
      );
    }

    return this.getOsrmRoute(coordinates);
  }

  private getOpenRouteServiceRoute(
    coordinates: RouteCoordinateWithName[],
    apiKey: string
  ): Observable<RouteCoordinate[]> {
    const body = {
      coordinates: coordinates.map((c) => [c.lon, c.lat]),
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: apiKey,
    });

    return this.httpClient
      .post<OrsDirectionsResponse>(ORS_DIRECTIONS_URL, body, { headers })
      .pipe(
        map((data) => {
          if (!data.features || data.features.length === 0) {
            throw new Error('No route found');
          }

          return data.features[0].geometry.coordinates.map((coord) => ({
            lon: coord[0],
            lat: coord[1],
          }));
        })
      );
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
