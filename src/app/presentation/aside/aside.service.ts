// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for controlling aside panel visibility.
 * @param isVisible - Whether the aside panel is visible
 * @param openedWithContext - Whether the aside was opened with context (e.g. error validation)
 */
import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AsideService {
  public isVisible = signal<boolean>(false);
  public openedWithContext = signal<boolean>(false);

  private readonly clearChatRequested = new Subject<void>();
  readonly clearChatRequested$ = this.clearChatRequested.asObservable();

  show(withContext = false): void {
    this.openedWithContext.set(withContext);
    this.isVisible.set(true);
  }

  hide(): void {
    this.openedWithContext.set(false);
    this.isVisible.set(false);
  }

  toggle(): void {
    const newVisible = !this.isVisible();
    if (!newVisible) {
      this.openedWithContext.set(false);
    }
    this.isVisible.set(newVisible);
  }

  requestClearChat(): void {
    this.clearChatRequested.next();
  }
}
