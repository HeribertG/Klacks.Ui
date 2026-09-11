// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Performs the full page load behind a reload decision. Kept separate so the reload coordinator can
 * be tested without reloading the test runner.
 * @param url - App-relative or absolute URL that is loaded instead of the current one
 */
import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class PageReloaderService {
  private readonly document = inject(DOCUMENT);

  reload(): void {
    this.document.location.reload();
  }

  navigateTo(url: string): void {
    this.document.location.assign(url);
  }
}
