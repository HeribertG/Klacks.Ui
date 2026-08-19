// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Remembers that the backend answered at least once in this browser tab.
 *
 * sessionStorage is used instead of localStorage because the mark has to survive
 * a reload — without it every F5 during an outage looks like a fresh application
 * start and the user waits out the full startup grace period in front of a dead
 * page — while a newly opened tab must not inherit it, because there the long
 * startup grace period is still the correct behaviour.
 *
 * Access is synchronous, unlike the AbstractStorageService family, because the
 * mark is read while BackendAvailabilityService is constructed and has to be
 * correct before the first grace period is calculated. A storage that throws
 * (private modes, disabled storage) degrades to "never answered".
 */

import { Injectable } from '@angular/core';

const BACKEND_ANSWERED_KEY = 'klacks.backend-has-answered';
const BACKEND_ANSWERED_VALUE = 'true';

@Injectable({
  providedIn: 'root',
})
export class BackendAnsweredStorageService {
  isMarked(): boolean {
    try {
      return sessionStorage.getItem(BACKEND_ANSWERED_KEY) === BACKEND_ANSWERED_VALUE;
    } catch {
      return false;
    }
  }

  mark(): void {
    try {
      sessionStorage.setItem(BACKEND_ANSWERED_KEY, BACKEND_ANSWERED_VALUE);
    } catch {
      return;
    }
  }
}
