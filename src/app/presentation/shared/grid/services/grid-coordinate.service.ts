// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Central coordinate transformation service for RTL-aware grid rendering.
 * Single source of truth for all column-to-pixel and pixel-to-column conversions.
 * In RTL mode, columns are visually reversed: day 1 appears on the right, day N on the left.
 * Consumers call update() once per draw cycle, then use parameter-free coordinate methods.
 */
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class GridCoordinateService {
  private _cellWidth = 0;
  private _renderCanvasWidth = 0;
  private _viewportWidth = 0;
  private _totalColumns = 0;
  private _scrollPos = 0;

  get isRtl(): boolean {
    return document.documentElement.dir === 'rtl';
  }

  update(cellWidth: number, renderCanvasWidth: number, viewportWidth: number, totalColumns: number, scrollPos: number): void {
    this._cellWidth = cellWidth;
    this._renderCanvasWidth = renderCanvasWidth;
    this._viewportWidth = viewportWidth;
    this._totalColumns = totalColumns;
    this._scrollPos = scrollPos;
  }

  get firstVisibleCol(): number {
    return this._scrollPos;
  }

  cellX(visibleCol: number): number {
    if (this.isRtl) {
      return this._viewportWidth - (visibleCol + 1) * this._cellWidth;
    }
    return visibleCol * this._cellWidth;
  }

  cellXWithSpan(visibleCol: number, span: number): number {
    if (this.isRtl) {
      return this._viewportWidth - (visibleCol + span) * this._cellWidth;
    }
    return visibleCol * this._cellWidth;
  }

  headerCellX(logicalCol: number): number {
    if (this.isRtl) {
      return (this._totalColumns - 1 - logicalCol) * this._cellWidth;
    }
    return logicalCol * this._cellWidth;
  }

  headerAlignment(): number {
    if (this.isRtl) {
      return this._viewportWidth - (this._totalColumns - this.firstVisibleCol) * this._cellWidth;
    }
    return -this.firstVisibleCol * this._cellWidth;
  }

  visibleColFromMouseX(mouseX: number): number {
    if (this.isRtl) {
      return Math.floor((this._viewportWidth - mouseX) / this._cellWidth);
    }
    return Math.floor(mouseX / this._cellWidth);
  }

  fillHandleX(cellXPos: number): number {
    if (this.isRtl) {
      return cellXPos;
    }
    return cellXPos + this._cellWidth;
  }
}
