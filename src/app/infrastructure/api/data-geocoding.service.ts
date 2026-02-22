// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface GeocodingResult {
  lat: number;
  lon: number;
  displayName: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

@Injectable({
  providedIn: 'root',
})
export class DataGeocodingService {
  private httpClient = inject(HttpClient);
  private readonly NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

  searchAddress(query: string, language = 'de'): Observable<GeocodingResult | null> {
    const url = `${this.NOMINATIM_BASE_URL}/search?format=json&q=${encodeURIComponent(query)}&limit=1`;

    return this.httpClient.get<NominatimResult[]>(url, {
      headers: {
        'Accept-Language': language,
      },
    }).pipe(
      map(results => {
        if (results && results.length > 0) {
          const result = results[0];
          return {
            lat: parseFloat(result.lat),
            lon: parseFloat(result.lon),
            displayName: result.display_name,
          };
        }
        return null;
      })
    );
  }
}
