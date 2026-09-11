// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Loads the company time zone (and its resolution source) from the CompanyClock endpoint and
 * feeds it into the shared calendar-date helper via setCompanyTimeZone, so every "today" default
 * and the companyDateTime pipe follow the company's clock instead of the browser's. Loading only
 * ever runs while a token is present in local storage - never as a blocking APP_INITIALIZER - so a
 * logged-out visitor (e.g. the login page) never triggers a guaranteed 401. A failed load leaves
 * the browser time zone in place, only logs a warning (never a toast) and is retried by the next
 * loadIfAuthenticated call. loadIfAuthenticated is idempotent (a second caller reuses the
 * in-flight/completed load); reload always re-fetches and is used after the company address/time
 * zone setting is saved; reset clears zone, source and the cached load on logout (a response still
 * in flight is discarded) so the next user starts from the browser zone and loads their own clock.
 * @param source - Signal exposing which resolution step (Setting, AddressCountry, CalendarCountry,
 *   Utc) produced the current time zone, so the UI can warn when it fell back to Utc
 */

import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DataCompanyClockService } from 'src/app/infrastructure/api/settings/data-company-clock.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { setCompanyTimeZone } from 'src/app/shared/helpers/calendar-date.helper';
import { CompanyClockSource } from 'src/app/domain/models/settings/company-clock.model';

const COMPANY_CLOCK_LOAD_WARNING = 'CompanyClockService: failed to load company time zone, keeping browser time zone.';

@Injectable({
  providedIn: 'root',
})
export class CompanyClockService {
  private dataCompanyClockService = inject(DataCompanyClockService);
  private localStorageService = inject(LocalStorageService);

  public source = signal<CompanyClockSource | null>(null);

  private loadPromise: Promise<void> | null = null;
  private loadGeneration = 0;

  loadIfAuthenticated(): Promise<void> {
    if (this.loadPromise) {
      return this.loadPromise;
    }
    if (!this.hasToken()) {
      return Promise.resolve();
    }
    return this.startLoad();
  }

  reload(): Promise<void> {
    if (!this.hasToken()) {
      return Promise.resolve();
    }
    return this.startLoad();
  }

  reset(): void {
    this.loadGeneration++;
    this.loadPromise = null;
    setCompanyTimeZone(null);
    this.source.set(null);
  }

  private hasToken(): boolean {
    return this.localStorageService.get(StorageKeys.TOKEN) !== null;
  }

  private startLoad(): Promise<void> {
    const load = this.fetch().then((succeeded) => {
      if (!succeeded && this.loadPromise === load) {
        this.loadPromise = null;
      }
    });
    this.loadPromise = load;
    return load;
  }

  private async fetch(): Promise<boolean> {
    const generation = this.loadGeneration;
    try {
      const clock = await firstValueFrom(this.dataCompanyClockService.readCompanyClock());
      if (generation !== this.loadGeneration) {
        return true;
      }
      setCompanyTimeZone(clock.timeZone);
      this.source.set(clock.source);
      return true;
    } catch (error) {
      console.warn(COMPANY_CLOCK_LOAD_WARNING, error);
      return false;
    }
  }
}
