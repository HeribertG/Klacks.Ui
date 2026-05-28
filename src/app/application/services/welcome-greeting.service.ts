// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Resolves the Klacksy welcome payload by collecting local context (time, weekday, language,
 * user name, optional geolocation) and calling the backend. Geolocation is requested via the
 * browser API with a short timeout — denial or absence falls back to no weather.
 * @param dataAssistantService - low-level HTTP API for the welcome endpoint
 * @param localStorageService - reads cached username token claim
 * @param translateService - current language code
 * @param router - current route for context-aware suggestions
 */

import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, defer, from, of, throwError } from 'rxjs';
import { catchError, switchMap, timeout } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { DataAssistantService } from 'src/app/infrastructure/api/assistant/data-assistant.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { IWelcomeRequest, IWelcomeResponse } from 'src/app/domain/models/assistant/welcome.interface';

const GEOLOCATION_TIMEOUT_MS = 2000;
const GEOLOCATION_MAX_AGE_MS = 15 * 60 * 1000;

@Injectable({
  providedIn: 'root',
})
export class WelcomeGreetingService {
  private readonly dataAssistantService = inject(DataAssistantService);
  private readonly localStorageService = inject(LocalStorageService);
  private readonly translateService = inject(TranslateService);
  private readonly router = inject(Router);

  fetchWelcome(): Observable<IWelcomeResponse> {
    return this.tryGetGeolocation().pipe(
      switchMap((coords) => {
        const request: IWelcomeRequest = this.buildRequest(coords);
        return this.dataAssistantService.getWelcome(request);
      }),
    );
  }

  private buildRequest(coords: GeolocationCoordinates | null): IWelcomeRequest {
    const now = new Date();
    const username = this.localStorageService.get(StorageKeys.TOKEN_USERNAME) ?? '';

    const request: IWelcomeRequest = {
      lang: this.translateService.currentLang || this.translateService.defaultLang || 'en',
      localHour: now.getHours(),
      weekday: now.getDay(),
      route: this.router.url,
      displayName: username,
    };

    if (coords) {
      request.latitude = coords.latitude;
      request.longitude = coords.longitude;
    }

    return request;
  }

  private tryGetGeolocation(): Observable<GeolocationCoordinates | null> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return of(null);
    }

    return defer(() => from(this.requestPosition())).pipe(
      timeout({ first: GEOLOCATION_TIMEOUT_MS, with: () => throwError(() => new Error('geolocation_timeout')) }),
      catchError(() => of(null)),
    );
  }

  private requestPosition(): Promise<GeolocationCoordinates | null> {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position.coords),
        () => resolve(null),
        {
          enableHighAccuracy: false,
          timeout: GEOLOCATION_TIMEOUT_MS,
          maximumAge: GEOLOCATION_MAX_AGE_MS,
        },
      );
    });
  }
}
