import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { deleteStack } from '../helpers/local-storage-stack';

@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  private router = inject(Router);

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
}
