// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, signal } from '@angular/core';
import { ILoadingIndicator } from 'src/app/domain/interfaces/loading-indicator.interface';

const SPINNER_DELAY_MS = 200;

@Injectable({
  providedIn: 'root',
})
export class SpinnerService implements ILoadingIndicator {
  private _showProgressSpinner = signal(false);
  private activeRequests = 0;
  private delayTimer: ReturnType<typeof setTimeout> | null = null;

  readonly showSpinner = this._showProgressSpinner.asReadonly();

  get showProgressSpinner(): boolean {
    return this._showProgressSpinner();
  }

  set showProgressSpinner(value: boolean) {
    this._showProgressSpinner.set(value);
  }

  incrementRequests(): void {
    this.activeRequests++;
    if (this.activeRequests === 1 && !this.delayTimer) {
      this.delayTimer = setTimeout(() => {
        if (this.activeRequests > 0) {
          this._showProgressSpinner.set(true);
        }
        this.delayTimer = null;
      }, SPINNER_DELAY_MS);
    }
  }

  decrementRequests(): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    if (this.activeRequests === 0) {
      if (this.delayTimer) {
        clearTimeout(this.delayTimer);
        this.delayTimer = null;
      }
      this._showProgressSpinner.set(false);
    }
  }
}
