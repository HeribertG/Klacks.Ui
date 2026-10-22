// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Central service for programmatic in-app navigation.
 * Also captures the page the user was working on when an authentication loss
 * forces a redirect to the login page, so the user can be returned there after
 * a successful re-login instead of always landing on the dashboard.
 */
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ReturnUrlMemoryService } from 'src/app/domain/services/navigation/return-url-memory.service';
import { SETUP_ROUTE_PATH } from 'src/app/domain/constants/setup.constants';

@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  private router = inject(Router);
  private returnUrlMemory = inject(ReturnUrlMemoryService);

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

  /**
   * @param id - Shift to open; there is no parameterless /workplace/edit-shift route, a new shift
   * goes to navigateToNewShift instead
   * @param readOnly - Opens the shift for viewing and remembers the shift list as the way back
   */
  navigateToEditShift(id: string, readOnly?: boolean): void {
    if (readOnly) {
      this.router.navigate(['/workplace/edit-shift', id], {
        queryParams: { readonly: 'true', returnUrl: '/workplace/shift' },
      });
      return;
    }

    this.router.navigate(['/workplace/edit-shift', id]);
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
    this.returnUrlMemory.remember(url);
    return this.navigateToRoot();
  }

  navigateAfterLogin(): void {
    const returnUrl = this.returnUrlMemory.consume();
    if (returnUrl) {
      this.router.navigateByUrl(returnUrl).then((succeeded) => {
        if (!succeeded) {
          this.navigateToDashboard();
        }
      });
      return;
    }
    this.navigateToDashboard();
  }
}
