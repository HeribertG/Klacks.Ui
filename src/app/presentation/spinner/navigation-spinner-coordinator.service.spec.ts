// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  NavigationCancel,
  NavigationCancellationCode,
  NavigationEnd,
  NavigationError,
  NavigationSkipped,
  NavigationSkippedCode,
  NavigationStart,
  Router,
  RouterEvent,
  provideRouter,
} from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subject } from 'rxjs';
import { ILoadingIndicator, LOADING_INDICATOR_TOKEN } from 'src/app/domain/interfaces/loading-indicator.interface';
import { NavigationSpinnerCoordinator } from './navigation-spinner-coordinator.service';

@Component({ template: 'home', standalone: true })
class HomeStubComponent {}

@Component({ template: 'legal', standalone: true })
class LegalStubComponent {}

describe('NavigationSpinnerCoordinator', () => {
  const URL_HOME = '/home';
  const URL_LEGAL = '/imprint';
  const NAVIGATION_ID = 1;

  let indicator: ILoadingIndicator;
  let events: Subject<RouterEvent>;

  const setupWithFakeRouter = (): NavigationSpinnerCoordinator => {
    events = new Subject<RouterEvent>();
    indicator = { showProgressSpinner: false, interceptorSuppressed: false };
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { events } },
        { provide: LOADING_INDICATOR_TOKEN, useValue: indicator },
      ],
    });
    const coordinator = TestBed.inject(NavigationSpinnerCoordinator);
    coordinator.start();
    return coordinator;
  };

  describe('with a fake router event stream', () => {
    it('shows the spinner when a navigation starts', () => {
      // Arrange
      setupWithFakeRouter();

      // Act
      events.next(new NavigationStart(NAVIGATION_ID, URL_LEGAL));

      // Assert
      expect(indicator.showProgressSpinner).toBe(true);
    });

    it('hides the spinner when the navigation ends', () => {
      // Arrange
      setupWithFakeRouter();
      events.next(new NavigationStart(NAVIGATION_ID, URL_LEGAL));

      // Act
      events.next(new NavigationEnd(NAVIGATION_ID, URL_LEGAL, URL_LEGAL));

      // Assert
      expect(indicator.showProgressSpinner).toBe(false);
    });

    it('hides the spinner when the navigation is cancelled', () => {
      // Arrange
      setupWithFakeRouter();
      events.next(new NavigationStart(NAVIGATION_ID, URL_LEGAL));

      // Act
      events.next(new NavigationCancel(NAVIGATION_ID, URL_LEGAL, '', NavigationCancellationCode.GuardRejected));

      // Assert
      expect(indicator.showProgressSpinner).toBe(false);
    });

    it('hides the spinner when the navigation fails', () => {
      // Arrange
      setupWithFakeRouter();
      events.next(new NavigationStart(NAVIGATION_ID, URL_LEGAL));

      // Act
      events.next(new NavigationError(NAVIGATION_ID, URL_LEGAL, new Error('failed')));

      // Assert
      expect(indicator.showProgressSpinner).toBe(false);
    });

    it('hides the spinner when the navigation is skipped', () => {
      // Arrange
      setupWithFakeRouter();
      indicator.showProgressSpinner = true;

      // Act
      events.next(new NavigationSkipped(NAVIGATION_ID, URL_LEGAL, '', NavigationSkippedCode.IgnoredSameUrlNavigation));

      // Assert
      expect(indicator.showProgressSpinner).toBe(false);
    });

    it('subscribes only once when started repeatedly', () => {
      // Arrange
      const coordinator = setupWithFakeRouter();
      const setter = vi.fn();
      Object.defineProperty(indicator, 'showProgressSpinner', { set: setter, get: () => false });

      // Act
      coordinator.start();
      coordinator.start();
      events.next(new NavigationStart(NAVIGATION_ID, URL_LEGAL));

      // Assert
      expect(setter).toHaveBeenCalledTimes(1);
    });
  });

  describe('with the real router', () => {
    beforeEach(() => {
      indicator = { showProgressSpinner: false, interceptorSuppressed: false };
      TestBed.configureTestingModule({
        providers: [
          provideRouter([
            { path: 'home', component: HomeStubComponent },
            { path: 'imprint', component: LegalStubComponent },
            { path: 'blocked', component: LegalStubComponent, canActivate: [() => false] },
          ]),
          { provide: LOADING_INDICATOR_TOKEN, useValue: indicator },
        ],
      });
      TestBed.inject(NavigationSpinnerCoordinator).start();
    });

    it('leaves the spinner off after a navigation completes', async () => {
      // Arrange
      const harness = await RouterTestingHarness.create();

      // Act
      await harness.navigateByUrl(URL_HOME);
      await harness.navigateByUrl(URL_LEGAL);

      // Assert
      expect(indicator.showProgressSpinner).toBe(false);
    });

    it('leaves the spinner off after a guard rejects the navigation', async () => {
      // Arrange
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl(URL_HOME);

      // Act
      await harness.navigateByUrl('/blocked');

      // Assert
      expect(indicator.showProgressSpinner).toBe(false);
    });

    it('leaves the spinner off after a navigation to an unknown route fails', async () => {
      // Arrange
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl(URL_HOME);

      // Act
      await harness.navigateByUrl('/does-not-exist').catch(() => undefined);

      // Assert
      expect(indicator.showProgressSpinner).toBe(false);
    });

    it('keeps the spinner on while the navigation is pending', async () => {
      // Arrange
      const router = TestBed.inject(Router);
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl(URL_HOME);
      let seenDuringNavigation = false;
      router.events.subscribe((event) => {
        if (event instanceof NavigationStart) {
          seenDuringNavigation = indicator.showProgressSpinner;
        }
      });

      // Act
      await harness.navigateByUrl(URL_LEGAL);

      // Assert
      expect(seenDuringNavigation).toBe(true);
    });
  });
});
