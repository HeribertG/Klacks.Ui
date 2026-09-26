// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Shows the global progress spinner while a route navigation is running and hides it again when the
 * navigation ends, is cancelled, fails or is skipped. It lives for the whole application (started once
 * by the root component) so that leaving the workplace shell - which destroys the navigation bar mid
 * navigation - can never swallow the terminal navigation event and leave the spinner on.
 * @param loadingIndicator - Global progress spinner that is switched on and off around navigations
 */
import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationSkipped,
  NavigationStart,
  Router,
} from '@angular/router';
import { LOADING_INDICATOR_TOKEN } from 'src/app/domain/interfaces/loading-indicator.interface';

@Injectable({
  providedIn: 'root',
})
export class NavigationSpinnerCoordinator {
  private readonly router = inject(Router);
  private readonly loadingIndicator = inject(LOADING_INDICATOR_TOKEN);
  private readonly destroyRef = inject(DestroyRef);

  private started = false;

  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;

    this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.loadingIndicator.showProgressSpinner = true;
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError ||
        event instanceof NavigationSkipped
      ) {
        this.loadingIndicator.showProgressSpinner = false;
      }
    });
  }
}
