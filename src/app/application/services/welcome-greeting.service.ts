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
import { Observable, defer, from, of, tap, throwError } from 'rxjs';
import { catchError, switchMap, timeout } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { DataAssistantService } from 'src/app/infrastructure/api/assistant/data-assistant.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { IWelcomeRequest, IWelcomeResponse } from 'src/app/domain/models/assistant/welcome.interface';

const GEOLOCATION_TIMEOUT_MS = 2000;
const GEOLOCATION_MAX_AGE_MS = 15 * 60 * 1000;

const MORNING_END_HOUR = 12;
const AFTERNOON_END_HOUR = 18;
const LAST_VARIANT_KEY_PREFIX = 'klacksy.welcome.lastVariant.';
const REOPEN_POOL_KEY = 'reopen';
const SESSION_OPENED_KEY = 'klacksy.welcome.sessionOpened';

type Daypart = 'morning' | 'afternoon' | 'evening';
type GreetingPool = Daypart | 'reopen';

@Injectable({
  providedIn: 'root',
})
export class WelcomeGreetingService {
  private readonly dataAssistantService = inject(DataAssistantService);
  private readonly localStorageService = inject(LocalStorageService);
  private readonly translateService = inject(TranslateService);
  private readonly router = inject(Router);

  fetchWelcome(): Observable<IWelcomeResponse> {
    const isReopen = this.isReopenSession();
    return this.tryGetGeolocation().pipe(
      switchMap((coords) => {
        const request = this.buildRequest(coords, isReopen);
        const pool: GreetingPool = isReopen ? REOPEN_POOL_KEY : this.resolveDaypart(request.localHour);
        return this.dataAssistantService.getWelcome(request).pipe(
          tap((response) => {
            this.rememberVariantIndex(pool, response.greetingVariantIndex);
            this.markSessionOpened();
          }),
        );
      }),
    );
  }

  private buildRequest(coords: GeolocationCoordinates | null, isReopen: boolean): IWelcomeRequest {
    const now = new Date();
    const localHour = now.getHours();
    const pool: GreetingPool = isReopen ? REOPEN_POOL_KEY : this.resolveDaypart(localHour);
    const username = this.localStorageService.get(StorageKeys.TOKEN_USERNAME) ?? '';
    const lastVariantIndex = this.readLastVariantIndex(pool);

    const request: IWelcomeRequest = {
      lang: this.resolveLang(),
      localHour,
      weekday: now.getDay(),
      route: this.router.url,
      displayName: username,
      isReopen,
    };

    if (coords) {
      request.latitude = coords.latitude;
      request.longitude = coords.longitude;
    }

    if (lastVariantIndex !== null) {
      request.excludeVariantIndex = lastVariantIndex;
    }

    return request;
  }

  /**
   * Resolves the user's language, preferring the persisted choice over the translate
   * service state, which is still unset when the chat bootstraps before language setup.
   */
  private resolveLang(): string {
    return (
      this.localStorageService.get(StorageKeys.CURRENT_LANG) ||
      this.translateService.currentLang ||
      this.translateService.defaultLang ||
      'en'
    );
  }

  private isReopenSession(): boolean {
    if (typeof sessionStorage === 'undefined') return false;
    return sessionStorage.getItem(SESSION_OPENED_KEY) === '1';
  }

  private markSessionOpened(): void {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(SESSION_OPENED_KEY, '1');
  }

  private resolveDaypart(localHour: number): Daypart {
    if (localHour < MORNING_END_HOUR) return 'morning';
    if (localHour < AFTERNOON_END_HOUR) return 'afternoon';
    return 'evening';
  }

  private readLastVariantIndex(pool: GreetingPool): number | null {
    const raw = this.localStorageService.get(LAST_VARIANT_KEY_PREFIX + pool);
    if (!raw) return null;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }

  private rememberVariantIndex(pool: GreetingPool, index: number): void {
    if (!Number.isFinite(index) || index < 0) return;
    this.localStorageService.set(LAST_VARIANT_KEY_PREFIX + pool, index.toString());
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
