import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { deleteStack } from '../helpers/local-storage-stack';

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

  navigateToSchedule(): void {
    this.router.navigate(['/workplace/schedule']);
  }

  navigateToClient(): void {
    deleteStack();
    this.router.navigate(['/workplace/client']);
  }

  navigateToProfile(): void {
    deleteStack();
    this.router.navigate(['/workplace/profile']);
  }

  navigateToSettings(): void {
    deleteStack();
    this.router.navigate(['/workplace/settings']);
  }

  navigateToStatistic(): void {}

  navigateToRoot(): void {
    this.router.navigate(['/']);
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
  navigateToEditAddress(): void {
    this.router.navigate(['/workplace/edit-address']);
  }

  navigateToEditGroup(): void {
    this.router.navigate(['/workplace/edit-group']);
  }

  navigateToEditShift(): void {
    this.router.navigate(['/workplace/edit-shift']);
  }

  navigateToGroupTree(): void {
    this.router.navigate(['/workplace/group-structure']);
  }

  navigateToRouterToken(routerToken: string): void {
    this.router.navigate([routerToken]);
  }
}
