// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Open state of the collapsed toolbar overlay below the toolbar breakpoint: toggled by the hamburger button,
 * closed by escape and by any click outside the tools and the toggle.
 * @param event - Document click whose composed path decides whether it happened inside the overlay
 */
import { Injectable, signal } from '@angular/core';
import { SCHEDULE_HEADER_TOOLS_SELECTOR, SCHEDULE_HEADER_TOOLS_TOGGLE_SELECTOR } from '../schedule-header.constants';

@Injectable()
export class ScheduleHeaderToolsOverlayService {
  readonly toolsOpen = signal(false);

  toggleTools(): void {
    this.toolsOpen.update((value) => !value);
  }

  onDocumentClickCloseTools(event: MouseEvent): void {
    if (!this.toolsOpen()) {
      return;
    }
    const insideToolsOrToggle = event.composedPath().some(
      (node) =>
        node instanceof HTMLElement &&
        (node.matches(SCHEDULE_HEADER_TOOLS_SELECTOR) || node.matches(SCHEDULE_HEADER_TOOLS_TOGGLE_SELECTOR)),
    );
    if (!insideToolsOrToggle) {
      this.toolsOpen.set(false);
    }
  }

  onEscapeCloseTools(): void {
    this.toolsOpen.set(false);
  }
}
