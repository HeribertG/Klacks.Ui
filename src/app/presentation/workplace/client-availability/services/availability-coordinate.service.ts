// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Central coordinate transformation service for RTL-aware client-availability rendering.
 * Single source of truth for column-to-pixel, scroll offsets, and mouse hit-testing.
 * In RTL mode, day 1 appears on the right.
 * Consumers call update() once per draw cycle, then use parameter-free methods.
 */
import { Injectable } from '@angular/core';

@Injectable()
export class AvailabilityCoordinateService {
  private _cellWidth = 0;
  private _viewportWidth = 0;
  private _totalColumns = 0;

  get isRtl(): boolean {
    return document.documentElement.dir === 'rtl';
  }

  update(cellWidth: number, viewportWidth: number, totalColumns: number): void {
    this._cellWidth = cellWidth;
    this._viewportWidth = viewportWidth;
    this._totalColumns = totalColumns;
  }

  cellX(visibleCol: number): number {
    if (this.isRtl) {
      return this._viewportWidth - (visibleCol + 1) * this._cellWidth;
    }
    return visibleCol * this._cellWidth;
  }

  spanX(visibleCol: number, spanCols: number): number {
    if (this.isRtl) {
      return this._viewportWidth - (visibleCol + spanCols) * this._cellWidth;
    }
    return visibleCol * this._cellWidth;
  }

  spanWidth(spanCols: number): number {
    return spanCols * this._cellWidth;
  }

  headerScrollOffset(scrollX: number): number {
    if (this.isRtl) {
      const totalWidth = this._totalColumns * this._cellWidth;
      return this._viewportWidth - totalWidth + scrollX;
    }
    return -scrollX;
  }

  mouseToAbsoluteX(mouseX: number, scrollX: number): number {
    if (this.isRtl) {
      const totalWidth = this._totalColumns * this._cellWidth;
      return totalWidth - (mouseX + scrollX) - 1;
    }
    return mouseX + scrollX;
  }

  mouseToColumn(mouseX: number, scrollX: number): number {
    if (this.isRtl) {
      return Math.floor((this._viewportWidth - mouseX) / this._cellWidth) + Math.floor(scrollX / this._cellWidth);
    }
    return Math.floor((mouseX + scrollX) / this._cellWidth);
  }
}
