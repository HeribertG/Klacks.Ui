// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Central service for programmatic in-app navigation.
 * Also captures the page the user was working on when an authentication loss
 * forces a redirect to the login page, so the user can be returned there after
 * a successful re-login instead of always landing on the dashboard.
 */
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { SETUP_ROUTE_PATH } from 'src/app/domain/constants/setup.constants';

interface ReturnUrlPayload {
  url: string;
  ts: number;
}

@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  private static readonly RETURN_URL_MAX_AGE_MS = 30 * 60 * 1000;
  private static readonly RESTORABLE_PREFIX = '/workplace/';
  private static readonly NON_RESTORABLE_PATHS = ['/workplace/dashboard'];

  private router = inject(Router);
  private localStorageService = inject(LocalStorageService);

  navigateToDashboard(): void {
    this.router.navigate(['/workplace/dashboard']);
  }

  navigateToAbsence(): void {
    this.router.navigate(['/workplace/absence']);
  }

  navigateToGroup(): void {
    this.router.navigate(['/workplace/group']);
  }

  navigateToShift(): void {
    this.router.navigate(['/workplace/shift']);
  }

  navigateToCutShift(id: string): void {
    this.router.navigate(['/workplace/cut-shift', id]);
  }

  navigateToContainerTemplateShift(id: string): void {
    this.router.navigate(['/workplace/container-template', id]);
  }

  navigateToSchedule(): void {
    this.router.navigate(['/workplace/schedule']);
  }

  navigateToClient(): void {
    this.router.navigate(['/workplace/client']);
  }

  navigateToProfile(): void {
    this.router.navigate(['/workplace/profile']);
  }

  navigateToSettings(): void {
    this.router.navigate(['/workplace/settings']);
  }

  navigateToEscalations(): void {
    this.router.navigate(['/workplace/escalations']);
  }

  navigateToRoot(): Promise<boolean> {
    return this.router.navigate(['/']);
  }

  navigateToWorkplace(): void {
    this.router.navigate(['/workplace']);
  }

  navigateToError(): void {
    this.router.navigate(['/error']);
  }

  navigateToNoAccess(): void {
    this.router.navigate(['/no-access']);
  }

  navigateToPageNotFound(): void {
    this.router.navigate(['/page-not-found']);
  }

  navigateToSetup(): void {
    this.router.navigate([`/${SETUP_ROUTE_PATH}`]);
  }

  isOnSetupPage(): boolean {
    return this.router.url.startsWith(`/${SETUP_ROUTE_PATH}`);
  }
  navigateToEditAddress(id?: string): void {
    if (id) {
      this.router.navigate(['/workplace/edit-address', id]);
    } else {
      this.router.navigate(['/workplace/edit-address']);
    }
  }

  navigateToEditGroup(id?: string): void {
    if (id) {
      this.router.navigate(['/workplace/edit-group', id]);
    } else {
      this.router.navigate(['/workplace/edit-group']);
    }
  }

  navigateToEditShift(id?: string, readOnly?: boolean): void {
    if (id) {
      if (readOnly) {
        this.router.navigate(['/workplace/edit-shift', id], {
          queryParams: { readonly: 'true', returnUrl: '/workplace/shift' },
        });
      } else {
        this.router.navigate(['/workplace/edit-shift', id]);
      }
    } else {
      this.router.navigate(['/workplace/edit-shift']);
    }
  }

  navigateToNewShift(): void {
    this.router.navigate(['/workplace/new-shift']);
  }

  navigateToClientAvailability(): void {
    this.router.navigate(['/workplace/client-availability']);
  }

  navigateToInbox(): void {
    this.router.navigate(['/workplace/inbox']);
  }

  navigateToMessaging(): void {
    this.router.navigate(['/workplace/messaging']);
  }

  navigateToPeriodClosing(): void {
    this.router.navigate(['/workplace/period-closing']);
  }

  navigateToRouterToken(routerToken: string): void {
    this.router.navigate([routerToken]);
  }

  redirectToLogin(targetUrl?: string): Promise<boolean> {
    const url = targetUrl ?? this.router.url;
    if (this.isRestorableUrl(url)) {
      const payload: ReturnUrlPayload = { url, ts: Date.now() };
      this.localStorageService.setJson(StorageKeys.RETURN_URL, payload);
    } else {
      this.localStorageService.remove(StorageKeys.RETURN_URL);
    }
    return this.navigateToRoot();
  }

  navigateAfterLogin(): void {
    const returnUrl = this.readReturnUrl();
    if (returnUrl) {
      this.localStorageService.remove(StorageKeys.RETURN_URL);
      this.router.navigateByUrl(returnUrl).then((succeeded) => {
        if (!succeeded) {
          this.navigateToDashboard();
        }
      });
      return;
    }
    this.navigateToDashboard();
  }

  private readReturnUrl(): string | null {
    const payload = this.localStorageService.getJson(
      StorageKeys.RETURN_URL
    ) as ReturnUrlPayload | null;

    if (
      !payload ||
      typeof payload.url !== 'string' ||
      typeof payload.ts !== 'number'
    ) {
      this.localStorageService.remove(StorageKeys.RETURN_URL);
      return null;
    }

    const isFresh =
      Date.now() - payload.ts <= NavigationService.RETURN_URL_MAX_AGE_MS;
    if (!isFresh || !this.isRestorableUrl(payload.url)) {
      this.localStorageService.remove(StorageKeys.RETURN_URL);
      return null;
    }

    return payload.url;
  }

  private isRestorableUrl(url: string): boolean {
    if (!url || !url.startsWith(NavigationService.RESTORABLE_PREFIX)) {
      return false;
    }
    const path = url.split('?')[0];
    return !NavigationService.NON_RESTORABLE_PATHS.includes(path);
  }
}
