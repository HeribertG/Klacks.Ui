// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Holds the two states of the transcript card: whether it is on screen at all, and whether it is
 * expanded. The gesture that puts it on screen (right-click / long-press) lives on the voice bubble
 * in another lane of the overlay rail, so neither component can own the state - it has to sit
 * between them. Opening always shows the card expanded; closing it discards that.
 */

import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TranscriptOverlayService {
  private readonly open = signal<boolean>(false);
  private readonly expanded = signal<boolean>(true);

  readonly isOpen = this.open.asReadonly();
  readonly isExpanded = this.expanded.asReadonly();

  show(): void {
    this.expanded.set(true);
    this.open.set(true);
  }

  close(): void {
    this.open.set(false);
  }

  toggleExpanded(): void {
    this.expanded.update((value) => !value);
  }
}
