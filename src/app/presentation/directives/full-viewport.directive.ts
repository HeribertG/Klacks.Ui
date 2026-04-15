// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Marks a host component as a full-viewport page (no `.container` 1445px limit).
 * Toggles `body.full-viewport` while the component is alive so global overlays
 * (e.g. voice-shell) can re-anchor themselves to the viewport edge instead of
 * the standard container's right edge.
 */
import { Directive, OnDestroy, OnInit } from '@angular/core';

const FULL_VIEWPORT_CLASS = 'full-viewport';

@Directive({
  selector: '[appFullViewport]',
  standalone: true,
})
export class FullViewportDirective implements OnInit, OnDestroy {
  public ngOnInit(): void {
    document.body.classList.add(FULL_VIEWPORT_CLASS);
  }

  public ngOnDestroy(): void {
    document.body.classList.remove(FULL_VIEWPORT_CLASS);
  }
}
