// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Central coordinate transformation service for RTL-aware grid rendering.
 * In RTL mode, columns are drawn in normal (LTR) order within canvases.
 * The RTL effect is achieved by adjusting scroll offsets so that the last
 * columns are visible first, and mouse coordinates are mirrored.
 */
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class GridCoordinateService {
  get isRtl(): boolean {
    return document.documentElement.dir === 'rtl';
  }

  cellX(visibleCol: number, cellWidth: number, _canvasWidth: number): number {
    return visibleCol * cellWidth;
  }

  cellXWithSpan(visibleCol: number, _span: number, cellWidth: number, _canvasWidth: number): number {
    return visibleCol * cellWidth;
  }

  headerAlignment(scrollPos: number, cellWidth: number, headerCanvasWidth: number, viewportWidth: number): number {
    if (this.isRtl) {
      return -(headerCanvasWidth - viewportWidth - scrollPos * cellWidth);
    }
    return -scrollPos * cellWidth;
  }

  colFromMouseX(mouseX: number, cellWidth: number, _viewportWidth: number): number {
    return Math.floor(mouseX / cellWidth);
  }
}
