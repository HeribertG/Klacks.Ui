// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable, map, retry } from 'rxjs';
import { SKIP_LOADING } from 'src/app/domain/constants/http-context.constants';

import { DomainMessages } from 'src/app/domain/constants/messages';
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

  searchAddress(query: string, language = DomainMessages.DEFAULT_LANG): Observable<GeocodingResult | null> {
    const url = `${this.NOMINATIM_BASE_URL}/search?format=json&q=${encodeURIComponent(query)}&limit=1`;

    return this.httpClient.get<NominatimResult[]>(url, {
      headers: {
        'Accept-Language': language,
      },
      context: new HttpContext().set(SKIP_LOADING, true),
    }).pipe(
      retry(3),
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
