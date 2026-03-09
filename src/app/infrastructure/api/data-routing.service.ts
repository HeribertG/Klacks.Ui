// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, retry } from 'rxjs';

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

@Injectable({
  providedIn: 'root',
})
export class DataRoutingService {
  private httpClient = inject(HttpClient);
  private readonly OSRM_ROUTE_URL = 'https://router.project-osrm.org/route/v1/driving/';

  getRoute(coordinates: RouteCoordinateWithName[]): Observable<RouteCoordinate[]> {
    if (coordinates.length < 2) {
      return new Observable((observer) => {
        observer.next(coordinates.map((c) => ({ lat: c.lat, lon: c.lon })));
        observer.complete();
      });
    }

    const coordString = coordinates.map((c) => `${c.lon},${c.lat}`).join(';');
    const url = `${this.OSRM_ROUTE_URL}${coordString}?overview=full&geometries=geojson`;

    return this.httpClient.get<OsrmResponse>(url).pipe(
      retry(3),
      map((data) => {
        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
          throw new Error('No route found');
        }

        return data.routes[0].geometry.coordinates.map((coord) => ({
          lon: coord[0],
          lat: coord[1],
        }));
      })
    );
  }
}
