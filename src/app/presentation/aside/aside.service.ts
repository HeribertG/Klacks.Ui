// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service zur Steuerung der Aside-Sichtbarkeit.
 * @param isVisible - Ob die Aside-Leiste sichtbar ist
 * @param openedWithContext - Ob die Aside mit Kontext (z.B. Fehler-Validierung) geöffnet wurde
 */
import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AsideService {
  public isVisible = signal<boolean>(false);
  public openedWithContext = signal<boolean>(false);

  show(withContext: boolean = false): void {
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
}
