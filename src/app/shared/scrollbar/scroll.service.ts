import { Injectable } from '@angular/core';

@Injectable()
export class ScrollService {
  public maxCols = 0;
  public maxRows = 0;

  private _horizontalScrollDelta = 0;
  private _verticalScrollDelta = 0;
  private _verticalScrollPosition = 0;
  private _horizontalScrollPosition = 0;
  private _visibleCols = 0;
  private _visibleRows = 0;

  set verticalScrollPosition(value: number) {
    const oldValue = this._verticalScrollPosition;
    this._verticalScrollPosition = Math.max(0, Math.min(value, this.maxRows));
    this._verticalScrollDelta += this._verticalScrollPosition - oldValue;
  }

  get verticalScrollPosition() {
    return this._verticalScrollPosition;
  }

  set horizontalScrollPosition(value: number) {
    if (this._horizontalScrollPosition === value) return;

    const oldValue = this._horizontalScrollPosition;
    this._horizontalScrollPosition = Math.max(0, Math.min(value, this.maxCols));

    this._horizontalScrollDelta += this._horizontalScrollPosition - oldValue;
  }

  get horizontalScrollPosition() {
    return this._horizontalScrollPosition;
  }

  updateScrollPosition(
    horizontal?: number,
    vertical?: number
  ): {
    horizontalDelta: number;
    verticalDelta: number;
  } {
    const oldH = this._horizontalScrollPosition;
    const oldV = this._verticalScrollPosition;

    if (horizontal !== undefined) {
      this._horizontalScrollPosition = Math.max(
        0,
        Math.min(horizontal, this.maxCols)
      );
    }
    if (vertical !== undefined) {
      this._verticalScrollPosition = Math.max(
        0,
        Math.min(vertical, this.maxRows)
      );
    }

    const deltaH = this._horizontalScrollPosition - oldH;
    const deltaV = this._verticalScrollPosition - oldV;

    this._horizontalScrollDelta += deltaH;
    this._verticalScrollDelta += deltaV;

    return {
      horizontalDelta: deltaH,
      verticalDelta: deltaV,
    };
  }

  public resetScrollPosition(): void {
    this._horizontalScrollPosition = 0;
    this._verticalScrollPosition = 0;
    this._horizontalScrollDelta = 0;
    this._verticalScrollDelta = 0;
  }

  public resetDeltas(): void {
    this._horizontalScrollDelta = 0;
    this._verticalScrollDelta = 0;
  }

  get horizontalScrollDelta(): number {
    return this._horizontalScrollDelta;
  }

  get verticalScrollDelta(): number {
    return this._verticalScrollDelta;
  }

  getScrollState(): ScrollState {
    return {
      position: {
        horizontal: this._horizontalScrollPosition,
        vertical: this._verticalScrollPosition,
      },
      delta: {
        horizontal: this._horizontalScrollDelta,
        vertical: this._verticalScrollDelta,
      },
      max: {
        cols: this.maxCols,
        rows: this.maxRows,
      },
      visible: {
        cols: this._visibleCols,
        rows: this._visibleRows,
      },
    };
  }

  get visibleCols(): number {
    return this._visibleCols;
  }

  set visibleCols(value: number) {
    this._visibleCols = value;
  }

  get visibleRows(): number {
    return this._visibleRows;
  }

  set visibleRows(value: number) {
    this._visibleRows = value;
  }
}

interface ScrollState {
  position: { horizontal: number; vertical: number };
  delta: { horizontal: number; vertical: number };
  max: { cols: number; rows: number };
  visible: { cols: number; rows: number };
}
