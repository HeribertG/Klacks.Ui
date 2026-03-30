// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Central coordinate transformation service for RTL-aware Gantt rendering.
 * Single source of truth for column-to-pixel, scroll offsets, and mouse hit-testing.
 * In RTL mode, day 1 appears on the right, day 365 on the left.
 * Consumers call update() once per draw cycle, then use parameter-free methods.
 */
import { Injectable } from '@angular/core';

@Injectable()
export class GanttCoordinateService {
  private _cellWidth = 0;
  private _viewportWidth = 0;
  private _totalWidth = 0;
  private _scrollPos = 0;

  get isRtl(): boolean {
    return document.documentElement.dir === 'rtl';
  }

  update(cellWidth: number, viewportWidth: number, totalDays: number, scrollPos: number): void {
    this._cellWidth = cellWidth;
    this._viewportWidth = viewportWidth;
    this._totalWidth = totalDays * cellWidth;
    this._scrollPos = scrollPos;
  }

  get scrollDx(): number {
    if (this.isRtl) {
      return this._viewportWidth - this._totalWidth + this._scrollPos * this._cellWidth;
    }
    return -this._scrollPos * this._cellWidth;
  }

  columnX(col: number): number {
    if (this.isRtl) {
      return this._totalWidth - (col + 1) * this._cellWidth;
    }
    return col * this._cellWidth;
  }

  columnRight(col: number): number {
    return this.columnX(col) + this._cellWidth;
  }

  spanLeft(startCol: number, endCol: number): number {
    if (this.isRtl) {
      return this.columnX(endCol);
    }
    return this.columnX(startCol);
  }

  spanRight(startCol: number, endCol: number): number {
    if (this.isRtl) {
      return this.columnRight(startCol);
    }
    return this.columnRight(endCol);
  }

  mouseToColumn(mouseX: number): number {
    if (this.isRtl) {
      return Math.floor((this._viewportWidth - mouseX) / this._cellWidth) + this._scrollPos;
    }
    return Math.floor(mouseX / this._cellWidth) + this._scrollPos;
  }

  pixelDeltaToColumnDelta(pixelDelta: number): number {
    if (this.isRtl) {
      return Math.round(-pixelDelta / this._cellWidth);
    }
    return Math.round(pixelDelta / this._cellWidth);
  }
}
