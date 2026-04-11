// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  private router = inject(Router);

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

  navigateToStatistic(): void {}

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

  navigateToEditShift(id?: string): void {
    if (id) {
      this.router.navigate(['/workplace/edit-shift', id]);
    } else {
      this.router.navigate(['/workplace/edit-shift']);
    }
  }

  navigateToNewShift(): void {
    this.router.navigate(['/workplace/new-shift']);
  }

  navigateToGroupTree(): void {
    this.router.navigate(['/workplace/group-structure']);
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

  navigateToFloorPlan(): void {
    this.router.navigate(['/workplace/floor-plan']);
  }

  navigateToPeriodClosing(): void {
    this.router.navigate(['/workplace/period-closing']);
  }

  navigateToRouterToken(routerToken: string): void {
    this.router.navigate([routerToken]);
  }
}
