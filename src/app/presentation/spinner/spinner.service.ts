// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, signal, computed } from '@angular/core';
import { ILoadingIndicator } from 'src/app/domain/interfaces/loading-indicator.interface';

const SPINNER_SHOW_DELAY_MS = 200;

@Injectable({
  providedIn: 'root',
})
export class SpinnerService implements ILoadingIndicator {
  private _manualShow = signal(false);
  private _interceptorShow = signal(false);
  private activeRequests = 0;
  private showTimer: ReturnType<typeof setTimeout> | null = null;

  readonly showSpinner = computed(() => this._interceptorShow() || this._manualShow());

  get showProgressSpinner(): boolean {
    return this._manualShow();
  }

  set showProgressSpinner(value: boolean) {
    this._manualShow.set(value);
  }

  incrementRequests(): void {
    this.activeRequests++;
    if (this.activeRequests === 1 && !this.showTimer) {
      this.showTimer = setTimeout(() => {
        if (this.activeRequests > 0) {
          this._interceptorShow.set(true);
        }
        this.showTimer = null;
      }, SPINNER_SHOW_DELAY_MS);
    }
  }

  decrementRequests(): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    if (this.activeRequests === 0) {
      if (this.showTimer) {
        clearTimeout(this.showTimer);
        this.showTimer = null;
      }
      this._interceptorShow.set(false);
    }
  }
}
