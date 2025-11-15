import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, map, catchError, delay, concatMap, from } from 'rxjs';

export interface GeocodingResult {
  lat: number;
  lon: number;
  display_name: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

@Injectable({
  providedIn: 'root',
})
export class GeocodingService {
  private httpClient = inject(HttpClient);
  private readonly NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
  private cache = new Map<string, Coordinates>();
  private readonly REQUEST_DELAY = 1100;

  private readonly STATIC_COORDINATES = new Map<string, Coordinates>([
    ['Zürich,CH', { latitude: 47.3769, longitude: 8.5417 }],
    ['Zurich,CH', { latitude: 47.3769, longitude: 8.5417 }],
    ['Bern,CH', { latitude: 46.9480, longitude: 7.4474 }],
    ['Lausanne,CH', { latitude: 46.5197, longitude: 6.6323 }],
    ['Luzern,CH', { latitude: 47.0502, longitude: 8.3093 }],
    ['Lucerne,CH', { latitude: 47.0502, longitude: 8.3093 }],
    ['Regensdorf,CH', { latitude: 47.4297, longitude: 8.4653 }],
    ['Oberengstringen,CH', { latitude: 47.4097, longitude: 8.4586 }],
    ['Unterengstringen,CH', { latitude: 47.4045, longitude: 8.4518 }],
    ['Weiningen ZH,CH', { latitude: 47.4213, longitude: 8.4376 }],
    ['Hinterkappelen,CH', { latitude: 46.9789, longitude: 7.3916 }],
    ['Liebefeld,CH', { latitude: 46.9296, longitude: 7.4189 }],
    ['Adlikon b. Regensdorf,CH', { latitude: 47.4339, longitude: 8.4532 }],
  ]);

  geocode(city: string, country: string): Observable<Coordinates | null> {
    const cacheKey = `${city},${country}`;

    if (this.cache.has(cacheKey)) {
      return of(this.cache.get(cacheKey)!);
    }

    if (this.STATIC_COORDINATES.has(cacheKey)) {
      const coords = this.STATIC_COORDINATES.get(cacheKey)!;
      this.cache.set(cacheKey, coords);
      return of(coords);
    }

    const params = {
      q: `${city}, ${country}`,
      format: 'json',
      limit: '1',
    };

    return this.httpClient.get<GeocodingResult[]>(this.NOMINATIM_URL, { params }).pipe(
      map((results) => {
        if (results && results.length > 0) {
          const coordinates: Coordinates = {
            latitude: typeof results[0].lat === 'string' ? parseFloat(results[0].lat) : results[0].lat,
            longitude: typeof results[0].lon === 'string' ? parseFloat(results[0].lon) : results[0].lon,
          };
          this.cache.set(cacheKey, coordinates);
          return coordinates;
        }
        return null;
      }),
      catchError((error) => {
        console.error('Geocoding error for', city, country, error);
        return of(null);
      })
    );
  }

  geocodeMultiple(locations: { city: string; country: string }[]): Observable<Map<string, Coordinates>> {
    const results = new Map<string, Coordinates>();
    const promises: Promise<void>[] = [];

    locations.forEach((location) => {
      const promise = new Promise<void>((resolve) => {
        this.geocode(location.city, location.country).subscribe({
          next: (coords) => {
            if (coords) {
              results.set(`${location.city},${location.country}`, coords);
            }
            resolve();
          },
          error: () => resolve(),
        });
      });
      promises.push(promise);
    });

    return new Observable((observer) => {
      Promise.all(promises).then(() => {
        observer.next(results);
        observer.complete();
      });
    });
  }
}
